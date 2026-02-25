using AILearnAPI.Api.Models;

namespace AILearnAPI.Api.Repositories;

/// <summary>
/// Repository interface for AiTopicPrompts
/// </summary>
public interface IAiTopicPromptRepository
{
    Task<AiTopicPrompt?> GetByTopicAndExamAsync(string topicName, string examCode);
    Task<IEnumerable<AiTopicPrompt>> GetAllByExamCodeAsync(string examCode);
    Task<AiTopicPrompt?> GetByIdAsync(string id);
    Task<IEnumerable<AiTopicPrompt>> GetAllAsync();
}
