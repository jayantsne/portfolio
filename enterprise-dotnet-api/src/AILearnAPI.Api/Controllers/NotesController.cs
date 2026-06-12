using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Api.Services;
using AILearnAPI.Shared.DTOs.Notes;
using AILearnAPI.Domain.Constants;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Saved notes — one collection per user.
    /// All endpoints require a valid JWT  (Authorization: Bearer {token}).
    /// Every operation is scoped to the authenticated user's userId — users
    /// can never read or delete notes that belong to someone else.
    /// </summary>
    [ApiController]
    [Route("api/notes")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class NotesController : ControllerBase
    {
        private readonly INoteService _svc;
        private readonly ILogger<NotesController> _logger;
        private readonly IOllamaService _ollama;
        private readonly IOpenAIStreamingService _openAI;
        private readonly ILlmProviderService _llmProviderSvc;
        private readonly ISecretProvider _secrets;

        public NotesController(
            INoteService svc,
            ILogger<NotesController> logger,
            IOllamaService ollama,
            IOpenAIStreamingService openAI,
            ILlmProviderService llmProviderSvc,
            ISecretProvider secrets)
        {
            _svc            = svc;
            _logger         = logger;
            _ollama         = ollama;
            _openAI         = openAI;
            _llmProviderSvc = llmProviderSvc;
            _secrets        = secrets;
        }

        // GET /api/notes[?contextType=prep&contextId=123]
        /// <summary>
        /// Returns notes for the authenticated user.
        /// When <paramref name="contextType"/> is provided, only notes from that context are returned.
        /// Optionally narrow further with <paramref name="contextId"/>.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<NoteDto>>> GetAll(
            [FromQuery] string? contextType = null,
            [FromQuery] string? contextId   = null)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            List<NoteDto> notes;
            if (!string.IsNullOrWhiteSpace(contextType))
                notes = await _svc.GetByContextAsync(userId, contextType.Trim(), contextId?.Trim());
            else
                notes = await _svc.GetByUserIdAsync(userId);

            return Ok(notes);
        }

        // POST /api/notes
        /// <summary>Save a new note for the authenticated user.</summary>
        [HttpPost]
        public async Task<ActionResult<NoteDto>> Create([FromBody] CreateNoteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.topic) || string.IsNullOrWhiteSpace(dto.content))
                return BadRequest(new { message = "topic and content are required" });

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var note = await _svc.CreateAsync(userId, dto);
            _logger.LogInformation("Note created for user {UserId}: {Topic}", userId, dto.topic);
            return CreatedAtAction(nameof(GetAll), new { }, note);
        }

        // DELETE /api/notes/{id}
        /// <summary>Deletes a note — only if it belongs to the authenticated user.</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var deleted = await _svc.DeleteAsync(userId, id);
            if (!deleted)
                return NotFound(new { message = "Note not found or not owned by you" });

            return NoContent();
        }

        // PUT /api/notes/{id}
        /// <summary>Replaces the content of an existing note — only if it belongs to the authenticated user.</summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<NoteDto>> Update(string id, [FromBody] UpdateNoteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.content))
                return BadRequest(new { message = "content is required" });

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var updated = await _svc.UpdateAsync(userId, id, dto);
            if (updated == null)
                return NotFound(new { message = "Note not found or not owned by you" });

            _logger.LogInformation("Note {NoteId} updated by user {UserId}", id, userId);
            return Ok(updated);
        }

        // PATCH /api/notes/{id}/pin
        /// <summary>Toggles the pinned state of a note.</summary>
        [HttpPatch("{id}/pin")]
        public async Task<ActionResult<NoteDto>> TogglePin(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var updated = await _svc.TogglePinAsync(userId, id);
            if (updated == null)
                return NotFound(new { message = "Note not found or not owned by you" });

            return Ok(updated);
        }

        // POST /api/notes/ai-format-html  (Streaming SSE — for Tiptap editor)
        /// <summary>
        /// Streams an HTML-formatted version of the supplied note content via Server-Sent Events.
        /// Designed for the Tiptap rich-text editor: the AI receives the plain-text representation
        /// of the note's current HTML and returns well-structured semantic HTML.
        /// Each SSE event: data: {"token":"…"}  ·  Final: data: {"token":"","done":true}
        /// </summary>
        [HttpPost("ai-format-html")]
        public async Task FormatHtmlStream(
            [FromBody] AiFormatRequestDto dto,
            CancellationToken ct)
        {
            Response.ContentType = "text/event-stream; charset=utf-8";
            Response.Headers.Append("Cache-Control", "no-cache, no-store");
            Response.Headers.Append("X-Accel-Buffering", "no");
            Response.Headers.Append("Connection", "keep-alive");

            if (string.IsNullOrWhiteSpace(dto.Text))
            {
                await Response.WriteAsync("data: {\"error\":\"text is required\",\"done\":true}\n\n", ct);
                return;
            }

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                await Response.WriteAsync("data: {\"error\":\"Unauthenticated\",\"done\":true}\n\n", ct);
                return;
            }

            // Strip tags to get readable text, then ask GPT-4 to return clean HTML
            var plainText = StripHtml(dto.Text.Length > 8000 ? dto.Text[..8000] : dto.Text);
            var prompt    = BuildHtmlFormatPrompt(plainText);

            IAsyncEnumerable<string> tokenStream;
            try
            {
                // Resolve OpenAI provider
                var providers = await _llmProviderSvc.GetAllForAdminAsync();
                var prov      = providers.FirstOrDefault(p =>
                    p.ProviderName.Equals("openai", StringComparison.OrdinalIgnoreCase) && p.Enabled);

                if (prov != null)
                {
                    var apiKey = _secrets.GetOptional("OPENAI_API_KEY")
                              ?? _secrets.GetOptional("LlmProviders:OpenAI:ApiKey")
                              ?? _secrets.GetOptional("OpenAI:ApiKey");

                    if (string.IsNullOrEmpty(apiKey))
                    {
                        try { apiKey = await _llmProviderSvc.ResolveApiKeyAsync("openai", userId, UserRoles.Admin); }
                        catch { /* fall through */ }
                    }

                    if (!string.IsNullOrEmpty(apiKey))
                    {
                        const string system =
                            "You are an expert technical note formatter. " +
                            "Return ONLY clean, semantic HTML using <h1>–<h3>, <p>, <ul>, <ol>, <li>, " +
                            "<strong>, <em>, <code>, <pre><code>, <blockquote>, <hr>. " +
                            "No markdown, no preamble, no <html>/<body> wrapper. " +
                            "Never change any word — only add structure and semantic tags.";

                        tokenStream = _openAI.StreamAsync(
                            apiKey, prov.BaseUrl, prov.Model,
                            system, prompt, 3000, ct, temperature: 0.2f);
                    }
                    else
                    {
                        // Fallback to Ollama
                        tokenStream = _ollama.StreamAsync(
                            BuildOllamaHtmlPrompt(plainText), null, 0.2f, 3000, cancellationToken: ct);
                    }
                }
                else
                {
                    tokenStream = _ollama.StreamAsync(
                        BuildOllamaHtmlPrompt(plainText), null, 0.2f, 3000, cancellationToken: ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ai-format-html: provider resolution failed for user {UserId}", userId);
                await Response.WriteAsync("data: {\"error\":\"AI provider unavailable\",\"done\":true}\n\n", ct);
                return;
            }

            await foreach (var token in tokenStream.WithCancellation(ct))
            {
                var escaped = System.Text.Json.JsonSerializer.Serialize(token);
                await Response.WriteAsync($"data: {{\"token\":{escaped}}}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }

            await Response.WriteAsync("data: {\"token\":\"\",\"done\":true}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }

        private static string StripHtml(string html)
        {
            // Preserve code blocks as text
            html = Regex.Replace(html, @"<pre[\s\S]*?</pre>", m =>
            {
                var inner = Regex.Replace(m.Value, "<[^>]+>", "").Trim();
                return $"\n```\n{inner}\n```\n";
            }, RegexOptions.IgnoreCase);

            html = Regex.Replace(html, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
            html = Regex.Replace(html, @"</p>|</li>|</h[1-6]>|</blockquote>", "\n", RegexOptions.IgnoreCase);
            html = Regex.Replace(html, @"<li>", "- ", RegexOptions.IgnoreCase);
            html = Regex.Replace(html, "<[^>]+>", "");
            html = System.Net.WebUtility.HtmlDecode(html);
            return Regex.Replace(html, @"\n{3,}", "\n\n").Trim();
        }

        private static string BuildHtmlFormatPrompt(string text) => $"""
            You are an expert technical note formatter. Format the raw text below into clean, structured HTML.

            ABSOLUTE RULES:
            1. Do NOT change any word — preserve exact wording.
            2. Return ONLY valid HTML — no markdown, no preamble.
            3. Use only: <h1> <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <code> <pre><code> <blockquote> <hr>
            4. Wrap code in <pre><code class="language-LANG">…</code></pre>.
            5. Do NOT add <html>, <head>, <body> or DOCTYPE.

            Raw text:
            {text}
            """;

        private static string BuildOllamaHtmlPrompt(string text) =>
            BuildHtmlFormatPrompt(text);  // same prompt; Ollama follows it reasonably well

        [HttpPost("ai-format")]
        public async Task<IActionResult> AiFormat(
            [FromBody] AiFormatRequestDto dto,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest(new { message = "text is required" });

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            // Cap input to avoid runaway token usage
            var text = dto.Text.Length > 8000 ? dto.Text[..8000] + "\n[…truncated]" : dto.Text;

            var prompt = BuildFormatPrompt(text);

            try
            {
                var resp = await _ollama.GenerateAsync(prompt, temperature: 0.2f, maxTokens: 2048, cancellationToken: ct);
                var formatted = (!string.IsNullOrWhiteSpace(resp.Response) ? resp.Response : text).Trim();
                _logger.LogInformation("ai-format: {Chars} chars in → {Out} chars out for user {UserId}",
                    text.Length, formatted.Length, userId);
                return Ok(new { formatted });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ai-format failed for user {UserId}", userId);
                // Graceful degradation: return the original text so the extension still gets something useful
                return Ok(new { formatted = text });
            }
        }

        private static string BuildFormatPrompt(string raw) => $"""
            You are a Markdown formatter. Your ONLY job is to apply structure and formatting to the text below.

            ABSOLUTE RULES — never break these:
            1. DO NOT change, replace, rephrase, improve, or rewrite any word or sentence.
            2. DO NOT summarise, shorten, or omit any content.
            3. DO NOT add new sentences, explanations, examples, or commentary of any kind.
            4. DO NOT translate any content — preserve the exact language(s) used in the input.
               If the input is in Hindi, Hinglish, or any other language, keep it in that language.
            5. Return ONLY the formatted markdown — no preamble, no "Here is the formatted version:", no closing remarks.

            FORMATTING YOU ARE ALLOWED TO APPLY:
            - Add a blank line between paragraphs for readability.
            - Convert lines that form a list into markdown bullet points (- item).
            - Add a ## heading before a line that is clearly a standalone section title (all-caps line, or short line followed by a colon).
            - Wrap inline code and variable names in backticks (`example`).
            - Wrap multi-line code blocks in fenced code blocks with the correct language tag (```javascript, ```python, ```csharp, etc.).
            - Replace hard separator lines (--- or ***) with a blank line + appropriate ## heading if context allows.
            - Bold (**term**) key terms that were already emphasized in the original.

            Raw text to format:
            {raw}
            """;

        // ── helpers ─────────────────────────────────────────────────────────
        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? string.Empty;
    }
}
