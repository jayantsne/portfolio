using AILearnAPI.Shared.DTOs.UserConfig;

namespace AILearnAPI.Application.Interfaces
{
    public interface IUserConfigService
    {
        Task<UserConfigDto> GetOrCreateAsync(string userId);
        Task<UserConfigDto> UpdateAsync(string userId, UpdateUserConfigDto dto);
    }
}
