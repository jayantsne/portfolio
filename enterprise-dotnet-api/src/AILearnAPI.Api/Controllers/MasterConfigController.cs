using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Global application configuration — accessible by ADMIN role only.
    /// All endpoints require a valid JWT with role=ADMIN.
    /// </summary>
    [ApiController]
    [Route("api/master-config")]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = UserRoles.Admin)]
    public class MasterConfigController : ControllerBase
    {
        private readonly IMasterConfigService _svc;
        private readonly ILogger<MasterConfigController> _logger;

        public MasterConfigController(IMasterConfigService svc, ILogger<MasterConfigController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // GET /api/master-config
        [HttpGet]
        public async Task<ActionResult<MasterConfigDto>> Get()
        {
            try
            {
                var config = await _svc.GetAsync();
                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching master config");
                return StatusCode(500, new { message = "Error fetching master config" });
            }
        }

        // PUT /api/master-config
        [HttpPut]
        public async Task<ActionResult<MasterConfigDto>> Update([FromBody] UpdateMasterConfigDto dto)
        {
            try
            {
                var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                          ?? User.FindFirst("sub")?.Value
                          ?? "unknown";

                var updated = await _svc.UpdateAsync(dto, userId);
                _logger.LogInformation("Master config updated by admin {UserId}", userId);
                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating master config");
                return StatusCode(500, new { message = "Error updating master config" });
            }
        }
    }
}
