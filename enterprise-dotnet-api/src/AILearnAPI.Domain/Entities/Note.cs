using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// A saved AI explanation belonging to a specific user.
    /// Stored in collection "notes" — scoped per userId.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class Note : BaseEntity
    {
        /// <summary>Internal userId from the Auth collection.</summary>
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>The concept / question topic.</summary>
        [BsonElement("topic")]
        public string Topic { get; set; } = string.Empty;

        /// <summary>Category / subject area (e.g. Frontend, Backend, AI).</summary>
        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;

        /// <summary>The full AI-generated explanation (markdown).</summary>
        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        /// <summary>User-defined tags for organisation.</summary>
        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new();

        [BsonElement("savedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime SavedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("isPinned")]
        public bool IsPinned { get; set; } = false;
    }
}
