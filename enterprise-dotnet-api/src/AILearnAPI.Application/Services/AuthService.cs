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
        private readonly ISecretProvider _secrets;
        private readonly ISubscriptionService? _subscriptionService;

        public AuthService(
            IAuthRepository authRepository,
            IConfiguration configuration,
            ILogger<AuthService> logger,
            ISecretProvider secrets,
            ISubscriptionService? subscriptionService = null)
        {
            _authRepository      = authRepository;
            _configuration       = configuration;
            _logger              = logger;
            _secrets             = secrets;
            _subscriptionService = subscriptionService;
        }

        public async Task<AuthDto?> GetAuthStatusAsync(string userId)
        {
            var auth = await _authRepository.GetByUserIdAsync(userId);
            return auth?.ToDto();
        }

        public async Task<LoginResponseDto> RegisterAsync(RegisterDto dto)
        {
            // ── Server-side input validation ─────────────────────────────────
            if (string.IsNullOrWhiteSpace(dto.email))
                throw new InvalidOperationException("Email is required.");

            // Basic email format check (no external dependency needed)
            var emailTrimmed = dto.email.Trim().ToLowerInvariant();
            if (!emailTrimmed.Contains('@') || !emailTrimmed.Contains('.'))
                throw new InvalidOperationException("Please enter a valid email address.");

            if (string.IsNullOrWhiteSpace(dto.password))
                throw new InvalidOperationException("Password is required.");

            if (dto.password.Length < 6)
                throw new InvalidOperationException("Password must be at least 6 characters.");

            // ── Duplicate checks (always use normalized email) ────────────────
            if (await _authRepository.EmailExistsAsync(emailTrimmed))
                throw new InvalidOperationException("An account with this email already exists.");

            if (!string.IsNullOrWhiteSpace(dto.username) && await _authRepository.UsernameExistsAsync(dto.username.Trim()))
                throw new InvalidOperationException("Username already taken.");

            var userCount      = await _authRepository.CountUsersAsync();
            // First user ever registered becomes ADMIN automatically
            var role           = userCount == 0 ? UserRoles.Admin : UserRoles.User;
            var userId         = await _authRepository.GetNextUserIdAsync();
            var hashedPassword = PasswordHelper.HashPassword(dto.password);
            var displayName    = string.IsNullOrWhiteSpace(dto.username) ? emailTrimmed.Split('@')[0] : dto.username.Trim();

            var auth = new Auth
            {
                UserId          = userId,
                Username        = displayName,
                Email           = emailTrimmed,      // always lowercase
                Password        = hashedPassword,
                Role            = role,
                IsAuthenticated = true,
                LastLogin       = DateTime.UtcNow
            };

            await _authRepository.CreateAsync(auth);
            _logger.LogInformation("Registered new user {Email} with ID {UserId} and role {Role}", emailTrimmed, userId, role);

            // ── Start free trial ─────────────────────────────────────────────
            if (_subscriptionService != null)
            {
                try   { await _subscriptionService.CreateTrialAsync(userId); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to create trial for {UserId}", userId); }
            }

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
            // ── Server-side validation ────────────────────────────────────────
            if (string.IsNullOrWhiteSpace(dto.email))
                throw new ArgumentException("Email is required.");

            if (string.IsNullOrWhiteSpace(dto.password))
                throw new ArgumentException("Password is required.");

            // Look up by normalized email
            var emailNormalized = dto.email.Trim().ToLowerInvariant();
            var auth = await _authRepository.GetByEmailAsync(emailNormalized);

            if (auth == null)
                throw new UnauthorizedAccessException("Invalid email or password.");

            // Verify password using BCrypt
            if (!PasswordHelper.VerifyPassword(dto.password, auth.Password))
                throw new UnauthorizedAccessException("Invalid email or password.");

            await _authRepository.UpdateAuthenticationStatusAsync(auth.UserId, true);
            _logger.LogInformation("User {Email} logged in successfully", emailNormalized);

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

        public async Task<LoginResponseDto> LoginWithExternalProviderAsync(
            string provider,
            string providerUserId,
            string email,
            string? displayName)
        {
            if (string.IsNullOrWhiteSpace(provider))
                throw new ArgumentException("Provider is required.");

            if (string.IsNullOrWhiteSpace(providerUserId))
                throw new ArgumentException("Provider user id is required.");

            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Email is required.");

            var emailNormalized = email.Trim().ToLowerInvariant();
            if (!emailNormalized.Contains('@') || !emailNormalized.Contains('.'))
                throw new ArgumentException("Google account does not have a valid email address.");

            var auth = await _authRepository.GetByEmailAsync(emailNormalized);

            if (auth == null)
            {
                var userCount   = await _authRepository.CountUsersAsync();
                var role        = userCount == 0 ? UserRoles.Admin : UserRoles.User;
                var userId      = await _authRepository.GetNextUserIdAsync();
                var display     = BuildDisplayName(displayName, emailNormalized);

                auth = new Auth
                {
                    UserId                 = userId,
                    Username               = display,
                    Email                  = emailNormalized,
                    Password               = string.Empty,
                    Role                   = role,
                    AuthProvider           = provider.Trim().ToLowerInvariant(),
                    ExternalProviderUserId = providerUserId,
                    IsAuthenticated        = true,
                    LastLogin              = DateTime.UtcNow
                };

                await _authRepository.CreateAsync(auth);
                _logger.LogInformation(
                    "Registered {Provider} user {Email} with ID {UserId} and role {Role}",
                    provider,
                    emailNormalized,
                    userId,
                    role);

                if (_subscriptionService != null)
                {
                    try   { await _subscriptionService.CreateTrialAsync(userId); }
                    catch (Exception ex) { _logger.LogWarning(ex, "Failed to create trial for {UserId}", userId); }
                }
            }
            else
            {
                await _authRepository.UpdateAuthenticationStatusAsync(auth.UserId, true);
                _logger.LogInformation("{Provider} user {Email} logged in successfully", provider, emailNormalized);
            }

            var token = BuildToken(auth.UserId, auth.Username, auth.Email, auth.Role);
            return new LoginResponseDto
            {
                message  = "Google login successful",
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

        public async Task<List<UserSummaryDto>> GetAllUsersAsync(int skip = 0, int limit = 200)
        {
            var users = await _authRepository.GetAllUsersAsync(skip, limit);
            return users.Select(u => new UserSummaryDto
            {
                UserId          = u.UserId,
                Username        = u.Username,
                Email           = u.Email,
                Role            = u.Role,
                IsAuthenticated = u.IsAuthenticated,
                LastLogin       = u.LastLogin
            }).ToList();
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
                secretKey:   _secrets.GetRequired("JwtSettings:SecretKey"),
                issuer:      jwt["Issuer"]       ?? "AILearnAPI",
                audience:    jwt["Audience"]     ?? "AILearnAPI",
                expiryHours: int.TryParse(jwt["ExpiryHours"], out var h) ? h : 24
            );
        }

        private static string BuildDisplayName(string? displayName, string email)
        {
            var display = string.IsNullOrWhiteSpace(displayName)
                ? email.Split('@')[0]
                : displayName.Trim();

            return display.Length > 80 ? display[..80] : display;
        }
    }
}
