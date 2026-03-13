using AILearnAPI.Shared.DTOs.InterviewRoadmap;

namespace AILearnAPI.Application.Interfaces
{
    public interface IInterviewRoadmapService
    {
        Task<List<InterviewRoadmapDto>> GetByUserIdAsync(string userId);
        Task<InterviewRoadmapDto?> GetByUserAndStackAsync(string userId, string techStackId);
        /// <summary>Save (create or overwrite) the roadmap for a user+stack pair.</summary>
        Task<InterviewRoadmapDto> SaveAsync(string userId, SaveInterviewRoadmapDto dto);
        /// <summary>Patch done/completedAt for individual topics. Returns null if not found / not owned.</summary>
        Task<InterviewRoadmapDto?> UpdateProgressAsync(string userId, string roadmapId, UpdateProgressDto dto);
        Task<bool> DeleteAsync(string userId, string roadmapId);
    }
}
