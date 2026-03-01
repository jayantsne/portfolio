using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.Controllers
{
    /// <summary>
    /// Read-only runtime configuration for the Angular frontend.
    /// Returns the global MasterConfig so the client can load prompts,
    /// model names, generation parameters, and cache/rate-limit settings
    /// dynamically from the database instead of using hardcoded values.
    ///
    /// Access: any request that passes the X-API-Key middleware
    ///         (no JWT / no ADMIN role required).
    /// </summary>
    [ApiController]
    [Route("api/app-config")]
    [AllowAnonymous]
    public class AppConfigController : ControllerBase
    {
        private readonly IMasterConfigService _svc;
        private readonly ILogger<AppConfigController> _logger;

        public AppConfigController(IMasterConfigService svc, ILogger<AppConfigController> logger)
        {
            _svc    = svc;
            _logger = logger;
        }

        // GET /api/app-config
        /// <summary>Returns the full runtime configuration (prompts, models, generation, cache, rate limits).</summary>
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
                _logger.LogError(ex, "Error fetching app config");
                return StatusCode(500, new { message = "Error fetching app config" });
            }
        }
    }
}
