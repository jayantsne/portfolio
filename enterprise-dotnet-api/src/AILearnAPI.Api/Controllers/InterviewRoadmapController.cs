using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.InterviewRoadmap;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Saves and retrieves AI-generated interview-prep roadmaps.
    /// All endpoints require a valid JWT (Authorization: Bearer {token}).
    /// Progress is scoped per user — users cannot read or modify each other's roadmaps.
    /// </summary>
    [ApiController]
    [Route("api/interview-roadmap")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class InterviewRoadmapController : ControllerBase
    {
        private readonly IInterviewRoadmapService _svc;
        private readonly ILogger<InterviewRoadmapController> _logger;

        public InterviewRoadmapController(
            IInterviewRoadmapService svc,
            ILogger<InterviewRoadmapController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // GET /api/interview-roadmap
        /// <summary>Returns all roadmaps for the authenticated user (newest-first).</summary>
        [HttpGet]
        public async Task<ActionResult<List<InterviewRoadmapDto>>> GetAll()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var roadmaps = await _svc.GetByUserIdAsync(userId);
            return Ok(roadmaps);
        }

        // GET /api/interview-roadmap/stack/{techStackId}
        /// <summary>Returns the roadmap for a specific tech stack, or 404.</summary>
        [HttpGet("stack/{techStackId}")]
        public async Task<ActionResult<InterviewRoadmapDto>> GetByStack(string techStackId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var rm = await _svc.GetByUserAndStackAsync(userId, techStackId);
            if (rm == null) return NotFound(new { message = $"No roadmap found for stack '{techStackId}'" });
            return Ok(rm);
        }

        // POST /api/interview-roadmap
        /// <summary>Save (create or overwrite) the roadmap for a tech stack.</summary>
        [HttpPost]
        public async Task<ActionResult<InterviewRoadmapDto>> Save([FromBody] SaveInterviewRoadmapDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.techStackId))
                return BadRequest(new { message = "techStackId is required" });
            if (dto.sections == null || dto.sections.Count == 0)
                return BadRequest(new { message = "sections must not be empty" });

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var saved = await _svc.SaveAsync(userId, dto);
            _logger.LogInformation("Roadmap saved for user {UserId}, stack {Stack}", userId, dto.techStackId);
            return CreatedAtAction(nameof(GetByStack),
                new { techStackId = dto.techStackId }, saved);
        }

        // PUT /api/interview-roadmap/{id}/progress
        /// <summary>Patch topic done/completedAt for a roadmap. Returns updated roadmap.</summary>
        [HttpPut("{id}/progress")]
        public async Task<ActionResult<InterviewRoadmapDto>> UpdateProgress(
            string id, [FromBody] UpdateProgressDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var updated = await _svc.UpdateProgressAsync(userId, id, dto);
            if (updated == null)
                return NotFound(new { message = "Roadmap not found or not owned by you" });

            return Ok(updated);
        }

        // DELETE /api/interview-roadmap/{id}
        /// <summary>Delete a roadmap — only if it belongs to the authenticated user.</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var deleted = await _svc.DeleteAsync(userId, id);
            if (!deleted) return NotFound(new { message = "Roadmap not found or not owned by you" });

            return NoContent();
        }

        // ── helpers ──────────────────────────────────────────────────────────
        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? string.Empty;
    }
}
