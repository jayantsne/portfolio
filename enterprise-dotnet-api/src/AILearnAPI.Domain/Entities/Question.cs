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

        [BsonElement("prompts")]
        public List<QuestionPrompt> Prompts { get; set; } = new List<QuestionPrompt>();
    }

    public class QuestionPrompt
    {
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("systemPrompt")]
        public string SystemPrompt { get; set; } = string.Empty;

        [BsonElement("userPromptTemplate")]
        public string UserPromptTemplate { get; set; } = string.Empty;

        [BsonElement("icon")]
        public string Icon { get; set; } = string.Empty;
    }
}
