using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Notes;

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

        public NotesController(INoteService svc, ILogger<NotesController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // GET /api/notes
        /// <summary>Returns all notes for the authenticated user (sorted newest-first).</summary>
        [HttpGet]
        public async Task<ActionResult<List<NoteDto>>> GetAll()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var notes = await _svc.GetByUserIdAsync(userId);
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

            var updated = await _svc.UpdateAsync(userId, id, dto.content);
            if (updated == null)
                return NotFound(new { message = "Note not found or not owned by you" });

            _logger.LogInformation("Note {NoteId} updated by user {UserId}", id, userId);
            return Ok(updated);
        }

        // ── helpers ─────────────────────────────────────────────────────────
        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? string.Empty;
    }
}
