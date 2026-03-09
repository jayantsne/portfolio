using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Api.Services;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Manages LLM providers (OpenAI, etc.) with role-based access control.
    /// API keys are never returned to any client — they are encrypted in MongoDB
    /// and decrypted only inside the streaming endpoint on the backend.
    /// </summary>
    [ApiController]
    [Route("api/llm-providers")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class LlmProviderController : ControllerBase
    {
        private readonly ILlmProviderService _svc;
        private readonly IOpenAIStreamingService _openAI;
        private readonly ILogger<LlmProviderController> _logger;

        public LlmProviderController(
            ILlmProviderService svc,
            IOpenAIStreamingService openAI,
            ILogger<LlmProviderController> logger)
        {
            _svc    = svc;
            _openAI = openAI;
            _logger = logger;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
                                 ?? User.FindFirstValue("userId")
                                 ?? User.FindFirstValue(ClaimTypes.Name)
                                 ?? "unknown";

        private string Role => User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.User;

        private bool IsAdmin => Role == UserRoles.Admin;

        // ── Admin endpoints ──────────────────────────────────────────────────

        /// <summary>GET /api/llm-providers/admin — List all providers (admin only).</summary>
        [HttpGet("admin")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetAllProviders()
        {
            var providers = await _svc.GetAllForAdminAsync();
            return Ok(providers);
        }

        /// <summary>POST /api/llm-providers/admin — Create or update a provider (admin only).</summary>
        [HttpPost("admin")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpsertProvider([FromBody] UpsertLlmProviderRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.ProviderName))
                return BadRequest(new { message = "provider_name is required." });

            if (string.IsNullOrWhiteSpace(req.ApiKey))
                return BadRequest(new { message = "api_key is required." });

            var dto = await _svc.UpsertProviderAsync(req);
            _logger.LogInformation("Admin upserted LLM provider '{P}'", req.ProviderName);
            return Ok(dto);
        }

        /// <summary>PATCH /api/llm-providers/admin/{providerName}/enabled — Toggle enabled (admin only).</summary>
        [HttpPatch("admin/{providerName}/enabled")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> SetEnabled(string providerName, [FromBody] SetEnabledRequest req)
        {
            var ok = await _svc.SetEnabledAsync(providerName, req.Enabled);
            if (!ok) return NotFound(new { message = $"Provider '{providerName}' not found." });
            return Ok(new { message = $"Provider '{providerName}' enabled={req.Enabled}." });
        }

        /// <summary>POST /api/llm-providers/admin/{providerName}/allowed-users — Grant user access (admin only).</summary>
        [HttpPost("admin/{providerName}/allowed-users")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> AddAllowedUser(string providerName, [FromBody] AllowedUserRequest req)
        {
            var ok = await _svc.AddAllowedUserAsync(providerName, req.UserId);
            if (!ok) return NotFound(new { message = $"Provider '{providerName}' not found." });
            return Ok(new { message = $"User '{req.UserId}' added to '{providerName}'." });
        }

        /// <summary>DELETE /api/llm-providers/admin/{providerName}/allowed-users/{userId} — Revoke access (admin only).</summary>
        [HttpDelete("admin/{providerName}/allowed-users/{userId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> RemoveAllowedUser(string providerName, string userId)
        {
            var ok = await _svc.RemoveAllowedUserAsync(providerName, userId);
            if (!ok) return NotFound(new { message = $"Provider '{providerName}' not found." });
            return Ok(new { message = $"User '{userId}' removed from '{providerName}'." });
        }

        // ── User-facing endpoints ────────────────────────────────────────────

        /// <summary>GET /api/llm-providers/available — Providers this user can select.</summary>
        [HttpGet("available")]
        public async Task<IActionResult> GetAvailableProviders()
        {
            var names = await _svc.GetAllowedProviderNamesAsync(UserId, Role);
            return Ok(new { providers = names });
        }

        // ── Streaming endpoint ───────────────────────────────────────────────

        /// <summary>
        /// POST /api/llm-providers/openai/stream — Stream an OpenAI response as SSE.
        /// Requires the user to be admin OR in the openai allowed_user_ids list.
        /// The API key is resolved server-side; it is never sent to the client.
        /// </summary>
        [HttpPost("openai/stream")]
        public async Task StreamOpenAI(
            [FromBody] OpenAIStreamRequest req,
            CancellationToken cancellationToken)
        {
            Response.ContentType = "text/event-stream; charset=utf-8";
            Response.Headers.Append("Cache-Control", "no-cache, no-store");
            Response.Headers.Append("X-Accel-Buffering", "no");
            Response.Headers.Append("Connection", "keep-alive");

            if (string.IsNullOrWhiteSpace(req.Question))
            {
                await Response.WriteAsync("data: {\"error\":\"Question is required\",\"done\":true}\n\n", cancellationToken);
                return;
            }

            string? apiKey;
            try
            {
                apiKey = await _svc.ResolveApiKeyAsync("openai", UserId, Role);
            }
            catch (UnauthorizedAccessException)
            {
                Response.StatusCode = 403;
                await Response.WriteAsync("data: {\"error\":\"Access denied to OpenAI provider.\",\"done\":true}\n\n", cancellationToken);
                return;
            }

            if (apiKey == null)
            {
                await Response.WriteAsync("data: {\"error\":\"OpenAI provider is not configured or disabled.\",\"done\":true}\n\n", cancellationToken);
                return;
            }

            // Retrieve provider config (model + base URL) for this stream request
            var allProviders = await _svc.GetAllForAdminAsync();
            var provider     = allProviders.FirstOrDefault(p => p.ProviderName == "openai");
            var model        = req.Model ?? provider?.Model ?? "gpt-4o-mini";
            var baseUrl      = provider?.BaseUrl ?? "https://api.openai.com/v1";

            _logger.LogInformation("OpenAI stream: user={U} model={M}", UserId, model);

            try
            {
                await foreach (var token in _openAI.StreamAsync(
                    apiKey, baseUrl, model, string.Empty, req.Question,
                    req.MaxTokens ?? 1500, cancellationToken))
                {
                    if (cancellationToken.IsCancellationRequested) break;
                    var escaped = System.Text.Json.JsonSerializer.Serialize(token);
                    await Response.WriteAsync(
                        $"data: {{\"token\":{escaped},\"done\":false}}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }

                await Response.WriteAsync("data: {\"token\":\"\",\"done\":true}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("OpenAI stream cancelled by client");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI streaming error");
                var errJson = System.Text.Json.JsonSerializer.Serialize(ex.Message);
                await Response.WriteAsync(
                    $"data: {{\"error\":{errJson},\"done\":true}}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
    }

    // ── Request models ──────────────────────────────────────────────────────

    public record SetEnabledRequest(bool Enabled);
    public record AllowedUserRequest(string UserId);
    public record OpenAIStreamRequest(
        string Question,
        string? Model,
        int? MaxTokens);
}
