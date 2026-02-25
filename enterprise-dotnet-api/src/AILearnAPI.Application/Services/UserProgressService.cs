using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.UserProgress;
using AILearnAPI.Shared.Extensions;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class UserProgressService : IUserProgressService
    {
        private readonly IUserProgressRepository _userProgressRepository;
        private readonly ILogger<UserProgressService> _logger;

        public UserProgressService(
            IUserProgressRepository userProgressRepository,
            ILogger<UserProgressService> logger)
        {
            _userProgressRepository = userProgressRepository;
            _logger = logger;
        }

        public async Task<UserProgressDto> GetUserProgressAsync(string userId)
        {
            var progress = await _userProgressRepository.GetOrCreateAsync(userId);
            return progress.ToDto();
        }

        public async Task<UserProgressDto> UpdateUserProgressAsync(string userId, UpdateUserProgressDto dto)
        {
            var existing = await _userProgressRepository.GetByUserIdAsync(userId);
            
            // Create new progress object with updates
            var progress = new Domain.Entities.UserProgress
            {
                UserId = userId,
                Bookmarks = dto.bookmarks ?? existing?.Bookmarks ?? new List<int>(),
                Progress = dto.progress ?? existing?.Progress ?? new Dictionary<string, int>(),
                TotalTime = dto.totalTime ?? existing?.TotalTime ?? 0,
                LastVisit = DateTime.UtcNow,
                VisitDates = dto.visitDates ?? existing?.VisitDates ?? new List<string>()
            };

            // Add current visit date if not already present
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            if (!progress.VisitDates.Contains(today))
            {
                progress.VisitDates.Add(today);
            }

            var updated = await _userProgressRepository.UpsertAsync(userId, progress);
            
            _logger.LogInformation("Updated progress for user {UserId}", userId);
            
            return updated.ToDto();
        }
    }
}
