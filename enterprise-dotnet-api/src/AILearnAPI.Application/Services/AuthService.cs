using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Shared.DTOs.Auth;
using AILearnAPI.Shared.Extensions;
using AILearnAPI.Shared.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IAuthRepository authRepository,
            IConfiguration configuration,
            ILogger<AuthService> logger)
        {
            _authRepository = authRepository;
            _configuration  = configuration;
            _logger         = logger;
        }

        public async Task<AuthDto?> GetAuthStatusAsync(string userId)
        {
            var auth = await _authRepository.GetByUserIdAsync(userId);
            return auth?.ToDto();
        }

        public async Task<LoginResponseDto> RegisterAsync(RegisterDto dto)
        {
            // Validate email is provided
            if (string.IsNullOrWhiteSpace(dto.email))
                throw new InvalidOperationException("Email is required");

            // Check for duplicate email
            if (await _authRepository.EmailExistsAsync(dto.email))
                throw new InvalidOperationException("An account with this email already exists");

            // Optionally check username uniqueness
            if (!string.IsNullOrWhiteSpace(dto.username) && await _authRepository.UsernameExistsAsync(dto.username))
                throw new InvalidOperationException("Username already taken");

            var userCount      = await _authRepository.CountUsersAsync();
            // First user ever registered becomes ADMIN automatically
            var role           = userCount == 0 ? UserRoles.Admin : UserRoles.User;
            var userId         = await _authRepository.GetNextUserIdAsync();
            var hashedPassword = PasswordHelper.HashPassword(dto.password);
            var displayName    = string.IsNullOrWhiteSpace(dto.username) ? dto.email.Split('@')[0] : dto.username;

            var auth = new Auth
            {
                UserId          = userId,
                Username        = displayName,
                Email           = dto.email.ToLowerInvariant(),
                Password        = hashedPassword,
                Role            = role,
                IsAuthenticated = true,
                LastLogin       = DateTime.UtcNow
            };

            await _authRepository.CreateAsync(auth);
            _logger.LogInformation("Registered new user {Email} with ID {UserId} and role {Role}", dto.email, userId, role);

            var token = BuildToken(userId, displayName, auth.Email, role);
            return new LoginResponseDto
            {
                message  = "Registration successful",
                userId   = userId,
                username = displayName,
                email    = auth.Email,
                role     = role,
                token    = token
            };
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            // Look up by email
            var auth = await _authRepository.GetByEmailAsync(dto.email.ToLowerInvariant());

            if (auth == null)
                throw new UnauthorizedAccessException("Invalid email or password");

            // Verify password using BCrypt
            if (!PasswordHelper.VerifyPassword(dto.password, auth.Password))
                throw new UnauthorizedAccessException("Invalid email or password");

            await _authRepository.UpdateAuthenticationStatusAsync(auth.UserId, true);
            _logger.LogInformation("User {Email} logged in successfully", dto.email);

            var token = BuildToken(auth.UserId, auth.Username, auth.Email, auth.Role);
            return new LoginResponseDto
            {
                message  = "Login successful",
                userId   = auth.UserId,
                username = auth.Username,
                email    = auth.Email,
                role     = auth.Role,
                token    = token
            };
        }

        public async Task<bool> LogoutAsync(string userId)
        {
            var updated = await _authRepository.UpdateAuthenticationStatusAsync(userId, false);
            
            if (updated)
                _logger.LogInformation("User {UserId} logged out", userId);
            
            return updated;
        }

        public async Task InitializeDefaultUserAsync()
        {
            var exists = await _authRepository.UsernameExistsAsync("admin");

            if (!exists)
            {
                var hashedPassword = PasswordHelper.HashPassword("admin123");

                var defaultUser = new Auth
                {
                    UserId          = "user_1",
                    Username        = "admin",
                    Email           = "admin@learnwithai.tech",
                    Password        = hashedPassword,
                    Role            = UserRoles.Admin,
                    IsAuthenticated = false,
                    LastLogin       = null
                };

                await _authRepository.CreateAsync(defaultUser);
                _logger.LogInformation("Initialized default admin user (admin@learnwithai.tech / admin123)");
            }
        }
        public async Task<bool> AssignRoleAsync(string targetUserId, string newRole)
        {
            if (!AILearnAPI.Domain.Constants.UserRoles.All.Contains(newRole))
                throw new ArgumentException($"Invalid role '{newRole}'. Valid values: {string.Join(", ", AILearnAPI.Domain.Constants.UserRoles.All)}");

            var updated = await _authRepository.UpdateRoleAsync(targetUserId, newRole);
            if (updated)
                _logger.LogInformation("Role for user {UserId} changed to {Role}", targetUserId, newRole);
            return updated;
        }
        // ── Private helpers ──────────────────────────────────────────────────────

        private string BuildToken(string userId, string username, string email, string role)
        {
            var jwt = _configuration.GetSection("JwtSettings");
            return JwtHelper.GenerateToken(
                userId,
                username,
                email,
                role,
                secretKey:   jwt["SecretKey"]   ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong123456",
                issuer:      jwt["Issuer"]       ?? "AILearnAPI",
                audience:    jwt["Audience"]     ?? "AILearnAPI",
                expiryHours: int.TryParse(jwt["ExpiryHours"], out var h) ? h : 24
            );
        }
    }
}
