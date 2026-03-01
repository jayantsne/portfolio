using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.UserConfig;
using AILearnAPI.Shared.Extensions;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class UserConfigService : IUserConfigService
    {
        private readonly IUserConfigRepository _repo;
        private readonly ILogger<UserConfigService> _logger;

        public UserConfigService(
            IUserConfigRepository repo,
            ILogger<UserConfigService> logger)
        {
            _repo   = repo;
            _logger = logger;
        }

        public async Task<UserConfigDto> GetOrCreateAsync(string userId)
        {
            var config = await _repo.GetByUserIdAsync(userId);
            if (config == null)
            {
                config = new UserConfig { UserId = userId };
                await _repo.UpsertAsync(userId, config);
                _logger.LogInformation("Created default UserConfig for {UserId}", userId);
            }
            return config.ToDto();
        }

        public async Task<UserConfigDto> UpdateAsync(string userId, UpdateUserConfigDto dto)
        {
            var config = await _repo.GetByUserIdAsync(userId)
                         ?? new UserConfig { UserId = userId };

            if (dto.maxTokens.HasValue)    config.MaxTokens       = dto.maxTokens.Value;
            if (dto.systemPrompt != null)  config.SystemPrompt    = dto.systemPrompt;
            if (dto.providerToggles != null) config.ProviderToggles = dto.providerToggles;

            var updated = await _repo.UpsertAsync(userId, config);
            _logger.LogInformation("Updated UserConfig for {UserId}", userId);
            return updated.ToDto();
        }
    }
}
