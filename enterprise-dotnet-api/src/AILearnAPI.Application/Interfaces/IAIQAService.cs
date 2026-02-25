using AILearnAPI.Shared.DTOs.AIQA;

namespace AILearnAPI.Application.Interfaces
{
    public interface IAIQAService
    {
        Task<List<AIQADto>> GetUserAIQAsAsync(string userId);
        Task<AIQADto> CreateAIQAAsync(CreateAIQADto dto);
        Task<bool> DeleteAIQAAsync(string id);
        Task<AIQADto?> UpdateAIQAAsync(string id, UpdateAIQADto dto);
    }
}
