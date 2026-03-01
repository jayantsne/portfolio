using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Deployment;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Api.Filters;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Deployment management — triggers backend / frontend deployments.
    ///
    /// SECURITY: Every endpoint in this controller requires:
    ///   1. A valid JWT with role = ADMIN   (enforced by [Authorize])
    ///   2. Request originates from localhost (enforced by [LocalhostOnly])
    ///
    /// Neither condition alone is sufficient — both must be satisfied.
    /// </summary>
    [ApiController]
    [Route("api/deploy")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = UserRoles.Admin)]
    [LocalhostOnly]
    public class DeployController : ControllerBase
    {
        private readonly IDeploymentService _svc;
        private readonly ILogger<DeployController> _logger;

        public DeployController(IDeploymentService svc, ILogger<DeployController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // ────────────────────────────────────────────────────────────────────
        // POST /api/deploy
        // Body: { "target": "backend" | "frontend" }
        // ────────────────────────────────────────────────────────────────────
        /// <summary>
        /// Starts a deployment job for the requested target.
        /// Returns immediately with a logId that can be polled via GET /api/deploy/logs/{id}.
        /// HTTP 202 Accepted.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DeployResponseDto>> Trigger([FromBody] DeployRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.target))
                return BadRequest(new { error = "target is required ('backend' or 'frontend')" });

            var userId   = GetUserId();
            var username = GetUsername();
            var sourceIp = GetClientIp();

            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { error = "Token missing userId claim" });

            try
            {
                var result = await _svc.TriggerDeployAsync(dto.target, userId, username, sourceIp);
                _logger.LogInformation(
                    "[Deploy] {Target} started by {Username} ({UserId}). LogId={LogId}",
                    dto.target, username, userId, result.logId);

                return Accepted(result);   // 202 Accepted
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(503, new { error = ex.Message });
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // GET /api/deploy/logs
        // Returns the 20 most recent deployment log entries.
        // ────────────────────────────────────────────────────────────────────
        [HttpGet("logs")]
        public async Task<ActionResult<List<DeploymentLogDto>>> GetLogs([FromQuery] int limit = 20)
        {
            var logs = await _svc.GetLogsAsync(Math.Clamp(limit, 1, 100));
            return Ok(logs);
        }

        // ────────────────────────────────────────────────────────────────────
        // GET /api/deploy/logs/{id}
        // Poll a specific log entry (use to track running deployments).
        // ────────────────────────────────────────────────────────────────────
        [HttpGet("logs/{id}")]
        public async Task<ActionResult<DeploymentLogDto>> GetLog(string id)
        {
            var log = await _svc.GetLogByIdAsync(id);
            if (log is null) return NotFound(new { error = "Log not found" });
            return Ok(log);
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? string.Empty;

        private string GetUsername() =>
            User.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
             ?? User.FindFirstValue(ClaimTypes.Name)
             ?? "unknown";

        private string GetClientIp() =>
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
