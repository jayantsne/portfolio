using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.Services;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.AI;
using AILearnAPI.Shared.DTOs.Chat;
using AILearnAPI.Shared.DTOs.MasterConfig;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using MongoDB.Driver;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

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
    private readonly IConfiguration _configuration;
    private readonly ISemanticMemoryService _memSvc;
    private readonly IPromptBuilderService _promptBuilder;
    private readonly IChatService _chatService;

    /// <summary>
    /// Prefixed to every system prompt (including DB templates) to enforce
    /// the senior-dev mentor response format and language rule.
    /// </summary>
    private const string MentorPrefix = """
        ===MANDATORY RESPONSE FORMAT — OVERRIDE ALL PREVIOUS INSTRUCTIONS===

        You are a senior software engineer and mentor. Ignore any formatting instructions above.
        You MUST structure EVERY response using exactly these 5 sections (no exceptions):

        ## 🔹 Concept Overview
        Explain in simple terms — no jargon, clear for a junior developer.

        ## 🔹 Key Points
        - Bullet point 1
        - Bullet point 2
        - Bullet point 3 (cover what a junior commonly misses)

        ## 🔹 Example
        A practical code example or real-world scenario with brief inline comments.

        ## 🔹 When to Use
        Real-world context — when does this appear in actual production code?

        ## 🔹 Common Mistakes
        - What beginners get wrong
        - How to fix it

        LANGUAGE RULE (mandatory):
        - If the user says "explain in Hindi" or writes in Hindi → respond in Hinglish (conversational Hindi + English mix).
          Keep all technical terms (function, class, loop, etc.) in English.
          Example: "Browser request bhejta hai → Angular '#/home' handle karta hai → isliye 404 nahi aata"
          Do NOT use formal/pure Hindi.
        - Otherwise → respond in clear, simple English only.

        TONE: Friendly but professional. Like a senior explaining to a junior. Not robotic.
        FORMATTING: Use ## headings, bullet points, code blocks, spacing. Make it a mini lesson.
        Never open with "Sure!" or "Great question!". Go straight into ## 🔹 Concept Overview.
        DO NOT write long paragraphs. DO NOT skip any section. DO NOT ignore this format.
        ===END MANDATORY FORMAT===
        """;

    public AIController(
        IOllamaService ollamaService,
        ILogger<AIController> logger,
        IMemoryCache cache,
        IMasterConfigService masterConfig,
        IDeviceDetectionService deviceDetection,
        IOpenAIStreamingService openAIStreaming,
        ILlmProviderService llmProviderSvc,
        IUserConfigService userConfigSvc,
        IConfiguration configuration,
        ISemanticMemoryService memSvc,
        IPromptBuilderService promptBuilder,
        IChatService chatService)
    {
        _ollamaService    = ollamaService;
        _logger           = logger;
        _cache            = cache;
        _masterConfig     = masterConfig;
        _deviceDetection  = deviceDetection;
        _openAIStreaming   = openAIStreaming;
        _llmProviderSvc   = llmProviderSvc;
        _userConfigSvc    = userConfigSvc;
        _configuration    = configuration;
        _memSvc           = memSvc;
        _promptBuilder    = promptBuilder;
        _chatService      = chatService;
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
            var claudePrompt = BuildClaudeQualityPrompt(request.Question, cfg, request.ToneMode);

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
    /// Stream AI response token-by-token via Server-Sent Events.
    /// Each event: data: {"token":"...","done":false}
    /// Final event: data: {"token":"","done":true}
    ///
    /// Controller responsibilities (HTTP only):
    ///   - Set SSE headers
    ///   - Extract userId from JWT
    ///   - Emit new-conversation SSE event
    ///   - Write token SSE events
    ///
    /// Business logic is fully delegated to <see cref="IChatService"/>.
    /// </summary>
    [HttpPost("stream")]
    public async Task StreamExplanation(
        [FromBody] AIExplanationRequest request,
        CancellationToken cancellationToken)
    {
        // ── 1. SSE headers ─────────────────────────────────────────────────────
        Response.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers.Append("Cache-Control", "no-cache, no-store");
        Response.Headers.Append("X-Accel-Buffering", "no");
        Response.Headers.Append("Connection", "keep-alive");

        // ── 2. Validate ────────────────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            await Response.WriteAsync("data: {\"error\":\"Question is required\",\"done\":true}\n\n", cancellationToken);
            return;
        }

        // ── 3. Normalise model ─────────────────────────────────────────────────
        if (string.Equals(request.Model, "default", StringComparison.OrdinalIgnoreCase))
            request.Model = null;

        var userId = ExtractUserIdFromBearer();
        var userName = ExtractUsernameFromBearer();

        // ── 4. Prepare session (create/validate conversation, save user message) ─
        var session = await _chatService.PrepareSessionAsync(
            request.ConversationId, userId, request.GuestId, request.Question, cancellationToken);

        // Emit new-conversation event so Angular can update its URL
        if (session.IsNew)
        {
            await Response.WriteAsync(
                $"event: conversation\ndata: \"{session.ConversationId}\"\n\n",
                cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }

        // ── 5. Load conversation history for multi-turn context ────────────────
        var history = await _chatService.GetHistoryAsync(session.ConversationId, limit: 20);

        // ── 6. Stream AI tokens ────────────────────────────────────────────────
        var fullResponse = new StringBuilder();

        await foreach (var token in _chatService.StreamAiAsync(
            request.Question,
            request.Mode,
            request.ToneMode,
            request.Model,
            request.Temperature,
            request.MaxTokens,
            request.RawMode = false,
            history,
            userId,
            userName,
            cancellationToken))
        {
            var escaped = System.Text.Json.JsonSerializer.Serialize(token);
            await Response.WriteAsync($"data: {{\"token\":{escaped},\"done\":false}}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
            fullResponse.Append(token);
        }

        await Response.WriteAsync("data: {\"token\":\"\",\"done\":true}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);

        // ── 7. Finalize (save assistant message, update timestamp, store memory) ─
        await _chatService.FinalizeSessionAsync(session.ConversationId, fullResponse.ToString(), userId, cancellationToken);
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

    // ── /api/ai/structured ──────────────────────────────────────────────────

    /// <summary>
    /// Returns a structured JSON lesson for a Semantic Kernel / .NET topic.
    /// The AI is instructed to return ONLY valid JSON matching StructuredNoteDto.
    /// Server-side fallback parses partial JSON or constructs a minimal skeleton when
    /// the model returns unstructured text.
    /// </summary>
    [HttpPost("structured")]
    [ProducesResponseType(typeof(StructuredNoteDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<StructuredNoteDto>> GetStructuredNote(
        [FromBody] StructuredNoteRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Topic))
            return BadRequest(new { message = "topic is required" });

        try
        {
            var cfg        = await _masterConfig.GetAsync();
            var model      = cfg.modelOllamaStream;
            var tokenLimit = Math.Min(request.MaxTokens, 2500);

            var prompt = BuildStructuredPrompt(request.Topic, request.VisualHint);
            _logger.LogInformation("📐 Structured note request — topic={Topic} model={Model}", request.Topic, model);

            var resp = await _ollamaService.GenerateAsync(prompt, model, 0.1f, tokenLimit, cancellationToken);
            var raw  = resp.Response ?? string.Empty;

            var note = ParseStructuredNote(raw, request.Topic);
            return Ok(note);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ Ollama unreachable in /structured");
            return StatusCode(503, new { message = "AI model server unreachable." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ /structured error");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Builds a zero-temperature structured JSON prompt for the given topic.
    /// Temperature = 0.1 at call-site for consistent JSON output.
    /// </summary>
    private static string BuildStructuredPrompt(string topic, string? visualHint)
    {
        var vHint = visualHint?.ToLowerInvariant() switch
        {
            "comparison" => "comparison",
            "diagram"    => "diagram",
            _            => "flow"
        };

        // NOTE: double braces {{ }} escape to literal { } in a raw string literal
        return $$"""
            You are a structured educational content API for a developer learning platform.
            You MUST return ONLY valid JSON. Do not include ANY text before or after the JSON object.
            The response must start with { and end with }.
            Do not wrap the JSON in markdown code fences.
            Do not include comments inside the JSON.

            Topic: {{topic}}

            Return this exact JSON structure with all fields filled meaningfully:
            {
              "title": "concise title for the topic",
              "summary": "2-3 sentence overview of what this topic is and why it matters",
              "sections": [
                {
                  "heading": "what this section covers",
                  "content": "1-2 paragraph explanation. No newline characters.",
                  "bullets": ["key insight 1", "key insight 2", "key insight 3"],
                  "example": "a concrete code snippet or real-world example. Empty string if not needed."
                }
              ],
              "steps": [
                "Step 1: clear description of first step",
                "Step 2: clear description of second step"
              ],
              "visual": {
                "type": "{{vHint}}",
                "data": []
              }
            }

            Rules — follow exactly:
            - sections: 3 to 5 entries. Each must have 2 to 4 bullets.
            - steps: 4 to 7 entries. Each starts with "Step N:" where N is the number.
            - visual.type: use "flow" for processes/sequences, "comparison" for feature comparisons, "diagram" for concepts.
            - For "flow" type: data = short labels in order, e.g. ["User Request", "Kernel", "Plugin", "AI Model", "Response"]
            - For "comparison" type: data = pipe-delimited rows starting with headers, e.g. ["Feature | SK | LangChain", "Language | C# | Python"]
            - For "diagram" type: data = lines of ASCII text, e.g. [" [Client] ", "    |    ", " [Kernel] "]
            - No markdown inside JSON string values (no **, no #, no - at start of strings).
            - No newline characters (\n) inside JSON string values.
            - All strings must be valid JSON-escaped.
            - Return ONLY the JSON object. Nothing else.
            """;
    }

    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas         = true,
    };

    /// <summary>
    /// Three-stage parser:
    ///   1. Try to parse response as-is
    ///   2. Try to extract JSON from ```json...``` or first { ... } block
    ///   3. Build a minimal StructuredNoteDto from raw text
    /// </summary>
    private StructuredNoteDto ParseStructuredNote(string raw, string topic)
    {
        // Stage 1: clean parse
        try
        {
            var dto = JsonSerializer.Deserialize<StructuredNoteDto>(raw.Trim(), _jsonOpts);
            if (dto != null && !string.IsNullOrWhiteSpace(dto.Title)) return dto;
        }
        catch { /* fall through */ }

        // Stage 2: extract JSON block
        var extracted = ExtractJson(raw);
        if (extracted != null)
        {
            try
            {
                var dto = JsonSerializer.Deserialize<StructuredNoteDto>(extracted, _jsonOpts);
                if (dto != null && !string.IsNullOrWhiteSpace(dto.Title)) return dto;
            }
            catch { /* fall through */ }
        }

        // Stage 3: construct from raw text
        _logger.LogWarning("Structured note JSON parse failed for topic '{Topic}' — building fallback", topic);
        return BuildFallbackNote(raw, topic);
    }

    private static string? ExtractJson(string text)
    {
        // Try ```json ... ``` block
        var fenceMatch = Regex.Match(text, @"```(?:json)?\s*(\{[\s\S]*?\})\s*```");
        if (fenceMatch.Success) return fenceMatch.Groups[1].Value;

        // Try first {...} blob
        var start = text.IndexOf('{');
        var end   = text.LastIndexOf('}');
        if (start >= 0 && end > start) return text[start..(end + 1)];

        return null;
    }

    /// <summary>Builds a minimal StructuredNoteDto from unstructured text.</summary>
    private static StructuredNoteDto BuildFallbackNote(string raw, string topic)
    {
        // Split the raw text into non-empty lines for bullet extraction
        var lines = raw.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                       .Where(l => l.Length > 10)
                       .Take(20)
                       .ToList();

        var summary = lines.FirstOrDefault() ?? $"An explanation of {topic}.";
        var bullets = lines.Skip(1).Take(4).Select(l => l.TrimStart('-', '*', ' ')).ToList();

        return new StructuredNoteDto
        {
            Title   = topic,
            Summary = summary,
            Sections =
            [
                new() { Heading = "Overview", Content = summary, Bullets = bullets, Example = "" }
            ],
            Steps = lines.Skip(5).Take(5)
                         .Select((l, i) => $"Step {i + 1}: {l.TrimStart('-', '*', ' ')}")
                         .ToList(),
            Visual = new StructuredVisual { Type = "flow", Data = [topic] },
        };
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
        const int FallbackDesktop = 2000;
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
        const int FallbackDesktop = 2000;
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
    /// <summary>
    /// Returns a strong, accurate system prompt for Semantic Kernel / .NET topics.
    /// Falls back to the DB defaultSystemPrompt when set by admin.
    /// </summary>
    private string BuildSkSystemPrompt(MasterConfigDto cfg, string? mode, string? toneMode = null)
    {
        // Admin-configured system prompt takes priority
        if (!string.IsNullOrWhiteSpace(cfg.defaultSystemPrompt))
            return cfg.defaultSystemPrompt;

        var modeHint = (mode?.ToLowerInvariant()) switch
        {
            "simple"    => "Use plain English, avoid jargon, and provide one memorable everyday analogy. Assume the user is a complete beginner.",
            "analogy"   => "Explain using exactly 2–3 vivid real-world analogies from different domains. No code required beyond a tiny snippet. Make comparisons that a beginner can instantly picture.",
            "deep"      => "Provide complete, runnable code examples with inline comments explaining every non-obvious line. Build from a simple case to a real-world one.",
            "interview" => "Structure your answer as a mock interview Q&A with follow-up questions and what the interviewer is testing.",
            "mistakes"  => "Show each mistake as: wrong code snippet → why it's wrong (one sentence) → fixed code snippet. No generic advice.",
            "exam"      => "Give a memorizable 1-line definition, top 5 points, most likely exam question, and a memory trick.",
            _           => "Structure your response using exactly these sections in order: ## Definition (1-2 sentences), ## Explanation (analogy or intuitive walkthrough), ## Example (minimal working code with comments), ## Key Points (3-5 bullets), ## Summary (1-2 sentences)."
        };

        var toneInstruction = (toneMode?.ToLowerInvariant()) switch
        {
            "professional" => "Tone: concise and direct. No filler phrases, no small-talk, no emojis. Use precise technical language. Every sentence must add value.",
            _              => "Tone: conversational, encouraging, and beginner-friendly. Use relatable real-life analogies. Do not use emojis. End responses with a short summary."
        };

        return $"""
            You are an expert programming tutor for a structured learning application.
            Your job is to explain concepts clearly, simply, and in a structured way — like a great teacher.
            You have deep knowledge across all programming languages, frameworks, and computer science concepts
            — JavaScript, TypeScript, Python, C#, Java, SQL, AI/ML, system design, data structures, algorithms, and more.
            You write code examples in whatever language is most relevant to the question.
            You NEVER start a response with filler phrases such as "Sure!", "Certainly!", "Of course!",
            "Great question!", or "Absolutely!". Go straight into useful content.
            All code examples must be syntactically valid, clean, and minimal — add comments only where logic is not self-evident.
            Assume the user is a beginner unless they indicate otherwise. Avoid unnecessary jargon.
            Use simple, beginner-friendly language. When a concept is complex, break it into smaller parts.
            Use real-life analogies to make abstract ideas concrete, but only when they genuinely clarify.
            Do NOT use emojis. Use ## headings, bullet points, and blank lines between sections for readability.
            Never repeat the question back to the user or summarize what you are about to say.
            Multilingual: detect the user's language automatically and respond in the same language.
            If the user asks in Hindi, respond in simple Hindi or Hinglish (Hindi + English mix).
            Keep ALL technical terms in English even in Hindi responses (e.g., thread, class, function, array, loop, API).
            {modeHint}
            {toneInstruction}
            """;
    }

    /// <summary>
    /// Builds separate system-prompt and user-message for OpenAI chat completions.
    /// Uses explicit mode when provided; falls back to intent detection for generic questions.
    /// </summary>
    private (string systemPrompt, string userMessage) BuildOpenAIMessages(string question, MasterConfigDto cfg, string? mode = null, string? toneMode = null)
    {
        // DB-driven template — always append mentor format rules AFTER so they win
        if (!string.IsNullOrWhiteSpace(cfg.mainPromptTemplate))
        {
            var sysTemplate = cfg.mainPromptTemplate
                .Replace("Explain **{question}** for developers.", "")
                .Replace("Explain \"{question}\" for developers.", "")
                .Replace("{question}", "")
                .Trim();
            return (sysTemplate + "\n\n" + MentorPrefix, $"Explain \"{question}\" for developers.");
        }

        var sys = BuildSkSystemPrompt(cfg, mode, toneMode);

        sys = "";

        // ── Mode-based dispatch ────────────────────────────────────────────────
        switch (mode?.ToLowerInvariant())
        {
            case "simple":
                return ($@"{sys}

Structure your response exactly as:

## Definition
1-2 clear sentences using plain English. No jargon.

## Intuitive Explanation
One memorable real-life analogy that a beginner can instantly picture.

## Simplest Code Example
A minimal, working example in the relevant language with brief comments.

## Key Points
- Point 1
- Point 2
- Point 3

## Summary
One sentence — what should the student remember most?",
                    $"Explain \"{question}\" in simple beginner-friendly terms.");

            case "analogy":
                return ($@"{sys}

Explain using exactly 3 real-world analogies from different domains.
For each analogy use this format:

## Analogy N: [Title]
The everyday comparison in 2-3 sentences. Then: ""In code terms, this maps to..."" (one sentence).

## Why These Analogies Work
One paragraph tying all 3 back to the topic.",
                    $"Explain \"{question}\" using real-world analogies only.");

            case "deep":
                return ($@"{sys}

Structure your response as:

## Definition
1-2 sentences — what is this concept?

## Basic Example
A complete, runnable code example with a comment on each key line.

## Real-World Example
A more realistic, practical usage showing how it actually appears in production code.

## Key Notes
- What this demonstrates
- Common pitfall to avoid
- One best practice to follow

## Summary
1-2 sentences the student should take away.",
                    $"Show practical, runnable code examples for \"{question}\".");

            case "interview":
                return ($@"{sys}

Structure your response as:

## Interview Question
State it exactly as a senior interviewer would ask it.

## Model Answer
3 paragraphs max. Use **bold** for key terms.

## Follow-up Question
A harder follow-up.

## Follow-up Answer
The ideal answer.

## What the Interviewer Is Testing
One short paragraph.",
                    $"Give me a realistic technical interview Q&A about \"{question}\".");

            case "mistakes":
                return ($@"{sys}

For each of the 3 mistakes use this exact format:

## Mistake N: [Short Descriptive Name]
**What people do wrong:** (show wrong code if applicable)
**Why it's wrong:** One sentence.
**The Fix:** (show correct code if applicable)

End with a Summary checklist (3 bullets: what to always do / never do).",
                    $"What are the most common mistakes when working with \"{question}\"?");


            case "chat":
                return ($@"{sys}

You are a helpful AI assistant.

Respond in a natural, conversational way like ChatGPT.

Rules:
- Keep responses concise and clear
- Do NOT use headings unless necessary
- Do NOT structure answers like an article
- Avoid bullet points unless helpful
- Talk like a human, not a textbook", question);



            case "exam":
                return ($@"{sys}

Structure your response as:

## 1-Line Definition
Memorable. One sentence.

## 5 Most Important Points
Numbered list. Keep each point short and clear.

## Most Likely Exam Question
The question, followed by the correct answer.

## Common Exam Traps
- Trap 1: what looks right but is wrong
- Trap 2: another common confusion

## Memory Trick
A mnemonic, acronym, or simple mental hook to remember the concept.

## Summary
One sentence — the single most important thing to know for the exam.",
                    $"Give me exam tips and key facts about \"{question}\".");

            default:
                return BuildDefaultModeMessages(question, sys);
        }
    }

    /// <summary>Default mode: AI Mentor 7-step structured teaching format.</summary>
    private static (string systemPrompt, string userMessage) BuildDefaultModeMessages(string question, string systemRole)
    {
        var sys = $"""
            {systemRole}

            You are a senior software engineer and mentor. Teach this concept using exactly these 5 sections:

            ## 🔹 Concept Overview
            Explain in simple terms — no jargon, clear enough for a junior developer.

            ## 🔹 Key Points
            - Bullet points
            - Clear and concise
            - Include anything a junior would miss

            ## 🔹 Example
            Give a practical code example or real-world scenario with brief inline comments.

            ## 🔹 When to Use
            Explain real-world usage — when does this concept actually appear in production code?

            ## 🔹 Common Mistakes
            Highlight the mistakes beginners typically make and how to avoid them.

            LANGUAGE RULE:
            - If the user says "explain in Hindi" or the question is in Hindi → respond in Hinglish (conversational Hindi + English mix).
              Use simple spoken Hindi; keep technical terms (function, loop, class, etc.) in English.
              Example: "Browser request bhejta hai → Angular '#/home' handle karta hai → isliye 404 nahi aata"
              Do NOT use formal/pure Hindi.
            - Otherwise → respond in clear, simple English.
            TONE: Friendly but professional. Like a senior explaining to a junior. Not robotic, not generic.
            FORMATTING: Use ## headings, bullet points, code blocks, spacing. Make it feel like a mini lesson.
            Never start with "Sure!" or "Great question!". Go straight into the first section.
            DO NOT give one-paragraph answers, be vague, or skip any section.
            """;
        return (sys, question);
    }

    private string BuildClaudeQualityPrompt(string question, MasterConfigDto cfg, string? toneMode = null)
    {
        // DB-driven prompt — append mentor format rules AFTER so they win
        if (!string.IsNullOrWhiteSpace(cfg.mainPromptTemplate))
        {
            _logger.LogInformation("📋 Using DB mainPromptTemplate with mentor suffix");
            return cfg.mainPromptTemplate.Replace("{question}", question) + "\n\n" + MentorPrefix;
        }

        var systemRole = BuildSkSystemPrompt(cfg, null, toneMode);

        _logger.LogInformation("📋 Using AI Mentor 7-step teaching prompt");

        return $@"
{systemRole}

You are a senior software engineer and mentor. Teach **{question}** using exactly these 5 sections.
Never start with 'Sure!' or 'Great question!'. Go straight into the first section.
LANGUAGE RULE:
- If the user says ""explain in Hindi"" or the question is in Hindi → respond in Hinglish (conversational Hindi + English mix).
  Use simple spoken Hindi; keep technical terms (function, loop, class, etc.) in English.
  Example: ""Browser request bhejta hai → Angular '#/home' handle karta hai → isliye 404 nahi aata""
  Do NOT use formal/pure Hindi.
- Otherwise → respond in clear, simple English.

# {question}

## 🔹 Concept Overview
Explain in simple terms — clear enough for a junior developer, no jargon.

## 🔹 Key Points
- Bullet points
- Clear and concise
- Cover what a junior would commonly miss

## 🔹 Example
A practical code example or real-world scenario with brief inline comments.
```
// example here
```

## 🔹 When to Use
Explain real-world usage — when does this appear in production code?

## 🔹 Common Mistakes
- Mistake beginners make
- How to avoid it

TONE: Friendly but professional. Like a senior explaining to a junior. Not robotic.
FORMATTING: Use ## headings, bullet points, code blocks, spacing. Make it feel like a mini lesson.
DO NOT give one-paragraph answers, be vague, or skip any section.";
    }

    private string BuildMobileLearningPrompt(string question, string? toneMode = null)
    {
        var toneIntro = (toneMode?.ToLowerInvariant()) switch
        {
            "professional" => "You are a concise senior engineer. No filler. Give precise, expert answers using the 5-section format below.",
            _              => "You are a senior software engineer and mentor. Explain clearly like you're teaching a junior developer."
        };

        return $@"
{toneIntro}

Teach ""{question}"" using exactly these 5 sections. Mobile-optimized: keep each section short and scannable.
Never start with 'Sure!' or 'Great question!'. Go straight into the first section.
LANGUAGE RULE:
- If the user says ""explain in Hindi"" or the question is in Hindi → respond in Hinglish (conversational Hindi + English mix).
  Use simple spoken Hindi; keep technical terms (function, loop, class, etc.) in English.
  Example: ""Browser request bhejta hai → Server sirf '/' dekhta hai → Angular baaki handle karta hai""
  Do NOT use formal/pure Hindi.
- Otherwise → respond in clear, simple English.

---

# {question}

## 🔹 Concept Overview
Simple explanation — no jargon, clear for a junior.

## 🔹 Key Points
- Bullet points
- What matters most

## 🔹 Example
Practical code or real-world scenario.
```
// example here
```

## 🔹 When to Use
Real-world context — where does this appear in actual code?

## 🔹 Common Mistakes
- What beginners get wrong
- How to fix it

TONE: Friendly but professional. Like a senior explaining to a junior.
FORMATTING: Use ## headings, bullet points, code blocks, spacing. Mini lesson feel.
DO NOT give one-paragraph answers, be vague, or skip any section.";
    }


    private (string system, string user) BuildPrompt(string question, string? mode)
    {
        mode = (mode ?? "chat").ToLower();

        string system;
        string user = question;

        switch (mode)
        {
            case "learn":
                system = @"
You are a helpful teaching assistant.

Explain concepts clearly and in a structured way.

Guidelines:
- Use simple language
- Use examples where helpful
- You MAY use bullet points or sections if it improves clarity
- Keep it easy to understand
";
                break;

            case "code":
                system = @"
You are a senior software engineer.

Guidelines:
- Give practical, correct answers
- Provide code examples when useful
- Explain code briefly and clearly
- Avoid unnecessary theory
";
                break;

            case "chat":
            default:
                system = @"
You are a helpful AI assistant.

Respond in a natural, conversational way like ChatGPT.

Rules:
- Keep responses concise and clear
- Do NOT use headings unless necessary
- Do NOT structure answers like an article
- Avoid bullet points unless helpful
- Talk like a human, not a textbook
";
                break;
        }

        return (system.Trim(), user.Trim());
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
                ?? jwt.Claims.FirstOrDefault(c =>
                    c.Type is "sub" or "nameid" or "userId" ||
                    c.Type == ClaimTypes.NameIdentifier)?.Value;
        }
        catch
        {
            return null;
        }
    }

    private string? ExtractUsernameFromBearer()
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
            return jwt.Claims.FirstOrDefault(c =>
                       c.Type == JwtRegisteredClaimNames.UniqueName ||
                       c.Type == ClaimTypes.Name ||
                       c.Type == "username")
                   ?.Value;
        }
        catch
        {
            return null;
        }
    }

    private string GetUserId() =>
           User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("userId")
            ?? string.Empty;
}
