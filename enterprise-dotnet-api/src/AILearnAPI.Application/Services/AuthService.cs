using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.Auth;
using AILearnAPI.Shared.Extensions;
using AILearnAPI.Shared.Helpers;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IAuthRepository _authRepository;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IAuthRepository authRepository,
            ILogger<AuthService> logger)
        {
            _authRepository = authRepository;
            _logger = logger;
        }

        public async Task<AuthDto?> GetAuthStatusAsync(string userId)
        {
            var auth = await _authRepository.GetByUserIdAsync(userId);
            return auth?.ToDto();
        }

        public async Task<LoginResponseDto> RegisterAsync(RegisterDto dto)
        {
            // Check if username already exists
            var exists = await _authRepository.UsernameExistsAsync(dto.username);
            if (exists)
            {
                throw new InvalidOperationException("Username already exists");
            }

            // Generate next userId
            var userId = await _authRepository.GetNextUserIdAsync();

            // Hash password using BCrypt (compatible with Node.js bcrypt)
            var hashedPassword = PasswordHelper.HashPassword(dto.password);

            var auth = new Auth
            {
                UserId = userId,
                Username = dto.username,
                Password = hashedPassword,
                IsAuthenticated = true,
                LastLogin = DateTime.UtcNow
            };

            await _authRepository.CreateAsync(auth);

            _logger.LogInformation("Registered new user {Username} with ID {UserId}", dto.username, userId);

            return new LoginResponseDto
            {
                message = "Registration successful",
                userId = userId,
                username = dto.username
            };
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            var auth = await _authRepository.GetByUsernameAsync(dto.username);
            
            if (auth == null)
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            // Verify password using BCrypt
            var isValid = PasswordHelper.VerifyPassword(dto.password, auth.Password);
            
            if (!isValid)
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            // Update authentication status
            await _authRepository.UpdateAuthenticationStatusAsync(auth.UserId, true);

            _logger.LogInformation("User {Username} logged in successfully", dto.username);

            return new LoginResponseDto
            {
                message = "Login successful",
                userId = auth.UserId,
                username = auth.Username
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
            // Check if default user exists
            var exists = await _authRepository.UsernameExistsAsync("admin");
            
            if (!exists)
            {
                var hashedPassword = PasswordHelper.HashPassword("admin123");
                
                var defaultUser = new Auth
                {
                    UserId = "user_1",
                    Username = "admin",
                    Password = hashedPassword,
                    IsAuthenticated = false,
                    LastLogin = null
                };

                await _authRepository.CreateAsync(defaultUser);
                
                _logger.LogInformation("Initialized default admin user");
            }
        }
    }
}
