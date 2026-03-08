using AILearnAPI.Shared.DTOs.UserConfig;

namespace AILearnAPI.Application.Interfaces
{
    public interface IUserConfigService
    {
        Task<UserConfigDto> GetOrCreateAsync(string userId);
        Task<UserConfigDto> UpdateAsync(string userId, UpdateUserConfigDto dto);

        // ── Default provider ────────────────────────────────────────────────
        Task<UserConfigDto> SetDefaultProviderAsync(string userId, string providerName);

        // ── Custom providers ──────────────────────────────────────────
        Task<List<UserCustomProviderDto>> GetCustomProvidersAsync(string userId);
        Task<UserCustomProviderDto> AddCustomProviderAsync(string userId, AddCustomProviderDto dto);
        Task<UserCustomProviderDto> UpdateCustomProviderAsync(string userId, string providerId, UpdateCustomProviderDto dto);
        Task<bool> DeleteCustomProviderAsync(string userId, string providerId);

        /// <summary>Resolves baseUrl + decrypted API key + model for a custom provider.
        /// Used by AIController when routing stream requests.</summary>
        Task<CustomProviderStreamInfo?> GetCustomProviderStreamInfoAsync(string userId, string providerId);
    }
}
