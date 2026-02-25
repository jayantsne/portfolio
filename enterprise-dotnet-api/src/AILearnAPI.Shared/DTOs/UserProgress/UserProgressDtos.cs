namespace AILearnAPI.Shared.DTOs.UserProgress
{
    public class UserProgressDto
    {
        public string userId { get; set; } = string.Empty;
        public List<int> bookmarks { get; set; } = new();
        public Dictionary<string, int> progress { get; set; } = new();
        public int totalTime { get; set; }
        public DateTime lastVisit { get; set; }
        public List<string> visitDates { get; set; } = new();
    }

    public class UpdateUserProgressDto
    {
        public List<int>? bookmarks { get; set; }
        public Dictionary<string, int>? progress { get; set; }
        public int? totalTime { get; set; }
        public List<string>? visitDates { get; set; }
    }
}
