using MongoDB.Bson.Serialization.Attributes;
using AILearnAPI.Domain.Constants;

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

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>ADMIN or USER — stored in MongoDB and embedded in the JWT.</summary>
        [BsonElement("role")]
        public string Role { get; set; } = UserRoles.User;

        [BsonElement("isAuthenticated")]
        public bool IsAuthenticated { get; set; } = false;

        [BsonElement("lastLogin")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? LastLogin { get; set; }
    }
}
