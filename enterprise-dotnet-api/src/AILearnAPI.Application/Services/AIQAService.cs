using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.AIQA;
using AILearnAPI.Shared.Extensions;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class AIQAService : IAIQAService
    {
        private readonly IAIQARepository _aiqaRepository;
        private readonly ILogger<AIQAService> _logger;

        public AIQAService(
            IAIQARepository aiqaRepository,
            ILogger<AIQAService> logger)
        {
            _aiqaRepository = aiqaRepository;
            _logger = logger;
        }

        public async Task<List<AIQADto>> GetUserAIQAsAsync(string userId)
        {
            var aiqas = await _aiqaRepository.GetByUserIdAsync(userId);
            return aiqas.Select(a => a.ToDto()).ToList();
        }

        public async Task<AIQADto> CreateAIQAAsync(CreateAIQADto dto)
        {
            var aiqa = dto.ToEntity();
            var created = await _aiqaRepository.CreateAsync(aiqa);
            
            _logger.LogInformation("Created AI Q&A for user {UserId}", dto.userId);
            
            return created.ToDto();
        }

        public async Task<bool> DeleteAIQAAsync(string id)
        {
            var deleted = await _aiqaRepository.DeleteAsync(id);
            
            if (deleted)
                _logger.LogInformation("Deleted AI Q&A with ID {Id}", id);
            
            return deleted;
        }

        public async Task<AIQADto?> UpdateAIQAAsync(string id, UpdateAIQADto dto)
        {
            var existing = await _aiqaRepository.GetByIdAsync(id);
            
            if (existing == null)
                return null;

            // Update only provided fields
            if (dto.question != null) existing.Question = dto.question;
            if (dto.answer != null) existing.Answer = dto.answer;
            if (dto.category != null) existing.Category = dto.category;
            if (dto.saved.HasValue) existing.Saved = dto.saved.Value;

            var updated = await _aiqaRepository.UpdateAsync(id, existing);
            
            _logger.LogInformation("Updated AI Q&A with ID {Id}", id);
            
            return updated.ToDto();
        }
    }
}
