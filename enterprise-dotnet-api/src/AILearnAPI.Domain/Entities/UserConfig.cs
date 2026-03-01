using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
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
    }
}
