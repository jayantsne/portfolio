namespace AILearnAPI.Shared.DTOs.Questions
{
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
    }

    public class CreateQuestionDto
    {
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string category { get; set; } = string.Empty;
        public List<string>? tags { get; set; }
        public string? difficulty { get; set; }
        public bool? expanded { get; set; }
    }

    public class UpdateQuestionDto
    {
        public string? question { get; set; }
        public string? answer { get; set; }
        public string? category { get; set; }
        public List<string>? tags { get; set; }
        public string? difficulty { get; set; }
        public bool? expanded { get; set; }
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
