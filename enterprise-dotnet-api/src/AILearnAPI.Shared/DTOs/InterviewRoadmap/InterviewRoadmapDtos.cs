namespace AILearnAPI.Shared.DTOs.InterviewRoadmap
{
    // ── Read DTOs ────────────────────────────────────────────────────────────

    public class InterviewRoadmapDto
    {
        public string   id             { get; set; } = string.Empty;
        public string   userId         { get; set; } = string.Empty;
        public string   techStackId    { get; set; } = string.Empty;
        public string   techStackName  { get; set; } = string.Empty;
        public string   techStackIcon  { get; set; } = string.Empty;
        public List<RoadmapSectionDto> sections { get; set; } = new();
        public int      doneCount      { get; set; }
        public int      totalCount     { get; set; }
        public int      percent        { get; set; }
        public DateTime createdAt      { get; set; }
        public DateTime updatedAt      { get; set; }
        public DateTime lastAccessedAt { get; set; }
    }

    public class RoadmapSectionDto
    {
        public string id       { get; set; } = string.Empty;
        public string title    { get; set; } = string.Empty;
        public string emoji    { get; set; } = string.Empty;
        public bool   expanded { get; set; }
        public List<RoadmapTopicDto> topics { get; set; } = new();
    }

    public class RoadmapTopicDto
    {
        public string    id          { get; set; } = string.Empty;
        public string    text        { get; set; } = string.Empty;
        public bool      done        { get; set; }
        public DateTime? completedAt { get; set; }
    }

    // ── Write DTOs ───────────────────────────────────────────────────────────

    /// <summary>Request body for POST /api/interview-roadmap (create or overwrite).</summary>
    public class SaveInterviewRoadmapDto
    {
        public string techStackId   { get; set; } = string.Empty;
        public string techStackName { get; set; } = string.Empty;
        public string techStackIcon { get; set; } = string.Empty;
        public List<RoadmapSectionDto> sections { get; set; } = new();
    }

    /// <summary>Request body for PUT /api/interview-roadmap/{id}/progress.</summary>
    public class UpdateProgressDto
    {
        public List<TopicProgressItem> topics { get; set; } = new();
    }

    public class TopicProgressItem
    {
        public string id   { get; set; } = string.Empty;
        public bool   done { get; set; }
    }
}
