using AILearnAPI.Shared.DTOs.Auth;

namespace AILearnAPI.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthDto?> GetAuthStatusAsync(string userId);
        Task<LoginResponseDto> RegisterAsync(RegisterDto dto);
        Task<LoginResponseDto> LoginAsync(LoginDto dto);
        Task<LoginResponseDto> LoginWithExternalProviderAsync(
            string provider,
            string providerUserId,
            string email,
            string? displayName);
        Task<bool> LogoutAsync(string userId);
        Task InitializeDefaultUserAsync();
        /// <summary>Admin-only: change a user's role.</summary>
        Task<bool> AssignRoleAsync(string targetUserId, string newRole);
        /// <summary>Admin-only: retrieve all users (paginated).</summary>
        Task<List<UserSummaryDto>> GetAllUsersAsync(int skip = 0, int limit = 200);
    }
}
