using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class Auth : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("password")]
        public string Password { get; set; } = string.Empty;

        [BsonElement("isAuthenticated")]
        public bool IsAuthenticated { get; set; } = false;

        [BsonElement("lastLogin")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? LastLogin { get; set; }
    }
}
