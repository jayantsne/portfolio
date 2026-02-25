using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.Auth;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            ILogger<AuthController> logger)
        {
            _authService = authService;
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
                var result = await _authService.RegisterAsync(dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering user");
                return StatusCode(500, new { message = "Error registering user" });
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging in user");
                return StatusCode(500, new { message = "Error logging in" });
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
    }

    public class LogoutDto
    {
        public string userId { get; set; } = string.Empty;
    }
}
