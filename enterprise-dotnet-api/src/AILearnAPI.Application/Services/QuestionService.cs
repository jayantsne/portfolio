using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.Questions;
using AILearnAPI.Shared.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace AILearnAPI.Application.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly IQuestionRepository _questionRepository;
        private readonly ICacheService _cacheService;
        private readonly ILogger<QuestionService> _logger;
        private readonly TimeSpan _questionsCacheDuration;
        private const string AllQuestionsCacheKey = "questions:all";

        public QuestionService(
            IQuestionRepository questionRepository,
            ICacheService cacheService,
            IConfiguration configuration,
            ILogger<QuestionService> logger)
        {
            _questionRepository = questionRepository;
            _cacheService = cacheService;
            _logger = logger;

            // Get cache duration from configuration (default: 120 minutes)
            var cacheMinutes = configuration.GetValue<int>("Redis:QuestionsCacheDurationMinutes", 120);
            _questionsCacheDuration = TimeSpan.FromMinutes(cacheMinutes);
        }

        public async Task<QuestionsResponseDto> GetAllQuestionsAsync()
        {
            // Try to get from cache first
            var cached = await _cacheService.GetAsync<QuestionsResponseDto>(AllQuestionsCacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Returning questions from cache");
                return cached;
            }

            // Cache miss - get from database
            var (questions, total, categoryCount) = await _questionRepository.GetAllWithMetadataAsync();

            var response = new QuestionsResponseDto
            {
                questions = questions.Select(q => q.ToDto()).ToList(),
                total = total,
                categoryCount = categoryCount
            };

            // Store in cache
            await _cacheService.SetAsync(AllQuestionsCacheKey, response, _questionsCacheDuration);
            _logger.LogDebug("Cached questions with {Count} items", total);

            return response;
        }

        public async Task<QuestionDto?> GetQuestionByIdAsync(int id)
        {
            var question = await _questionRepository.GetByQuestionIdAsync(id);
            return question?.ToDto();
        }

        public async Task<QuestionDto> CreateQuestionAsync(CreateQuestionDto dto)
        {
            var nextId = await _questionRepository.GetNextQuestionIdAsync();
            var question = dto.ToEntity(nextId);
            
            var created = await _questionRepository.CreateAsync(question);
            
            _logger.LogInformation("Created question with ID {QuestionId}", created.QuestionId);
            
            // Invalidate cache
            await _cacheService.RemoveAsync(AllQuestionsCacheKey);
            _logger.LogDebug("Invalidated questions cache after create");
            
            return created.ToDto();
        }

        public async Task<QuestionDto?> UpdateQuestionAsync(int id, UpdateQuestionDto dto)
        {
            var existing = await _questionRepository.GetByQuestionIdAsync(id);
            
            if (existing == null)
                return null;

            // Update only provided fields
            if (dto.question != null) existing.QuestionText = dto.question;
            if (dto.answer != null) existing.Answer = dto.answer;
            if (dto.category != null) existing.Category = dto.category;
            if (dto.tags != null) existing.Tags = dto.tags;
            if (dto.difficulty != null) existing.Difficulty = dto.difficulty;
            if (dto.expanded.HasValue) existing.Expanded = dto.expanded.Value;
            if (dto.prompts != null) existing.Prompts = dto.prompts.Select(p => p.ToQuestionPrompt()).ToList();

            var updated = await _questionRepository.UpdateAsync(existing.Id, existing);
            
            _logger.LogInformation("Updated question with ID {QuestionId}", id);
            
            // Invalidate cache
            await _cacheService.RemoveAsync(AllQuestionsCacheKey);
            _logger.LogDebug("Invalidated questions cache after update");
            
            return updated.ToDto();
        }

        public async Task<bool> DeleteQuestionAsync(int id)
        {
            var existing = await _questionRepository.GetByQuestionIdAsync(id);
            
            if (existing == null)
                return false;

            var deleted = await _questionRepository.DeleteAsync(existing.Id);
            
            if (deleted)
            {
                _logger.LogInformation("Deleted question with ID {QuestionId}", id);
                
                // Invalidate cache
                await _cacheService.RemoveAsync(AllQuestionsCacheKey);
                _logger.LogDebug("Invalidated questions cache after delete");
            }
            
            return deleted;
        }

        public async Task<bool> DeleteAllQuestionsAsync()
        {
            try
            {
                await _questionRepository.DeleteAllAsync();
                _logger.LogWarning("Deleted all questions");
                
                // Invalidate cache
                await _cacheService.RemoveAsync(AllQuestionsCacheKey);
                _logger.LogDebug("Invalidated questions cache after delete all");
                
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<(int imported, int failed)> ImportQuestionsAsync(List<QuestionDto> questions)
        {
            try
            {
                var entities = questions.Select(q => q.ToEntity()).ToList();
                var imported = await _questionRepository.InsertManyAsync(entities);
                
                _logger.LogInformation("Imported {Count} questions", imported);
                
                // Invalidate cache
                await _cacheService.RemoveAsync(AllQuestionsCacheKey);
                _logger.LogDebug("Invalidated questions cache after import");
                
                return (imported, 0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to import questions");
                return (0, questions.Count);
            }
        }

        public async Task<QuestionPromptsResponseDto?> GetQuestionPromptsAsync(int id)
        {
            var question = await _questionRepository.GetByQuestionIdAsync(id);
            
            if (question == null)
                return null;

            var response = new QuestionPromptsResponseDto
            {
                QuestionId = question.QuestionId,
                Question = question.QuestionText,
                Category = question.Category,
                Difficulty = question.Difficulty,
                Prompts = question.Prompts.Select(p => new PromptDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Description = p.Description,
                    Icon = p.Icon
                }).ToList()
            };

            return response;
        }

        public async Task<LearnWithAIResponseDto?> GenerateAIResponseAsync(int questionId, string promptId)
        {
            var question = await _questionRepository.GetByQuestionIdAsync(questionId);
            
            if (question == null)
                return null;

            var selectedPrompt = question.Prompts.FirstOrDefault(p => p.Id == promptId);
            
            if (selectedPrompt == null)
                return null;

            // Return the prompt details for frontend to use with AI
            // Frontend will call Claude/Groq/Gemini API directly
            var response = new LearnWithAIResponseDto
            {
                QuestionId = questionId,
                PromptId = selectedPrompt.Id,
                PromptTitle = selectedPrompt.Title,
                Response = selectedPrompt.SystemPrompt + "\n\n" + selectedPrompt.UserPromptTemplate,
                TokensUsed = 0,
                ResponseTimeMs = 0,
                Model = "frontend-ai"
            };

            return response;
        }
    }
}
