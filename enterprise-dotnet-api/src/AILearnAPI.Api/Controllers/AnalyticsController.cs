using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Analytics;
using AILearnAPI.Domain.Constants;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Analytics tracking and dashboard.
    ///
    /// Public endpoints (no auth):
    ///   POST /api/analytics/visit   — track a page view
    ///   POST /api/analytics/click   — track a click / interaction
    ///
    /// Admin-only endpoints (JWT ADMIN role required):
    ///   GET  /api/analytics/dashboard?days=30   — aggregated metrics
    /// </summary>
    [ApiController]
    [Route("api/analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService          _svc;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(IAnalyticsService svc, ILogger<AnalyticsController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────────
        // POST /api/analytics/visit
        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// Records a page-view event.
        /// Accepts requests from both authenticated and guest users — the
        /// middleware skips X-API-Key checking for this route.
        /// </summary>
        [HttpPost("visit")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackVisit([FromBody] TrackVisitDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SessionId) || string.IsNullOrWhiteSpace(dto.Page))
                return BadRequest(new { error = "sessionId and page are required." });

            var userId   = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("userId")?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value
                        ?? User.FindFirst("username")?.Value;
            var isLoggedIn = !string.IsNullOrEmpty(userId);
            var ip        = GetClientIp();
            var ua        = Request.Headers["User-Agent"].ToString();

            await _svc.TrackVisitAsync(dto, userId, username, isLoggedIn, ip, ua);
            return Ok(new { tracked = true });
        }

        // ─────────────────────────────────────────────────────────────────
        // POST /api/analytics/click
        // ─────────────────────────────────────────────────────────────────
        /// <summary>Records a click / interaction event.</summary>
        [HttpPost("click")]
        [AllowAnonymous]
        public async Task<IActionResult> TrackClick([FromBody] TrackClickDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SessionId) || string.IsNullOrWhiteSpace(dto.EventName))
                return BadRequest(new { error = "sessionId and eventName are required." });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("userId")?.Value;

            await _svc.TrackClickAsync(dto, userId);
            return Ok(new { tracked = true });
        }

        // ─────────────────────────────────────────────────────────────────
        // GET /api/analytics/dashboard?days=30
        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// Returns aggregated analytics for the admin dashboard.
        /// Requires valid JWT with role = ADMIN.
        /// </summary>
        [HttpGet("dashboard")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme,
                   Roles = UserRoles.Admin)]
        public async Task<ActionResult<AnalyticsDashboardDto>> GetDashboard([FromQuery] int days = 30)
        {
            if (days is < 1 or > 365)
                days = 30;

            var result = await _svc.GetDashboardAsync(days);
            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────────
        private string GetClientIp()
        {
            // X-Forwarded-For is populated by nginx in production
            var forwarded = Request.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrEmpty(forwarded))
                return forwarded.Split(',')[0].Trim();

            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
