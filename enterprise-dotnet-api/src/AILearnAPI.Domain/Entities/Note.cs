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

        /// <summary>The full AI-generated explanation (markdown).</summary>
        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("savedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    }
}
