using AILearnAPI.Shared.DTOs.Questions;

namespace AILearnAPI.Application.Interfaces
{
    public interface IQuestionService
    {
        Task<QuestionsResponseDto> GetAllQuestionsAsync();
        Task<QuestionDto?> GetQuestionByIdAsync(int id);
        Task<QuestionDto> CreateQuestionAsync(CreateQuestionDto dto);
        Task<QuestionDto?> UpdateQuestionAsync(int id, UpdateQuestionDto dto);
        Task<bool> DeleteQuestionAsync(int id);
        Task<bool> DeleteAllQuestionsAsync();
        Task<(int imported, int failed)> ImportQuestionsAsync(List<QuestionDto> questions);
        
        // New methods for AI learning with prompts
        Task<QuestionPromptsResponseDto?> GetQuestionPromptsAsync(int id);
        Task<LearnWithAIResponseDto?> GenerateAIResponseAsync(int questionId, string promptId);
    }
}
