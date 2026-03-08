using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.Questions;
using AILearnAPI.Shared.DTOs.UserProgress;
using AILearnAPI.Shared.DTOs.Auth;
using AILearnAPI.Shared.DTOs.AIQA;
using AILearnAPI.Shared.DTOs.UserConfig;

namespace AILearnAPI.Shared.Extensions
{
    public static class MappingExtensions
    {
        // Question mappings
        public static QuestionDto ToDto(this Question entity)
        {
            return new QuestionDto
            {
                id = entity.QuestionId,
                question = entity.QuestionText,
                answer = entity.Answer,
                category = entity.Category,
                tags = entity.Tags,
                difficulty = entity.Difficulty,
                dateAdded = entity.DateAdded,
                expanded = entity.Expanded
            };
        }

        public static Question ToEntity(this CreateQuestionDto dto, int questionId)
        {
            return new Question
            {
                QuestionId = questionId,
                QuestionText = dto.question,
                Answer = dto.answer,
                Category = dto.category,
                Tags = dto.tags ?? new List<string>(),
                Difficulty = dto.difficulty ?? "medium",
                DateAdded = DateTime.UtcNow,
                Expanded = dto.expanded ?? false,
                Prompts = dto.prompts?.Select(p => p.ToQuestionPrompt()).ToList() ?? new List<QuestionPrompt>()
            };
        }

        public static Question ToEntity(this QuestionDto dto)
        {
            return new Question
            {
                QuestionId = dto.id,
                QuestionText = dto.question,
                Answer = dto.answer,
                Category = dto.category,
                Tags = dto.tags,
                Difficulty = dto.difficulty,
                DateAdded = dto.dateAdded,
                Expanded = dto.expanded,
                Prompts = dto.prompts?.Select(p => p.ToQuestionPrompt()).ToList() ?? new List<QuestionPrompt>()
            };
        }

        public static QuestionPrompt ToQuestionPrompt(this CreatePromptDto dto)
        {
            return new QuestionPrompt
            {
                Id = dto.id,
                Title = dto.title,
                Description = dto.description,
                SystemPrompt = dto.systemPrompt,
                UserPromptTemplate = dto.userPromptTemplate,
                Icon = dto.icon
            };
        }

        // UserProgress mappings
        public static UserProgressDto ToDto(this UserProgress entity)
        {
            return new UserProgressDto
            {
                userId = entity.UserId,
                bookmarks = entity.Bookmarks,
                progress = entity.Progress,
                totalTime = entity.TotalTime,
                lastVisit = entity.LastVisit,
                visitDates = entity.VisitDates
            };
        }

        public static UserProgress ToEntity(this UserProgressDto dto)
        {
            return new UserProgress
            {
                UserId = dto.userId,
                Bookmarks = dto.bookmarks,
                Progress = dto.progress,
                TotalTime = dto.totalTime,
                LastVisit = dto.lastVisit,
                VisitDates = dto.visitDates
            };
        }

        // Auth mappings
        public static AuthDto ToDto(this Auth entity)
        {
            return new AuthDto
            {
                userId          = entity.UserId,
                username        = entity.Username,
                email           = entity.Email,           // was missing
                role            = entity.Role,            // was missing
                isAuthenticated = entity.IsAuthenticated,
                lastLogin       = entity.LastLogin
            };
        }

        // AIQA mappings
        public static AIQADto ToDto(this AIQA entity)
        {
            return new AIQADto
            {
                _id = entity.Id,
                userId = entity.UserId,
                question = entity.Question,
                answer = entity.Answer,
                category = entity.Category,
                saved = entity.Saved,
                timestamp = entity.Timestamp
            };
        }

        public static AIQA ToEntity(this CreateAIQADto dto)
        {
            return new AIQA
            {
                UserId = dto.userId,
                Question = dto.question,
                Answer = dto.answer,
                Category = dto.category,
                Saved = dto.saved,
                Timestamp = DateTime.UtcNow
            };
        }
        // UserConfig mappings
        public static UserConfigDto ToDto(this UserConfig entity)
        {
            return new UserConfigDto
            {
                userId          = entity.UserId,
                maxTokens       = entity.MaxTokens,
                systemPrompt    = entity.SystemPrompt,
                providerToggles = entity.ProviderToggles,
                defaultProvider = entity.DefaultProvider,
                customProviders = entity.CustomProviders.Select(cp => new UserCustomProviderDto
                {
                    id        = cp.Id,
                    name      = cp.Name,
                    baseUrl   = cp.BaseUrl,
                    model     = cp.Model,
                    createdAt = cp.CreatedAt.ToString("o")
                }).ToList()
            };
        }
    }
}
