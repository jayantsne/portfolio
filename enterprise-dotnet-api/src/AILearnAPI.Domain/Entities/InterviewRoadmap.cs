using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// A persisted AI-generated interview-prep roadmap belonging to a single user.
    /// One document per (userId, techStackId) pair — upserted on every save.
    /// Collection name: "interview_roadmaps"
    /// </summary>
    [BsonIgnoreExtraElements]
    public class InterviewRoadmap : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("techStackId")]
        public string TechStackId { get; set; } = string.Empty;   // e.g. "angular"

        [BsonElement("techStackName")]
        public string TechStackName { get; set; } = string.Empty; // e.g. "Angular"

        [BsonElement("techStackIcon")]
        public string TechStackIcon { get; set; } = string.Empty; // e.g. "🅰️"

        [BsonElement("sections")]
        public List<RoadmapSectionData> Sections { get; set; } = new();

        [BsonElement("lastAccessedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class RoadmapSectionData
    {
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("emoji")]
        public string Emoji { get; set; } = string.Empty;

        [BsonElement("expanded")]
        public bool Expanded { get; set; }

        [BsonElement("topics")]
        public List<RoadmapTopicData> Topics { get; set; } = new();
    }

    [BsonIgnoreExtraElements]
    public class RoadmapTopicData
    {
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;

        [BsonElement("text")]
        public string Text { get; set; } = string.Empty;

        [BsonElement("done")]
        public bool Done { get; set; }

        [BsonElement("completedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? CompletedAt { get; set; }
    }
}
