using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// Global application settings — writable only by ADMIN users.
    /// Only one document lives in the collection (singleton pattern via configId = "global").
    /// All AI configuration (prompts, models, generation, cache, rate limits) lives here
    /// so the admin can tune behaviour at runtime without redeploying.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class MasterConfig : BaseEntity
    {
        [BsonElement("configId")]
        public string ConfigId { get; set; } = "global";

        // ── AI Provider toggles ──────────────────────────────────────────
        [BsonElement("allowedProviders")]
        public List<string> AllowedProviders { get; set; } = new() { "ollama", "groq", "openrouter", "together" };

        // ── AI Provider routing ──────────────────────────────────────────
        [BsonElement("defaultProvider")]
        public string DefaultProvider { get; set; } = "backend";

        [BsonElement("fallbackOrder")]
        public List<string> FallbackOrder { get; set; } = new() { "groq", "backend", "openrouter", "gemini", "huggingface", "together", "ollama" };

        [BsonElement("ollamaEnabled")]
        public bool OllamaEnabled { get; set; } = true;

        // ── AI Model names ────────────────────────────────────────────────
        [BsonElement("modelGroq")]
        public string ModelGroq { get; set; } = "llama-3.3-70b-versatile";

        [BsonElement("modelTogether")]
        public string ModelTogether { get; set; } = "mistralai/Mixtral-8x7B-Instruct-v0.1";

        [BsonElement("modelOpenrouter")]
        public string ModelOpenrouter { get; set; } = "meta-llama/llama-3.1-8b-instruct:free";

        [BsonElement("modelOllamaStream")]
        public string ModelOllamaStream { get; set; } = "qwen2.5:3b-instruct-q4_0";

        [BsonElement("modelOllamaFallbacks")]
        public List<string> ModelOllamaFallbacks { get; set; } = new() { "llama2", "llama3", "mistral", "codellama", "gemma" };

        // ── Default generation parameters ────────────────────────────────
        [BsonElement("defaultMaxTokens")]
        public int DefaultMaxTokens { get; set; } = 2048;

        [BsonElement("defaultTemperature")]
        public double DefaultTemperature { get; set; } = 0.9;

        [BsonElement("topK")]
        public int TopK { get; set; } = 50;

        [BsonElement("topP")]
        public double TopP { get; set; } = 0.98;

        [BsonElement("maxOutputTokens")]
        public int MaxOutputTokens { get; set; } = 1536;

        [BsonElement("maxTokensStream")]
        public int MaxTokensStream { get; set; } = 2048;

        [BsonElement("maxTokensSimplified")]
        public int MaxTokensSimplified { get; set; } = 2048;

        [BsonElement("defaultSystemPrompt")]
        public string DefaultSystemPrompt { get; set; } =
            "You are an expert software engineering mentor. Answer clearly and concisely.";

        /// <summary>
        /// Full prompt template for the main Q&amp;A explain endpoint.
        /// Use {question} as the placeholder — it is replaced at request time.
        /// When empty the built-in Claude-style template is used as fallback.
        /// </summary>
        [BsonElement("mainPromptTemplate")]
        public string MainPromptTemplate { get; set; } = string.Empty;

        // ── AI Prompt templates ───────────────────────────────────────────
        [BsonElement("systemRole")]
        public string SystemRole { get; set; } = "You are an expert technical interviewer and educator. ";

        [BsonElement("promptTypeCode")]
        public string PromptTypeCode { get; set; } = "Provide clear code examples with comments. Focus on practical implementation.";

        [BsonElement("promptTypeConcept")]
        public string PromptTypeConcept { get; set; } = "Explain concepts clearly with real-world analogies. Build from basics to advanced.";

        [BsonElement("promptTypeComparison")]
        public string PromptTypeComparison { get; set; } = "Compare options objectively. Show clear differences with pros/cons.";

        [BsonElement("promptTypeTroubleshooting")]
        public string PromptTypeTroubleshooting { get; set; } = "Diagnose the issue step-by-step. Provide actionable solutions with explanations.";

        [BsonElement("promptTypeDefault")]
        public string PromptTypeDefault { get; set; } = "Provide comprehensive, interview-ready explanations.";

        [BsonElement("formatInstruction")]
        public string FormatInstruction { get; set; } = "\n\nFormat: Use clear sections with headers. Include code examples when relevant. Make it interview-ready and easy to remember.";

        [BsonElement("complexitySimple")]
        public string ComplexitySimple { get; set; } = "\n\nProvide a concise, clear explanation (2-3 paragraphs).";

        [BsonElement("complexityMedium")]
        public string ComplexityMedium { get; set; } = "\n\nProvide a thorough explanation with:\n1. Clear concept overview\n2. Practical examples\n3. Best practices\n4. Common mistakes\n5. Interview preparation tips";

        [BsonElement("complexityComplex")]
        public string ComplexityComplex { get; set; } = "\n\nProvide an in-depth, comprehensive explanation with:\n1. Core concepts and fundamentals\n2. Detailed examples with code (if applicable)\n3. Advanced patterns and best practices\n4. Common pitfalls and how to avoid them\n5. Real-world applications and interview tips";

        // ── Cache settings ────────────────────────────────────────────────
        [BsonElement("cacheEnabled")]
        public bool CacheEnabled { get; set; } = true;

        [BsonElement("cacheDurationHours")]
        public int CacheDurationHours { get; set; } = 24;

        [BsonElement("cacheVersion")]
        public int CacheVersion { get; set; } = 2;

        [BsonElement("cacheKeyPrefix")]
        public string CacheKeyPrefix { get; set; } = "ai_learn_cache_";

        // ── Rate limiting / quotas ────────────────────────────────────────
        [BsonElement("maxRequestsPerUserPerDay")]
        public int MaxRequestsPerUserPerDay { get; set; } = 100;

        [BsonElement("maxRequestsPerMinute")]
        public int MaxRequestsPerMinute { get; set; } = 50;

        [BsonElement("requestDelayMs")]
        public int RequestDelayMs { get; set; } = 1200;

        [BsonElement("maxHistory")]
        public int MaxHistory { get; set; } = 10;

        [BsonElement("enableRateLimiting")]
        public bool EnableRateLimiting { get; set; } = true;

        /// <summary>Per-provider requests-per-minute caps. Key = provider name.</summary>
        [BsonElement("perProviderLimits")]
        public Dictionary<string, int> PerProviderLimits { get; set; } = new()
        {
            ["backend"]     = 30,
            ["groq"]        = 30,
            ["gemini"]      = 60,
            ["huggingface"] = 10,
            ["together"]    = 60,
            ["openrouter"]  = 10,
            ["ollama"]      = 9999,
        };

        /// <summary>Cooldown in milliseconds after hitting a per-provider limit. Key = provider name.</summary>
        [BsonElement("cooldownMs")]
        public Dictionary<string, long> CooldownMs { get; set; } = new()
        {
            ["backend"]     = 60_000,
            ["groq"]        = 60_000,
            ["gemini"]      = 86_400_000,
            ["huggingface"] = 60_000,
            ["together"]    = 60_000,
            ["openrouter"]  = 60_000,
            ["ollama"]      = 0,
        };

        // ── Device-based token limits ─────────────────────────────────────
        /// <summary>
        /// When enabled, the backend enforces per-device maximum token caps.
        /// Limits are applied server-side from the User-Agent header — users cannot bypass them.
        /// </summary>
        [BsonElement("deviceTokenLimitsEnabled")]
        public bool DeviceTokenLimitsEnabled { get; set; } = true;

        [BsonElement("mobileMaxTokens")]
        public int MobileMaxTokens { get; set; } = 250;

        [BsonElement("tabletMaxTokens")]
        public int TabletMaxTokens { get; set; } = 500;

        [BsonElement("desktopMaxTokens")]
        public int DesktopMaxTokens { get; set; } = 1000;

        // ── Feature flags ────────────────────────────────────────────────
        [BsonElement("enableSignup")]
        public bool EnableSignup { get; set; } = true;

        [BsonElement("maintenanceMode")]
        public bool MaintenanceMode { get; set; } = false;

        [BsonElement("maintenanceMessage")]
        public string MaintenanceMessage { get; set; } = "Down for maintenance. Back soon!";

        // ── Audit ────────────────────────────────────────────────────────
        [BsonElement("lastUpdatedBy")]
        public string LastUpdatedBy { get; set; } = string.Empty;

        [BsonElement("lastUpdatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? LastUpdatedAt { get; set; }
    }
}
