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
    /// Per-user AI configuration (max tokens, system prompt, provider toggles, custom providers).
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
        [HttpGet]
        public async Task<ActionResult<UserConfigDto>> Get()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });
            return Ok(await _service.GetOrCreateAsync(userId));
        }

        // ── PUT /api/user-config ─────────────────────────────────────────────
        [HttpPut]
        public async Task<ActionResult<UserConfigDto>> Update([FromBody] UpdateUserConfigDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Token missing userId claim" });
            return Ok(await _service.UpdateAsync(userId, dto));
        }

        // ── PUT /api/user-config/default-provider ────────────────────────────
        /// <summary>Set the active/default provider for this user.</summary>
        [HttpPut("default-provider")]
        public async Task<ActionResult<UserConfigDto>> SetDefaultProvider([FromBody] SetDefaultProviderDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.providerName))
                return BadRequest(new { message = "providerName is required" });
            return Ok(await _service.SetDefaultProviderAsync(userId, dto.providerName));
        }

        // ── GET /api/user-config/custom-providers ────────────────────────────
        [HttpGet("custom-providers")]
        public async Task<ActionResult<List<UserCustomProviderDto>>> GetCustomProviders()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            return Ok(await _service.GetCustomProvidersAsync(userId));
        }

        // ── POST /api/user-config/custom-providers ───────────────────────────
        [HttpPost("custom-providers")]
        public async Task<ActionResult<UserCustomProviderDto>> AddCustomProvider(
            [FromBody] AddCustomProviderDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.name))    return BadRequest(new { message = "name is required" });
            if (string.IsNullOrWhiteSpace(dto.baseUrl)) return BadRequest(new { message = "baseUrl is required" });
            if (string.IsNullOrWhiteSpace(dto.apiKey))  return BadRequest(new { message = "apiKey is required" });
            return Ok(await _service.AddCustomProviderAsync(userId, dto));
        }

        // ── PUT /api/user-config/custom-providers/{id} ───────────────────────
        [HttpPut("custom-providers/{id}")]
        public async Task<ActionResult<UserCustomProviderDto>> UpdateCustomProvider(
            string id, [FromBody] UpdateCustomProviderDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try   { return Ok(await _service.UpdateCustomProviderAsync(userId, id, dto)); }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        }

        // ── DELETE /api/user-config/custom-providers/{id} ────────────────────
        [HttpDelete("custom-providers/{id}")]
        public async Task<IActionResult> DeleteCustomProvider(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var ok = await _service.DeleteCustomProviderAsync(userId, id);
            return ok ? NoContent() : NotFound(new { message = "Provider not found" });
        }

        // ── helpers ──────────────────────────────────────────────────────────
        private string GetUserId() =>
            User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? string.Empty;
    }
}
