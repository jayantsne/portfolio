using AILearnAPI.Shared.DTOs.UserProgress;

namespace AILearnAPI.Application.Interfaces
{
    public interface IUserProgressService
    {
        Task<UserProgressDto> GetUserProgressAsync(string userId);
        Task<UserProgressDto> UpdateUserProgressAsync(string userId, UpdateUserProgressDto dto);
    }
}
