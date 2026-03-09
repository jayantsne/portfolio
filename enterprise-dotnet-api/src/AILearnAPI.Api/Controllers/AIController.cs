using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;
using System.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;
using AILearnAPI.Domain.Constants;

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
    private readonly IOpenAIStreamingService _openAIStreaming;
    private readonly ILlmProviderService _llmProviderSvc;
    private readonly IUserConfigService _userConfigSvc;

    public AIController(
        IOllamaService ollamaService,
        ILogger<AIController> logger,
        IMemoryCache cache,
        IMasterConfigService masterConfig,
        IDeviceDetectionService deviceDetection,
        IOpenAIStreamingService openAIStreaming,
        ILlmProviderService llmProviderSvc,
        IUserConfigService userConfigSvc)
    {
        _ollamaService    = ollamaService;
        _logger           = logger;
        _cache            = cache;
        _masterConfig     = masterConfig;
        _deviceDetection  = deviceDetection;
        _openAIStreaming   = openAIStreaming;
        _llmProviderSvc   = llmProviderSvc;
        _userConfigSvc    = userConfigSvc;
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
        //var prompt = BuildClaudeQualityPrompt(request.Question, cfg);


        var ua = Request.Headers["User-Agent"].ToString();
        var device = _deviceDetection.Detect(ua);

        var prompt = request.RawMode
            ? request.Question   // raw verbatim prompt (e.g. note formatter)
            : device switch
            {
                DeviceType.Mobile  => BuildMobileLearningPrompt(request.Question),
                DeviceType.Tablet  => BuildMobileLearningPrompt(request.Question),
                DeviceType.Desktop => BuildClaudeQualityPrompt(request.Question, cfg),
                _                  => BuildClaudeQualityPrompt(request.Question, cfg),
            };

        _logger.LogInformation("⚡ SSE Stream request: '{Q}' model={M}",
            request.Question[..Math.Min(50, request.Question.Length)],
            request.Model ?? "default");

        try
        {
            var streamDeviceLimit = GetDeviceTokenLimitFromConfig(cfg);
            var providerName = (request.Provider ?? "ollama").ToLowerInvariant();

            IAsyncEnumerable<string> tokenStream;

            if (providerName == "openai")
            {
                // ── Route to OpenAI (or any OpenAI-compatible provider) ──────────
                var providers = await _llmProviderSvc.GetAllForAdminAsync();
                var prov = providers.FirstOrDefault(p =>
                    p.ProviderName.Equals("openai", StringComparison.OrdinalIgnoreCase) && p.Enabled);

                if (prov == null)
                {
                    await Response.WriteAsync("data: {\"error\":\"OpenAI provider is not configured or disabled.\",\"done\":true}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    return;
                }

                // Decrypt the API key (admin resolution — key is stored encrypted in DB)
                //var apiKey = await _llmProviderSvc.ResolveApiKeyAsync(prov.ProviderName, "system", UserRoles.Admin);

                var apiKey =  Environment.GetEnvironmentVariable("OPENAI_API_KEY", EnvironmentVariableTarget.User);
                if (string.IsNullOrEmpty(apiKey))
                {
                    await Response.WriteAsync("data: {\"error\":\"OpenAI API key could not be resolved.\",\"done\":true}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    return;
                }

                _logger.LogInformation("⚡ SSE Stream → OpenAI model={M}", prov.Model);
                tokenStream = _openAIStreaming.StreamAsync(
                    apiKey,
                    prov.BaseUrl,
                    request.Model ?? prov.Model,
                    prompt,
                    streamDeviceLimit,
                    cancellationToken);
            }
            else if (providerName.StartsWith("custom:"))
            {
                // ── Route to user-custom provider ────────────────────────────────
                var customId = providerName["custom:".Length..];
                var userId   = ExtractUserIdFromBearer();

                if (string.IsNullOrEmpty(userId))
                {
                    await Response.WriteAsync("data: {\"error\":\"Authentication required for custom providers.\",\"done\":true}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    return;
                }

                var info = await _userConfigSvc.GetCustomProviderStreamInfoAsync(userId, customId);
                if (info == null)
                {
                    await Response.WriteAsync("data: {\"error\":\"Custom provider not found.\",\"done\":true}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    return;
                }

                _logger.LogInformation("⚡ SSE Stream → Custom provider id={Id} model={M}", customId, info.Model);
                tokenStream = _openAIStreaming.StreamAsync(
                    info.ApiKey,
                    info.BaseUrl,
                    request.Model ?? info.Model,
                    prompt,
                    streamDeviceLimit,
                    cancellationToken);
            }
            else
            {
                // ── Default: Ollama ──────────────────────────────────────────────
                tokenStream = _ollamaService.StreamAsync(
                    prompt,
                    request.Model ?? cfg.modelOllamaStream,
                    temperature: request.Temperature ?? (float)cfg.defaultTemperature,
                    maxTokens: streamDeviceLimit,
                    cancellationToken: cancellationToken);
            }

            var tokensWritten = 0;

            await foreach (var token in tokenStream)
            {
                if (cancellationToken.IsCancellationRequested) break;

                // If the service yielded an [ERROR] sentinel ─────────────────
                if (token.StartsWith("[ERROR]"))
                {
                    var errMsg = token["[ERROR]".Length..].Trim();

                    // If no tokens were emitted yet and we're not already on Ollama,
                    // silently retry with Ollama rather than surfacing the error.
                    if (tokensWritten == 0 && providerName != "ollama")
                    {
                        _logger.LogWarning(
                            "⚡ Provider '{P}' failed before first token — falling back to Ollama. Reason: {E}",
                            providerName, errMsg);

                        tokenStream = _ollamaService.StreamAsync(
                            prompt,
                            request.Model ?? cfg.modelOllamaStream,
                            temperature: request.Temperature ?? (float)cfg.defaultTemperature,
                            maxTokens: streamDeviceLimit,
                            cancellationToken: cancellationToken);

                        // Restart the loop over the new stream
                        await foreach (var fallbackToken in tokenStream)
                        {
                            if (cancellationToken.IsCancellationRequested) break;
                            if (fallbackToken.StartsWith("[ERROR]")) break; // give up
                            var fe = System.Text.Json.JsonSerializer.Serialize(fallbackToken);
                            await Response.WriteAsync($"data: {{\"token\":{fe},\"done\":false}}\n\n", cancellationToken);
                            await Response.Body.FlushAsync(cancellationToken);
                            tokensWritten++;
                        }

                        await Response.WriteAsync("data: {\"token\":\"\",\"done\":true}\n\n", cancellationToken);
                        await Response.Body.FlushAsync(cancellationToken);
                        return;
                    }

                    // Already mid-stream or already on Ollama — surface the error
                    var escapedErr = System.Text.Json.JsonSerializer.Serialize(errMsg);
                    await Response.WriteAsync($"data: {{\"error\":{escapedErr},\"done\":true}}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    return;
                }

                // Normal token ────────────────────────────────────────────────
                var escaped = System.Text.Json.JsonSerializer.Serialize(token);
                await Response.WriteAsync($"data: {{\"token\":{escaped},\"done\":false}}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
                tokensWritten++;
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
            var cfg = await _masterConfig.GetAsync();
            var tokenLimit = Math.Min(request.MaxTokens ?? cfg.maxTokensSimplified, cfg.maxTokensSimplified);
            var model = request.Model ?? cfg.modelOllamaStream;
            var temp = request.Temperature ?? (float)cfg.defaultTemperature;

            _logger.LogInformation("🎨 Simplified/diagram request — model={Model} tokens={T}", model, tokenLimit);

            var ollamaResponse = await _ollamaService.GenerateAsync(
                request.Prompt, model, temp, tokenLimit, cancellationToken);

            return Ok(new AIExplanationResponse
            {
                Success = true,
                Explanation = ollamaResponse.Response,
                Answer = ollamaResponse.Response,
                RawText = ollamaResponse.Response,
                Text = ollamaResponse.Response,
                Provider = "ollama",
                Model = model,
                TokensUsed = ollamaResponse.Eval_count,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ Ollama unreachable in /simplified");
            return StatusCode(503, new AIExplanationResponse
            {
                Success = false,
                Explanation = ex.StatusCode == System.Net.HttpStatusCode.NotFound
                    ? "Model not loaded on server."
                    : "Cannot reach AI model server.",
                Timestamp = DateTime.UtcNow
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

            var ua = Request.Headers["User-Agent"].ToString();
            var device = _deviceDetection.Detect(ua);

            var limit = device switch
            {
                DeviceType.Mobile => cfg.mobileMaxTokens,
                DeviceType.Tablet => cfg.tabletMaxTokens,
                DeviceType.Desktop => cfg.desktopMaxTokens,
                _ => cfg.desktopMaxTokens
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
        // DB-driven prompt
        if (!string.IsNullOrWhiteSpace(cfg.mainPromptTemplate))
        {
            _logger.LogInformation("📋 Using DB mainPromptTemplate for question prompt");
            return cfg.mainPromptTemplate.Replace("{question}", question);
        }

        var systemRole = !string.IsNullOrWhiteSpace(cfg.defaultSystemPrompt)
            ? cfg.defaultSystemPrompt
            : "You are a senior software engineer who explains concepts clearly and simply.";

        _logger.LogInformation("📋 Using optimized tutor prompt");

        return $@"
{systemRole}

Explain **{question}** for developers.

Use short sections and simple language.

Format:

# {question}

Idea: one clear sentence.

Analogy: simple real-world comparison.

Why: what problem it solves.

How:
1. step
2. step
3. step

Example: short code snippet.";
    }

    private string BuildMobileLearningPrompt(string question)
    {
        return $@"
You are a friendly programming tutor.

Explain ""{question}"" in **two layers** so it works well on mobile devices.

Layer 1 = Quick Answer (very short)  
Layer 2 = Deep Dive (optional detailed explanation)

Rules:
• Keep Quick Answer extremely short
• Use bullet points
• Avoid long paragraphs
• Use simple language

Follow this structure exactly.

---

# 🧠 {question}

## ⚡ Quick Answer

### 🎯 Simple Idea
Explain in **one sentence**.

### ⚙️ How It Works
Explain in **3 short steps**.

1. Step one
2. Step two
3. Step three

### 💻 Tiny Example";
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    /// <summary>
    /// Extracts userId (sub claim) from  Authorization: Bearer {jwt}  header.
    /// Returns null when the header is absent or the token is malformed.
    /// </summary>
    private string? ExtractUserIdFromBearer()
    {
        var auth = Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;

        var raw = auth["Bearer ".Length..].Trim();
        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (!handler.CanReadToken(raw)) return null;
            var jwt = handler.ReadJwtToken(raw);
            return jwt.Subject
                ?? jwt.Claims.FirstOrDefault(c => c.Type is "sub" or "nameid")?.Value;
        }
        catch
        {
            return null;
        }
    }
}
