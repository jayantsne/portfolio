using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Shared.DTOs.Auth;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IMasterConfigService _masterConfig;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IMasterConfigService masterConfig,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _masterConfig = masterConfig;
            _logger = logger;
        }

        // GET /api/auth/{userId} - Check authentication status
        [HttpGet("{userId}")]
        public async Task<ActionResult<AuthDto>> GetAuthStatus(string userId)
        {
            try
            {
                var auth = await _authService.GetAuthStatusAsync(userId);
                
                if (auth == null)
                    return NotFound(new { message = $"User {userId} not found" });
                
                return Ok(auth);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting auth status for {UserId}", userId);
                return StatusCode(500, new { message = "Error fetching auth status" });
            }
        }

        // POST /api/auth/register - Register new user
        [HttpPost("register")]
        public async Task<ActionResult<LoginResponseDto>> Register([FromBody] RegisterDto dto)
        {
            try
            {
                // Honour the DB-driven enableSignup feature flag
                var cfg = await _masterConfig.GetAsync();
                if (cfg != null && !cfg.enableSignup)
                    return StatusCode(403, new { message = "Sign-up is currently disabled. Please contact the administrator." });

                var result = await _authService.RegisterAsync(dto);
                return StatusCode(201, result);   // 201 Created
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering user");
                return StatusCode(500, new { message = "Error registering user." });
            }
        }

        // POST /api/auth/login - Login
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = await _authService.LoginAsync(dto);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });      // 400 for missing input
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });    // 401 for wrong credentials
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging in user");
                return StatusCode(500, new { message = "Error logging in." });
            }
        }

        // POST /api/auth/logout - Logout
        [HttpPost("logout")]
        public async Task<ActionResult> Logout([FromBody] LogoutDto dto)
        {
            try
            {
                var success = await _authService.LogoutAsync(dto.userId);
                
                if (!success)
                    return NotFound(new { message = $"User {dto.userId} not found" });
                
                return Ok(new { message = "Logout successful" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging out user {UserId}", dto.userId);
                return StatusCode(500, new { message = "Error logging out" });
            }
        }

        // POST /api/auth/assign-role  [ADMIN only]
        [HttpPost("assign-role")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = UserRoles.Admin)]
        public async Task<ActionResult> AssignRole([FromBody] AssignRoleDto dto)
        {
            try
            {
                var success = await _authService.AssignRoleAsync(dto.targetUserId, dto.role);
                if (!success)
                    return NotFound(new { message = $"User {dto.targetUserId} not found" });

                return Ok(new { message = $"Role updated to '{dto.role}' for user {dto.targetUserId}" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning role");
                return StatusCode(500, new { message = "Error assigning role" });
            }
        }
    }

    public class LogoutDto
    {
        public string userId { get; set; } = string.Empty;
    }

    public class AssignRoleDto
    {
        public string targetUserId { get; set; } = string.Empty;
        public string role         { get; set; } = string.Empty;
    }
}
