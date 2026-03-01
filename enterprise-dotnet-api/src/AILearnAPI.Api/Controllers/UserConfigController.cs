using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.UserConfig;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Per-user AI configuration (max tokens, system prompt, provider toggles).
    /// All endpoints require a valid JWT  — pass as  Authorization: Bearer {token}
    /// </summary>
    [ApiController]
    [Route("api/user-config")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class UserConfigController : ControllerBase
    {
        private readonly IUserConfigService _service;
        private readonly ILogger<UserConfigController> _logger;

        public UserConfigController(
            IUserConfigService service,
            ILogger<UserConfigController> logger)
        {
            _service = service;
            _logger  = logger;
        }

        // ── GET /api/user-config ─────────────────────────────────────────────
        /// <summary>Load the current user's AI configuration (creates defaults if missing).</summary>
        [HttpGet]
        public async Task<ActionResult<UserConfigDto>> Get()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var config = await _service.GetOrCreateAsync(userId);
            return Ok(config);
        }

        // ── PUT /api/user-config ─────────────────────────────────────────────
        /// <summary>Update one or more config values. Only supplied fields are changed.</summary>
        [HttpPut]
        public async Task<ActionResult<UserConfigDto>> Update([FromBody] UpdateUserConfigDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });

            var config = await _service.UpdateAsync(userId, dto);
            return Ok(config);
        }

        // ── helpers ─────────────────────────────────────────────────────────

        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? string.Empty;
    }
}
