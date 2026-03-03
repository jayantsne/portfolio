using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;
using System.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;

namespace AILearnAPI.Api.Controllers;

/// <summary>
/// AI Controller for direct Ollama integration with Angular frontend
/// Provides Claude-quality AI explanations via local Ollama server
/// </summary>
[ApiController]
[Route("api/ai")]
[Produces("application/json")]
public class AIController : ControllerBase
{
    private readonly IOllamaService _ollamaService;
    private readonly ILogger<AIController> _logger;
    private readonly IMemoryCache _cache;
    private readonly IMasterConfigService _masterConfig;
    private readonly IDeviceDetectionService _deviceDetection;

    public AIController(
        IOllamaService ollamaService,
        ILogger<AIController> logger,
        IMemoryCache cache,
        IMasterConfigService masterConfig,
        IDeviceDetectionService deviceDetection)
    {
        _ollamaService    = ollamaService;
        _logger           = logger;
        _cache            = cache;
        _masterConfig     = masterConfig;
        _deviceDetection  = deviceDetection;
    }

    /// <summary>
    /// Generate Claude-quality AI explanation via Ollama
    /// Endpoint for Angular frontend: /api/ai/ollama
    /// </summary>
    /// <param name="request">Question and configuration from Angular</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Claude-style structured explanation</returns>
    /// <response code="200">Explanation generated successfully</response>
    /// <response code="400">Invalid request</response>
    /// <response code="408">Request timeout</response>
    /// <response code="503">Ollama service unavailable</response>
    [HttpPost("ollama")]
    [ProducesResponseType(typeof(AIExplanationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status408RequestTimeout)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AIExplanationResponse>> GenerateExplanation(
        [FromBody] AIExplanationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var stopwatch = Stopwatch.StartNew();

            _logger.LogInformation(
                "🚀 Generating Claude-style explanation for: '{Question}' using model: {Model}",
                request.Question?.Substring(0, Math.Min(50, request.Question?.Length ?? 0)),
                request.Model ?? "default");

            // Validate request
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest(new ErrorResponseDto
                {
                    Error = "Invalid request",
                    Details = "Question cannot be empty"
                });
            }

            // Load all AI config from DB once for this request
            var cfg = await _masterConfig.GetAsync();

            // Build prompt using DB-driven template (falls back to built-in if not configured)
            var claudePrompt = BuildClaudeQualityPrompt(request.Question, cfg);

            // Check cache first (responses are deterministic for same question)
            var cacheKey = $"ai_explain_{ComputeHash(request.Question)}";
            if (_cache.TryGetValue(cacheKey, out AIExplanationResponse? cachedResponse))
            {
                _logger.LogInformation("⚡ Cache hit for question: '{Q}'", request.Question[..Math.Min(50, request.Question.Length)]);
                return Ok(cachedResponse);
            }

            // Call Ollama with DB-driven settings (model, temperature, token cap)
            var deviceLimit = GetDeviceTokenLimitFromConfig(cfg);
            var ollamaResponse = await _ollamaService.GenerateAsync(
                claudePrompt,
                request.Model ?? cfg.modelOllamaStream,
                temperature: request.Temperature ?? (float)cfg.defaultTemperature,
                maxTokens: Math.Min(request.MaxTokens ?? deviceLimit, deviceLimit),
                cancellationToken);

            stopwatch.Stop();

            _logger.LogInformation(
                "✅ Generated explanation in {ElapsedMs}ms, tokens: {Tokens}",
                stopwatch.ElapsedMilliseconds,
                ollamaResponse.Eval_count);

            // Return Angular-compatible response
            var response = new AIExplanationResponse
            {
                Success = true,
                Explanation = ollamaResponse.Response,
                Provider = "ollama",
                Model = request.Model ?? ollamaResponse.Model,
                Answer = ollamaResponse.Response, // Backward compatibility
                RawText = ollamaResponse.Response, // Backward compatibility
                Text = ollamaResponse.Response, // Backward compatibility
                TokensUsed = ollamaResponse.Eval_count,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            };

            // Cache response for 60 minutes
            _cache.Set(cacheKey, response, TimeSpan.FromMinutes(60));

            return Ok(response);
        }
        catch (TimeoutException ex)
        {
            _logger.LogError(ex, "⏰ Timeout generating explanation");
            return StatusCode(StatusCodes.Status408RequestTimeout, new ErrorResponseDto
            {
                Error = "Request timeout",
                Details = "AI took too long to respond. Try a simpler question or increase timeout."
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "🔌 Ollama service connection failed");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto
            {
                Error = "Service unavailable",
                Details = "Unable to connect to Ollama. Ensure Ollama is running on localhost:11434"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected error generating explanation");
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseDto
            {
                Error = "Internal server error",
                Details = ex.Message
            });
        }
    }

    /// <summary>
    /// Stream AI explanation token-by-token via Server-Sent Events (SSE)
    /// Frontend consumes via fetch + ReadableStream for instant first-token latency
    /// Each event: data: {"token":"...","done":false}
    /// Final event: data: {"token":"","done":true}
    /// </summary>
    [HttpPost("stream")]
    public async Task StreamExplanation(
        [FromBody] AIExplanationRequest request,
        CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers.Append("Cache-Control", "no-cache, no-store");
        Response.Headers.Append("X-Accel-Buffering", "no"); // Disable nginx buffering
        Response.Headers.Append("Connection", "keep-alive");

        if (string.IsNullOrWhiteSpace(request.Question))
        {
            await Response.WriteAsync("data: {\"error\":\"Question is required\",\"done\":true}\n\n", cancellationToken);
            return;
        }

        // Pick model: default qwen2.5:3b (fast tech Q&A), backup llama3.2:3b (tutor style)
        // Load all AI config from DB once for this streaming request
        var cfg = await _masterConfig.GetAsync();
        var prompt = BuildClaudeQualityPrompt(request.Question, cfg);

        _logger.LogInformation("⚡ SSE Stream request: '{Q}' model={M}",
            request.Question[..Math.Min(50, request.Question.Length)],
            request.Model ?? "default");

        try
        {
            var streamDeviceLimit = GetDeviceTokenLimitFromConfig(cfg);
            await foreach (var token in _ollamaService.StreamAsync(
                prompt,
                request.Model ?? cfg.modelOllamaStream,
                temperature: request.Temperature ?? (float)cfg.defaultTemperature,
                maxTokens: Math.Min(request.MaxTokens ?? streamDeviceLimit, streamDeviceLimit),
                cancellationToken: cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested) break;

                // Escape for JSON
                var escaped = System.Text.Json.JsonSerializer.Serialize(token);
                await Response.WriteAsync($"data: {{\"token\":{escaped},\"done\":false}}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            await Response.WriteAsync("data: {\"token\":\"\",\"done\":true}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("⚡ Stream cancelled by client");
        }
        catch (HttpRequestException ex)
        {
            // Ollama not running, wrong model, or unreachable — write SSE error so frontend shows user message
            _logger.LogError(ex, "🔌 Ollama connection failed during stream (HTTP {Status})", (int?)ex.StatusCode);
            var msg = ex.StatusCode == System.Net.HttpStatusCode.NotFound
                ? "The AI model is not loaded on the server. Please try again later."
                : "Cannot reach the AI model server. Please check back in a moment.";
            var errJson = System.Text.Json.JsonSerializer.Serialize(msg);
            await Response.WriteAsync($"data: {{\"error\":{errJson},\"done\":true}}\n\n");
            await Response.Body.FlushAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Streaming error");
            var errJson = System.Text.Json.JsonSerializer.Serialize(ex.Message);
            await Response.WriteAsync($"data: {{\"error\":{errJson},\"done\":true}}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Get available Ollama models on the server
    /// </summary>
    /// <returns>List of available models</returns>
    [HttpGet("ollama/models")]
    [ProducesResponseType(typeof(OllamaModelsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<OllamaModelsResponse>> GetModels()
    {
        try
        {
            var models = await _ollamaService.GetAvailableModelsAsync();
            return Ok(new OllamaModelsResponse
            {
                Success = true,
                Models = models,
                Count = models.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Ollama models");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto
            {
                Error = "Failed to fetch models",
                Details = ex.Message
            });
        }
    }

    /// <summary>
    /// Health check for Ollama service
    /// </summary>
    /// <returns>Ollama service status</returns>
    [HttpGet("ollama/health")]
    [ProducesResponseType(typeof(OllamaHealthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<OllamaHealthResponse>> HealthCheck()
    {
        try
        {
            var isHealthy = await _ollamaService.HealthCheckAsync();
            return Ok(new OllamaHealthResponse
            {
                Healthy = isHealthy,
                Message = isHealthy ? "Ollama is running" : "Ollama is not responding",
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Ok(new OllamaHealthResponse
            {
                Healthy = false,
                Message = $"Ollama health check failed: {ex.Message}",
                Timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Visual-diagram / simplified explanation endpoint.
    /// Frontend calls POST /api/ai/simplified with { prompt } — the prompt is the full
    /// pre-built string from the Angular service (includes diagram instructions + topic).
    /// Returns { success, explanation } matching the Cloudflare Worker contract.
    /// </summary>
    [HttpPost("simplified")]
    [ProducesResponseType(typeof(AIExplanationResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AIExplanationResponse>> GenerateSimplified(
        [FromBody] AiSimplifiedRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new ErrorResponseDto { Error = "Prompt is required", Details = "prompt field cannot be empty" });

        try
        {
            var cfg        = await _masterConfig.GetAsync();
            var tokenLimit = Math.Min(request.MaxTokens ?? cfg.maxTokensSimplified, cfg.maxTokensSimplified);
            var model      = request.Model ?? cfg.modelOllamaStream;
            var temp       = request.Temperature ?? (float)cfg.defaultTemperature;

            _logger.LogInformation("🎨 Simplified/diagram request — model={Model} tokens={T}", model, tokenLimit);

            var ollamaResponse = await _ollamaService.GenerateAsync(
                request.Prompt, model, temp, tokenLimit, cancellationToken);

            return Ok(new AIExplanationResponse
            {
                Success     = true,
                Explanation = ollamaResponse.Response,
                Answer      = ollamaResponse.Response,
                RawText     = ollamaResponse.Response,
                Text        = ollamaResponse.Response,
                Provider    = "ollama",
                Model       = model,
                TokensUsed  = ollamaResponse.Eval_count,
                Timestamp   = DateTime.UtcNow
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ Ollama unreachable in /simplified");
            return StatusCode(503, new AIExplanationResponse
            {
                Success     = false,
                Explanation = ex.StatusCode == System.Net.HttpStatusCode.NotFound
                    ? "Model not loaded on server."
                    : "Cannot reach AI model server.",
                Timestamp   = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Simplified endpoint error");
            return StatusCode(500, new AIExplanationResponse { Success = false, Explanation = ex.Message, Timestamp = DateTime.UtcNow });
        }
    }

    // SHA256 hash of question for cache key (avoids key length/character issues)
    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input.ToLowerInvariant().Trim()));
        return Convert.ToHexString(bytes)[..16];
    }

    // ── Device-based token limit ─────────────────────────────────────────────

    /// <summary>
    /// Synchronous helper — classifies device from User-Agent and returns the matching
    /// token cap from an already-fetched MasterConfigDto. No extra DB round-trip.
    /// </summary>
    private int GetDeviceTokenLimitFromConfig(MasterConfigDto cfg)
    {
        const int FallbackDesktop = 1000;
        try
        {
            if (!cfg.deviceTokenLimitsEnabled)
                return cfg.desktopMaxTokens > 0 ? cfg.desktopMaxTokens : FallbackDesktop;

            var ua     = Request.Headers["User-Agent"].ToString();
            var device = _deviceDetection.Detect(ua);

            var limit = device switch
            {
                DeviceType.Mobile  => cfg.mobileMaxTokens,
                DeviceType.Tablet  => cfg.tabletMaxTokens,
                DeviceType.Desktop => cfg.desktopMaxTokens,
                _                  => cfg.desktopMaxTokens
            };

            _logger.LogInformation(
                "🖥 Device={Device} UA={UA} → token limit={Limit}",
                device, ua[..Math.Min(60, ua.Length)], limit);

            return limit > 0 ? limit : FallbackDesktop;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not determine device token limit; using fallback {N}", FallbackDesktop);
            return FallbackDesktop;
        }
    }

    /// <summary>
    /// Legacy async overload — fetches MasterConfig then delegates to GetDeviceTokenLimitFromConfig.
    /// Use only when a cfg object is not already available in the calling scope.
    /// </summary>
    private async Task<int> GetDeviceTokenLimitAsync()
    {
        const int FallbackDesktop = 1000;
        try
        {
            var cfg = await _masterConfig.GetAsync();
            return GetDeviceTokenLimitFromConfig(cfg);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load MasterConfig for device token limit; using fallback {N}", FallbackDesktop);
            return FallbackDesktop;
        }
    }

    /// <summary>
    /// Build the AI prompt for a question.
    /// Priority: DB <c>mainPromptTemplate</c> (with {question} placeholder)
    ///         → built-in Claude-style teaching template using <c>defaultSystemPrompt</c> as the role.
    /// </summary>
    private string BuildClaudeQualityPrompt(string question, MasterConfigDto cfg)
    {
        // ── DB-driven path ───────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(cfg.mainPromptTemplate))
        {
            _logger.LogInformation("📋 Using DB mainPromptTemplate for question prompt");
            return cfg.mainPromptTemplate.Replace("{question}", question);
        }

        // ── Built-in fallback template ─────────────────────────────────────
        var systemRole = !string.IsNullOrWhiteSpace(cfg.defaultSystemPrompt)
            ? cfg.defaultSystemPrompt
            : "You are an expert programming tutor.";

        _logger.LogInformation("📋 Using built-in fallback template (no mainPromptTemplate in DB)");
        return $@"{systemRole} Explain ""{question}"" with clarity, depth, and wow-factor. Follow this exact structure:

## 🎯 One-Line Essence
[One punchy sentence + real-world analogy. Example: ""Promises are like restaurant buzzers — you get a token and go sit down; the kitchen calls you when your order is ready.""]

## 🧩 The Problem It Solves
[2-3 sentences: what pain existed before, what this concept fixes, concrete developer scenario]

## 🔍 How It Works
[Step-by-step explanation with concrete mental model. Use numbered steps. Explain each step's WHY, not just WHAT.]

## 💻 Code Examples

**Basic:**
```[language]
// Annotated minimal example
```

**Real-World:**
```[language]
// Practical use-case with context comments
```

**Advanced / Edge Case:**
```[language]
// Best-practice or gotcha example
```

## ⚠️ Common Mistakes
- **Mistake 1** — why it's wrong + correct alternative
- **Mistake 2** — why it's wrong + correct alternative
- **Mistake 3** — why it's wrong + correct alternative

## ✅ When To Use vs ❌ When To Avoid
| Use ✅ | Avoid ❌ |
|--------|---------|
| [scenario 1] | [better alternative exists] |
| [scenario 2] | [performance concern] |

## 📊 Comparison Table
| Feature | {question} | Alternative 1 | Alternative 2 |
|---------|-----------|--------------|--------------|
| [aspect] | [value] | [value] | [value] |
| [aspect] | [value] | [value] | [value] |
| [aspect] | [value] | [value] | [value] |

## 💡 Key Insight
> 🎯 **Remember**: [One sentence that crystallizes everything — make it memorable]

## 🚀 What To Learn Next
- [Related concept 1] — [why it matters]
- [Related concept 2] — [why it matters]

## ❓ Follow-Up Questions
1. ""[Question comparing this to a related concept]""
2. ""[Question about a common use-case or pattern]""
3. ""[Question about an advanced or tricky aspect]""

Rules: Use proper markdown formatting. All code blocks must specify the language. Keep code examples concise but complete. Make the analogy creative and memorable. The comparison table MUST always be present.";
    }
}
