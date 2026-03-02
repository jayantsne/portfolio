namespace AILearnAPI.Shared.DTOs.MasterConfig
{
    /// <summary>Read DTO returned to the client (admin and regular users for app-config endpoint).</summary>
    public class MasterConfigDto
    {
        // ── Provider ─────────────────────────────────────────────────────
        public List<string> allowedProviders     { get; set; } = new();
        public string       defaultProvider      { get; set; } = string.Empty;
        public List<string> fallbackOrder        { get; set; } = new();
        public bool         ollamaEnabled        { get; set; }

        // ── Models ───────────────────────────────────────────────────────
        public string       modelGroq            { get; set; } = string.Empty;
        public string       modelTogether        { get; set; } = string.Empty;
        public string       modelOpenrouter      { get; set; } = string.Empty;
        public string       modelOllamaStream    { get; set; } = string.Empty;
        public List<string> modelOllamaFallbacks { get; set; } = new();

        // ── Generation ───────────────────────────────────────────────────
        public int          defaultMaxTokens     { get; set; }
        public double       defaultTemperature   { get; set; }
        public int          topK                 { get; set; }
        public double       topP                 { get; set; }
        public int          maxOutputTokens      { get; set; }
        public int          maxTokensStream      { get; set; }
        public int          maxTokensSimplified  { get; set; }
        public string       defaultSystemPrompt  { get; set; } = string.Empty;

        // ── Prompts ──────────────────────────────────────────────────────
        public string       systemRole                 { get; set; } = string.Empty;
        public string       promptTypeCode             { get; set; } = string.Empty;
        public string       promptTypeConcept          { get; set; } = string.Empty;
        public string       promptTypeComparison       { get; set; } = string.Empty;
        public string       promptTypeTroubleshooting  { get; set; } = string.Empty;
        public string       promptTypeDefault          { get; set; } = string.Empty;
        public string       formatInstruction          { get; set; } = string.Empty;
        public string       complexitySimple           { get; set; } = string.Empty;
        public string       complexityMedium           { get; set; } = string.Empty;
        public string       complexityComplex          { get; set; } = string.Empty;

        // ── Cache ────────────────────────────────────────────────────────
        public bool         cacheEnabled         { get; set; }
        public int          cacheDurationHours   { get; set; }
        public int          cacheVersion         { get; set; }
        public string       cacheKeyPrefix       { get; set; } = string.Empty;

        // ── Rate limiting ─────────────────────────────────────────────────
        public int                      maxRequestsPerUserPerDay { get; set; }
        public int                      maxRequestsPerMinute     { get; set; }
        public int                      requestDelayMs           { get; set; }
        public int                      maxHistory               { get; set; }
        public bool                     enableRateLimiting       { get; set; }
        public Dictionary<string, int>  perProviderLimits        { get; set; } = new();
        public Dictionary<string, long> cooldownMs               { get; set; } = new();

        // ── Feature flags ─────────────────────────────────────────────────
        public bool         enableSignup         { get; set; }
        public bool         maintenanceMode      { get; set; }
        public string       maintenanceMessage   { get; set; } = string.Empty;
        // ── Device-based token limits ────────────────────────────────────
        public bool         deviceTokenLimitsEnabled { get; set; } = true;
        public int          mobileMaxTokens          { get; set; } = 250;
        public int          tabletMaxTokens          { get; set; } = 500;
        public int          desktopMaxTokens         { get; set; } = 1000;
        // ── Audit ────────────────────────────────────────────────────────
        public string       lastUpdatedBy        { get; set; } = string.Empty;
        public DateTime?    lastUpdatedAt        { get; set; }
    }

    /// <summary>All fields optional — only supplied fields are updated (PATCH semantics).</summary>
    public class UpdateMasterConfigDto
    {
        // ── Provider ─────────────────────────────────────────────────────
        public List<string>? allowedProviders     { get; set; }
        public string?       defaultProvider      { get; set; }
        public List<string>? fallbackOrder        { get; set; }
        public bool?         ollamaEnabled        { get; set; }

        // ── Models ───────────────────────────────────────────────────────
        public string?       modelGroq            { get; set; }
        public string?       modelTogether        { get; set; }
        public string?       modelOpenrouter      { get; set; }
        public string?       modelOllamaStream    { get; set; }
        public List<string>? modelOllamaFallbacks { get; set; }

        // ── Generation ───────────────────────────────────────────────────
        public int?          defaultMaxTokens     { get; set; }
        public double?       defaultTemperature   { get; set; }
        public int?          topK                 { get; set; }
        public double?       topP                 { get; set; }
        public int?          maxOutputTokens      { get; set; }
        public int?          maxTokensStream      { get; set; }
        public int?          maxTokensSimplified  { get; set; }
        public string?       defaultSystemPrompt  { get; set; }

        // ── Prompts ──────────────────────────────────────────────────────
        public string?       systemRole                { get; set; }
        public string?       promptTypeCode            { get; set; }
        public string?       promptTypeConcept         { get; set; }
        public string?       promptTypeComparison      { get; set; }
        public string?       promptTypeTroubleshooting { get; set; }
        public string?       promptTypeDefault         { get; set; }
        public string?       formatInstruction         { get; set; }
        public string?       complexitySimple          { get; set; }
        public string?       complexityMedium          { get; set; }
        public string?       complexityComplex         { get; set; }

        // ── Cache ────────────────────────────────────────────────────────
        public bool?         cacheEnabled         { get; set; }
        public int?          cacheDurationHours   { get; set; }
        public int?          cacheVersion         { get; set; }
        public string?       cacheKeyPrefix       { get; set; }

        // ── Rate limiting ─────────────────────────────────────────────────
        public int?                      maxRequestsPerUserPerDay { get; set; }
        public int?                      maxRequestsPerMinute     { get; set; }
        public int?                      requestDelayMs           { get; set; }
        public int?                      maxHistory               { get; set; }
        public bool?                     enableRateLimiting       { get; set; }
        public Dictionary<string, int>?  perProviderLimits        { get; set; }
        public Dictionary<string, long>? cooldownMs               { get; set; }

        // ── Feature flags ─────────────────────────────────────────────────
        public bool?         enableSignup         { get; set; }
        public bool?         maintenanceMode      { get; set; }
        public string?       maintenanceMessage   { get; set; }
        // ── Device-based token limits ────────────────────────────────────
        public bool? deviceTokenLimitsEnabled { get; set; }
        public int?  mobileMaxTokens          { get; set; }
        public int?  tabletMaxTokens          { get; set; }
        public int?  desktopMaxTokens         { get; set; }    }
}
