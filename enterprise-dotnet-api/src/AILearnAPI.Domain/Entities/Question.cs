using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class Question : BaseEntity
    {
        [BsonElement("id")]
        public int QuestionId { get; set; }

        [BsonElement("question")]
        public string QuestionText { get; set; } = string.Empty;

        [BsonElement("answer")]
        public string Answer { get; set; } = string.Empty;

        [BsonElement("category")]
        public string Category { get; set; } = string.Empty;

        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new List<string>();

        [BsonElement("difficulty")]
        public string Difficulty { get; set; } = "Medium";

        [BsonElement("dateAdded")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime DateAdded { get; set; } = DateTime.UtcNow;

        [BsonElement("expanded")]
        public bool Expanded { get; set; } = false;
    }
}
