using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// Represents a configured LLM provider (e.g. OpenAI) stored in MongoDB.
    /// The API key is AES-256-encrypted at rest — never returned to the frontend.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class LlmProvider : BaseEntity
    {
        /// <summary>Canonical slug: "openai", "anthropic", "groq", etc.</summary>
        [BsonElement("provider_name")]
        public string ProviderName { get; set; } = string.Empty;

        /// <summary>Human-readable label shown in admin UI.</summary>
        [BsonElement("display_name")]
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>AES-256 encrypted API key — stored encrypted, decrypted only inside backend services.</summary>
        [BsonElement("api_key_encrypted")]
        public string ApiKeyEncrypted { get; set; } = string.Empty;

        /// <summary>Whether this provider is globally enabled.</summary>
        [BsonElement("enabled")]
        public bool Enabled { get; set; } = false;

        /// <summary>Default model name, e.g. "gpt-4o".</summary>
        [BsonElement("model")]
        public string Model { get; set; } = "gpt-4o";

        /// <summary>OpenAI-compatible base URL (allows Azure OpenAI or other compat. APIs).</summary>
        [BsonElement("base_url")]
        public string BaseUrl { get; set; } = "https://api.openai.com/v1";

        /// <summary>List of userId strings that are allowed to use this provider (empty = admin-only).</summary>
        [BsonElement("allowed_user_ids")]
        public List<string> AllowedUserIds { get; set; } = new();
    }
}
