using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    // AI Provider Settings
    [BsonIgnoreExtraElements]
    public class AIProvider : BaseEntity
    {
        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [BsonElement("enabled")]
        public bool Enabled { get; set; } = false;

        [BsonElement("priority")]
        public int Priority { get; set; } = 0;

        [BsonElement("type")]
        public string Type { get; set; } = "api"; // "local" or "api"

        [BsonElement("endpoint")]
        public string Endpoint { get; set; } = string.Empty;

        [BsonElement("model")]
        public string Model { get; set; } = string.Empty;

        [BsonElement("apiKeys")]
        public List<string> ApiKeys { get; set; } = new List<string>();

        [BsonElement("config")]
        public AIProviderConfig Config { get; set; } = new AIProviderConfig();

        [BsonElement("stats")]
        public AIProviderStats Stats { get; set; } = new AIProviderStats();

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class AIProviderConfig
    {
        [BsonElement("temperature")]
        public double Temperature { get; set; } = 0.7;

        [BsonElement("maxTokens")]
        public int MaxTokens { get; set; } = 2000;

        [BsonElement("stream")]
        public bool Stream { get; set; } = false;

        [BsonElement("maxOutputTokens")]
        public int? MaxOutputTokens { get; set; }

        [BsonElement("max_new_tokens")]
        public int? MaxNewTokens { get; set; }
    }

    public class AIProviderStats
    {
        [BsonElement("totalRequests")]
        public long TotalRequests { get; set; } = 0;

        [BsonElement("successfulRequests")]
        public long SuccessfulRequests { get; set; } = 0;

        [BsonElement("failedRequests")]
        public long FailedRequests { get; set; } = 0;

        [BsonElement("avgResponseTime")]
        public double AvgResponseTime { get; set; } = 0;

        [BsonElement("lastUsed")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? LastUsed { get; set; }
    }

    // Admin User
    [BsonIgnoreExtraElements]
    public class AdminUser : BaseEntity
    {
        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = string.Empty;

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("role")]
        public string Role { get; set; } = "admin";

        [BsonElement("lastLogin")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? LastLogin { get; set; }

        [BsonElement("loginAttempts")]
        public int LoginAttempts { get; set; } = 0;

        [BsonElement("locked")]
        public bool Locked { get; set; } = false;

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
