using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class Conversation : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = "New conversation";
    }
}
