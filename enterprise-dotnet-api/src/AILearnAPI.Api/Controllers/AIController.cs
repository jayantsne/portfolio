using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.Models.DTOs;
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

    public AIController(
        IOllamaService ollamaService,
        ILogger<AIController> logger,
        IMemoryCache cache)
    {
        _ollamaService = ollamaService;
        _logger = logger;
        _cache = cache;
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

            // Build Claude-quality prompt
            var claudePrompt = BuildClaudeQualityPrompt(request.Question);

            // Check cache first (responses are deterministic for same question)
            var cacheKey = $"ai_explain_{ComputeHash(request.Question)}";
            if (_cache.TryGetValue(cacheKey, out AIExplanationResponse? cachedResponse))
            {
                _logger.LogInformation("⚡ Cache hit for question: '{Q}'", request.Question[..Math.Min(50, request.Question.Length)]);
                return Ok(cachedResponse);
            }

            // Call Ollama with optimized settings
            // Use smaller default maxTokens for faster responses
            var ollamaResponse = await _ollamaService.GenerateAsync(
                claudePrompt,
                request.Model,
                temperature: request.Temperature ?? 0.7f,
                maxTokens: request.MaxTokens ?? 1500,
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
        var prompt = BuildClaudeQualityPrompt(request.Question);

        _logger.LogInformation("⚡ SSE Stream request: '{Q}' model={M}",
            request.Question[..Math.Min(50, request.Question.Length)],
            request.Model ?? "default");

        try
        {
            await foreach (var token in _ollamaService.StreamAsync(
                prompt,
                request.Model,
                temperature: request.Temperature ?? 0.7f,
                maxTokens: request.MaxTokens ?? 1500,
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

    // SHA256 hash of question for cache key (avoids key length/character issues)
    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input.ToLowerInvariant().Trim()));
        return Convert.ToHexString(bytes)[..16];
    }

    /// <summary>
    /// Build Claude-quality teaching prompt
    /// Ensures responses match Claude's depth and clarity
    /// </summary>
    private string BuildClaudeQualityPrompt(string question)
    {
        return $@"You are an expert programming tutor. Explain ""{question}"" with clarity, depth, and wow-factor. Follow this exact structure:

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
