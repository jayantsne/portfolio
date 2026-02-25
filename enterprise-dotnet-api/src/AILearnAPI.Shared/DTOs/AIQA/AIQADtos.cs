namespace AILearnAPI.Shared.DTOs.AIQA
{
    public class AIQADto
    {
        public string _id { get; set; } = string.Empty;
        public string userId { get; set; } = string.Empty;
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string? category { get; set; }
        public bool saved { get; set; }
        public DateTime timestamp { get; set; }
    }

    public class CreateAIQADto
    {
        public string userId { get; set; } = string.Empty;
        public string question { get; set; } = string.Empty;
        public string answer { get; set; } = string.Empty;
        public string? category { get; set; }
        public bool saved { get; set; }
    }

    public class UpdateAIQADto
    {
        public string? question { get; set; }
        public string? answer { get; set; }
        public string? category { get; set; }
        public bool? saved { get; set; }
    }
}
