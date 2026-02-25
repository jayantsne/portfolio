using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class AIQA : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("question")]
        public string Question { get; set; } = string.Empty;

        [BsonElement("answer")]
        public string Answer { get; set; } = string.Empty;

        [BsonElement("category")]
        public string? Category { get; set; }

        [BsonElement("saved")]
        public bool Saved { get; set; } = true;

        [BsonElement("timestamp")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
