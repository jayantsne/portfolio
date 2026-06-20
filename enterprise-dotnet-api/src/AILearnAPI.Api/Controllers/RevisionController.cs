using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Revision;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Spaced-repetition revision system for saved notes.
    /// All endpoints require a valid JWT.
    /// Operations are scoped to the authenticated user — cross-user access is impossible.
    /// </summary>
    [ApiController]
    [Route("api/revision")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class RevisionController : ControllerBase
    {
        private readonly IRevisionService            _svc;
        private readonly ILogger<RevisionController> _logger;

        public RevisionController(IRevisionService svc, ILogger<RevisionController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // ── GET /api/revision/today ───────────────────────────────────────────
        /// <summary>Returns all revision items due today for the authenticated user.</summary>
        [HttpGet("today")]
        [ProducesResponseType(typeof(TodayRevisionDto), 200)]
        public async Task<IActionResult> GetToday(CancellationToken ct)
        {
            try
            {
                var result = await _svc.GetTodayRevisionAsync(GetUserId());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetToday failed for user {User}", GetUserId());
                return StatusCode(500, new { error = "Failed to load today's revision." });
            }
        }

        // ── GET /api/revision/enrolled ────────────────────────────────────────
        /// <summary>Returns all enrolled notes with spaced-repetition state.</summary>
        [HttpGet("enrolled")]
        [ProducesResponseType(typeof(EnrolledNotesDto), 200)]
        public async Task<IActionResult> GetEnrolled(CancellationToken ct)
        {
            try
            {
                var result = await _svc.GetEnrolledAsync(GetUserId());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetEnrolled failed for user {User}", GetUserId());
                return StatusCode(500, new { error = "Failed to load enrolled notes." });
            }
        }

        // ── POST /api/revision/enroll ─────────────────────────────────────────
        /// <summary>Enrols a note in spaced-repetition. Idempotent.</summary>
        [HttpPost("enroll")]
        [ProducesResponseType(typeof(RevisionItemDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Enroll([FromBody] EnrollNoteDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _svc.EnrollNoteAsync(GetUserId(), dto.NoteId);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { error = "Note not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Enroll failed for note {NoteId}", dto.NoteId);
                return StatusCode(500, new { error = "Failed to enrol note." });
            }
        }

        // ── DELETE /api/revision/enroll/{noteId} ─────────────────────────────
        /// <summary>Removes a note from spaced repetition.</summary>
        [HttpDelete("enroll/{noteId}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> Unenroll(string noteId, CancellationToken ct)
        {
            var removed = await _svc.UnenrollNoteAsync(GetUserId(), noteId);
            return removed ? NoContent() : NotFound(new { error = "Note not enrolled." });
        }

        // ── GET /api/revision/{noteId}/questions ──────────────────────────────
        /// <summary>
        /// Generates 3–5 AI questions for the note.
        /// Falls back to template questions when AI is unavailable.
        /// </summary>
        [HttpGet("{noteId}/questions")]
        [ProducesResponseType(typeof(RevisionQuestionsResponseDto), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetQuestions(string noteId, CancellationToken ct)
        {
            try
            {
                var result = await _svc.GetQuestionsAsync(GetUserId(), noteId);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { error = "Note not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetQuestions failed for note {NoteId}", noteId);
                return StatusCode(500, new { error = "Failed to generate questions." });
            }
        }

        // ── POST /api/revision/{revisionItemId}/feedback ──────────────────────
        /// <summary>
        /// Records the user's self-assessed difficulty and reschedules the next review.
        /// </summary>
        [HttpPost("{revisionItemId}/feedback")]
        [ProducesResponseType(typeof(RevisionItemDto), 200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> SubmitFeedback(
            string revisionItemId,
            [FromBody] SubmitFeedbackDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _svc.SubmitFeedbackAsync(GetUserId(), revisionItemId, dto.Difficulty);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { error = "Revision item not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SubmitFeedback failed for item {Id}", revisionItemId);
                return StatusCode(500, new { error = "Failed to save feedback." });
            }
        }

        // ── Private helpers ───────────────────────────────────────────────────

        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
         ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
         ?? string.Empty;
    }
}
