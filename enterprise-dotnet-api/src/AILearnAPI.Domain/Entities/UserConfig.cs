using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>Embedded custom provider entry stored inside a user's config document.</summary>
    [BsonIgnoreExtraElements]
    public class UserCustomProvider
    {
        /// <summary>Stable slug — used in defaultProvider value (e.g. "custom:abc123")</summary>
        [BsonElement("id")]
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("baseUrl")]
        public string BaseUrl { get; set; } = string.Empty;

        [BsonElement("model")]
        public string Model { get; set; } = "gpt-4o";

        /// <summary>AES-256-GCM encrypted — never returned to frontend.</summary>
        [BsonElement("apiKeyEncrypted")]
        public string ApiKeyEncrypted { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [BsonIgnoreExtraElements]
    public class UserConfig : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>Maximum tokens the model should generate per response</summary>
        [BsonElement("maxTokens")]
        public int MaxTokens { get; set; } = 2048;

        /// <summary>Custom system prompt prepended to every AI request for this user</summary>
        [BsonElement("systemPrompt")]
        public string SystemPrompt { get; set; } = string.Empty;

        /// <summary>Per-provider enable/disable toggles (e.g. "openai": true, "gemini": false)</summary>
        [BsonElement("providerToggles")]
        public Dictionary<string, bool> ProviderToggles { get; set; } = new()
        {
            { "openai",    false },
            { "anthropic", false },
            { "gemini",    false },
            { "groq",      true  },
            { "ollama",    true  }
        };

        /// <summary>Active provider slug: "ollama" | "openai" | "custom:{id}"</summary>
        [BsonElement("defaultProvider")]
        public string DefaultProvider { get; set; } = "ollama";

        /// <summary>User-owned custom provider entries (API keys encrypted).</summary>
        [BsonElement("customProviders")]
        public List<UserCustomProvider> CustomProviders { get; set; } = new();
    }
}
