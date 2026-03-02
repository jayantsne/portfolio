namespace AILearnAPI.Shared.DTOs.Questions
{
    /// <summary>
    /// Input DTO for creating or importing a prompt on a question.
    /// Includes server-side fields (systemPrompt, userPromptTemplate) unlike the response-only PromptDto.
    /// </summary>
    public class CreatePromptDto
    {
        public string id { get; set; } = string.Empty;
        public string title { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;
        public string systemPrompt { get; set; } = string.Empty;
        public string userPromptTemplate { get; set; } = string.Empty;
        public string icon { get; set; } = string.Empty;
    }

    public class QuestionDto
    {
        public int id { get; set; }
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string category { get; set; } = string.Empty;
        public List<string> tags { get; set; } = new();
        public string difficulty { get; set; } = string.Empty;
        public DateTime dateAdded { get; set; }
        public bool expanded { get; set; }
        /// <summary>Used during bulk import to seed embedded prompts.</summary>
        public List<CreatePromptDto>? prompts { get; set; }
    }

    public class CreateQuestionDto
    {
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string category { get; set; } = string.Empty;
        public List<string>? tags { get; set; }
        public string? difficulty { get; set; }
        public bool? expanded { get; set; }
        public List<CreatePromptDto>? prompts { get; set; }
    }

    public class UpdateQuestionDto
    {
        public string? question { get; set; }
        public string? answer { get; set; }
        public string? category { get; set; }
        public List<string>? tags { get; set; }
        public string? difficulty { get; set; }
        public bool? expanded { get; set; }
        public List<CreatePromptDto>? prompts { get; set; }
    }

    public class QuestionsResponseDto
    {
        public List<QuestionDto> questions { get; set; } = new();
        public int total { get; set; }
        public Dictionary<string, int> categoryCount { get; set; } = new();
    }

    public class ImportQuestionsDto
    {
        public List<QuestionDto> questions { get; set; } = new();
    }
}
