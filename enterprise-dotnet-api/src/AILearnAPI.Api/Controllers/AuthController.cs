using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using AILearnAPI.Api.Services;
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
        private readonly IGoogleOAuthService _googleOAuthService;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IMasterConfigService masterConfig,
            IGoogleOAuthService googleOAuthService,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _masterConfig = masterConfig;
            _googleOAuthService = googleOAuthService;
            _configuration = configuration;
            _environment = environment;
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
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> Register([FromBody] RegisterDto dto)
        {
            try
            {
                // Honour the DB-driven enableSignup feature flag
                var cfg = await _masterConfig.GetAsync();
                if (cfg != null && !cfg.enableSignup)
                    return StatusCode(403, new { message = "Sign-up is currently disabled. Please contact the administrator." });

                var result = await _authService.RegisterAsync(dto);
                SetAuthCookie(result.token);
                result.token = string.Empty;
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
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto dto)
        {
            try
            {
                var result = await _authService.LoginAsync(dto);
                SetAuthCookie(result.token);
                result.token = string.Empty;
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

        // GET /api/auth/google/start - Start backend-owned Google OAuth code flow.
        [HttpGet("google/start")]
        [AllowAnonymous]
        public IActionResult StartGoogleLogin([FromQuery] string? returnUrl)
        {
            var state = CreateState();
            SetOAuthCookie("ailearn_google_oauth_state", state);
            SetOAuthCookie("ailearn_google_return_url", NormalizeReturnUrl(returnUrl));

            var redirectUri = GetGoogleRedirectUri();
            var authUrl = _googleOAuthService.BuildAuthorizationUrl(redirectUri, state);
            return Redirect(authUrl);
        }

        // GET /api/auth/google/callback - Google redirects here with an authorization code.
        [HttpGet("google/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback(
            [FromQuery] string? code,
            [FromQuery] string? state,
            [FromQuery] string? error,
            CancellationToken cancellationToken)
        {
            var frontendBaseUrl = GetFrontendBaseUrl();
            var returnUrl = NormalizeReturnUrl(Request.Cookies["ailearn_google_return_url"]);

            ClearOAuthCookies();

            if (!string.IsNullOrWhiteSpace(error))
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, false, "Google sign-in was cancelled."));

            var hasExpectedStateCookie = Request.Cookies.TryGetValue("ailearn_google_oauth_state", out var expectedState);
            if (string.IsNullOrWhiteSpace(state) ||
                !hasExpectedStateCookie ||
                string.IsNullOrWhiteSpace(expectedState) ||
                !FixedTimeEquals(state, expectedState))
            {
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, false, "Google sign-in state is invalid."));
            }

            try
            {
                _logger.LogInformation("Google login request received.");
                var identity = await _googleOAuthService.ExchangeCodeAsync(
                    code ?? string.Empty,
                    GetGoogleRedirectUri(),
                    cancellationToken);

                var result = await _authService.LoginWithExternalProviderAsync(
                    "google",
                    identity.UserId,
                    identity.Email,
                    identity.DisplayName);

                SetAuthCookie(result.token);
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, true, null));
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Google login request was invalid.");
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, false, ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Google login token validation failed.");
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, false, ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging in with Google");
                return Redirect(BuildFrontendAuthRedirect(frontendBaseUrl, returnUrl, false, "Error logging in with Google."));
            }
        }

        // GET /api/auth/me - Resolve the current HttpOnly cookie session for the SPA.
        [HttpGet("me")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public ActionResult<LoginResponseDto> Me()
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("userId");
            var username = User.FindFirstValue(JwtRegisteredClaimNames.UniqueName)
                           ?? User.FindFirstValue(ClaimTypes.Name)
                           ?? User.FindFirstValue("username")
                           ?? string.Empty;
            var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
                        ?? User.FindFirstValue(ClaimTypes.Email)
                        ?? string.Empty;
            var role = User.FindFirstValue(ClaimTypes.Role) ?? UserRoles.User;

            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(email))
                return Unauthorized(new { message = "Session is invalid." });

            return Ok(new LoginResponseDto
            {
                message = "Session active",
                userId = userId,
                username = username,
                email = email,
                role = role,
                token = string.Empty
            });
        }

        // POST /api/auth/logout - Logout
        [HttpPost("logout")]
        public async Task<ActionResult> Logout([FromBody] LogoutDto dto)
        {
            try
            {
                var success = await _authService.LogoutAsync(dto.userId);
                ClearAuthCookie();
                
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
                // Prevent self-demotion (safety guardrail)
                var callerId = User.Claims.FirstOrDefault(c => c.Type == "userId")?.Value;
                if (callerId == dto.targetUserId && dto.role != UserRoles.Admin)
                    return BadRequest(new { message = "Admins cannot remove their own ADMIN role." });

                var success = await _authService.AssignRoleAsync(dto.targetUserId, dto.role);
                if (!success)
                    return NotFound(new { message = $"User {dto.targetUserId} not found" });

                _logger.LogInformation("Admin {Caller} changed role of {Target} to {Role}", callerId, dto.targetUserId, dto.role);
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

        // GET /api/auth/admin/users?skip=0&limit=100  [ADMIN only]
        /// <summary>Returns a paginated list of all registered users (admin only).</summary>
        [HttpGet("admin/users")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = UserRoles.Admin)]
        public async Task<ActionResult<List<UserSummaryDto>>> GetAllUsers(
            [FromQuery] int skip  = 0,
            [FromQuery] int limit = 100)
        {
            try
            {
                limit = Math.Clamp(limit, 1, 500); // safety cap
                var users = await _authService.GetAllUsersAsync(skip, limit);
                return Ok(new { total = users.Count, users });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user list");
                return StatusCode(500, new { message = "Error fetching users" });
            }
        }

    private void SetAuthCookie(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return;

        var expiryHours = int.TryParse(_configuration["JwtSettings:ExpiryHours"], out var hours) ? hours : 24;
        Response.Cookies.Append("ailearn_auth", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment() || Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddHours(expiryHours)
        });
    }

    private void ClearAuthCookie()
    {
        Response.Cookies.Delete("ailearn_auth", new CookieOptions { Path = "/" });
    }

    private void SetOAuthCookie(string name, string value)
    {
        Response.Cookies.Append(name, value, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment() || Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth/google",
            Expires = DateTimeOffset.UtcNow.AddMinutes(10)
        });
    }

    private void ClearOAuthCookies()
    {
        var options = new CookieOptions { Path = "/api/auth/google" };
        Response.Cookies.Delete("ailearn_google_oauth_state", options);
        Response.Cookies.Delete("ailearn_google_return_url", options);
    }

    private string GetGoogleRedirectUri()
    {
        var configured = _configuration["GoogleOAuth:RedirectUri"];
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        return $"{Request.Scheme}://{Request.Host}/api/auth/google/callback";
    }

    private string GetFrontendBaseUrl()
    {
        return (_configuration["GoogleOAuth:FrontendBaseUrl"] ?? "http://localhost:4200").TrimEnd('/');
    }

    private static string BuildFrontendAuthRedirect(string frontendBaseUrl, string returnUrl, bool success, string? error)
    {
        var query = $"success={(success ? "1" : "0")}&returnUrl={Uri.EscapeDataString(returnUrl)}";
        if (!string.IsNullOrWhiteSpace(error))
            query += $"&error={Uri.EscapeDataString(error)}";

        return $"{frontendBaseUrl}/#/auth/google/callback?{query}";
    }

    private static string NormalizeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
            return "/explore";

        return returnUrl.StartsWith("/", StringComparison.Ordinal) &&
               !returnUrl.StartsWith("//", StringComparison.Ordinal)
            ? returnUrl
            : "/explore";
    }

    private static string CreateState()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = System.Text.Encoding.UTF8.GetBytes(left);
        var rightBytes = System.Text.Encoding.UTF8.GetBytes(right);
        return leftBytes.Length == rightBytes.Length &&
               CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
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
