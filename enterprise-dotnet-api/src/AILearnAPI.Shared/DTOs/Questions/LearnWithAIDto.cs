namespace AILearnAPI.Shared.DTOs.Questions
{
    // DTO for prompt information
    public class PromptDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }

    // Response for getting prompts
    public class QuestionPromptsResponseDto
    {
        public int QuestionId { get; set; }
        public string Question { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
        public List<PromptDto> Prompts { get; set; } = new List<PromptDto>();
    }

    // Request for AI learning
    public class LearnWithAIRequestDto
    {
        public int QuestionId { get; set; }
        public string PromptId { get; set; } = string.Empty;
    }

    // Response for AI learning
    public class LearnWithAIResponseDto
    {
        public int QuestionId { get; set; }
        public string PromptId { get; set; } = string.Empty;
        public string PromptTitle { get; set; } = string.Empty;
        public string Response { get; set; } = string.Empty;
        public int TokensUsed { get; set; }
        public double ResponseTimeMs { get; set; }
        public string Model { get; set; } = "claude-3-sonnet";
    }
}
