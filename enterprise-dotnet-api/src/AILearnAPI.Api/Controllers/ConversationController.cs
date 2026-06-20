using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Api.Services;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Thin controller — handles only HTTP concerns.
    /// All business logic (conversation CRUD, message persistence) lives in <see cref="IChatService"/>.
    /// </summary>
    [ApiController]
    [Route("api/conversation")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ConversationController : ControllerBase
    {
        private readonly IChatService _chat;
        private readonly ILogger<ConversationController> _logger;

        public ConversationController(IChatService chat, ILogger<ConversationController> logger)
        {
            _chat   = chat;
            _logger = logger;
        }

        // ─── GET /api/conversation ─────────────────────────────────────────────

        [HttpGet]
        public async Task<ActionResult<List<ConversationSummaryDto>>> GetAll()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            return Ok(await _chat.GetUserConversationsAsync(userId));
        }

        // ─── GET /api/conversation/{id}/messages ───────────────────────────────

        [HttpGet("{id}/messages")]
        public async Task<ActionResult<List<ChatMessageDto>>> GetMessages(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var msgs = await _chat.GetConversationMessagesAsync(id, userId);
            if (msgs == null) return NotFound();

            return Ok(msgs);
        }

        // ─── POST /api/conversation ────────────────────────────────────────────

        [HttpPost]
        public async Task<ActionResult<ConversationSummaryDto>> Create([FromBody] CreateConversationRequest req)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            return Ok(await _chat.CreateConversationAsync(userId, req.Title ?? string.Empty));
        }

        // ─── DELETE /api/conversation/{id} ────────────────────────────────────

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var deleted = await _chat.DeleteConversationAsync(id, userId);
            if (!deleted) return NotFound();

            return NoContent();
        }

        // ─── Helpers ──────────────────────────────────────────────────────────

        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? User.FindFirstValue("userId")
             ?? string.Empty;
    }

    // ── Request DTOs (HTTP-layer only) ─────────────────────────────────────────
    public record CreateConversationRequest(string? Title);
}

