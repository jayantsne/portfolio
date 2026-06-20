using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class ChatMessage : BaseEntity
    {
        [BsonElement("conversationId")]
        public string ConversationId { get; set; } = string.Empty;

        /// <summary>"user" or "assistant"</summary>
        [BsonElement("role")]
        public string Role { get; set; } = string.Empty;

        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime? Timestamp { get; set; }
    }
}
