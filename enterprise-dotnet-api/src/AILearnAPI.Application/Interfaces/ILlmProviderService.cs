namespace AILearnAPI.Application.Interfaces
{
    public interface ILlmProviderService
    {
        /// <summary>Get all providers for admin — includes allowed user IDs, no raw key.</summary>
        Task<List<LlmProviderDto>> GetAllForAdminAsync();

        /// <summary>Returns the provider names a given user is allowed to use.</summary>
        Task<List<string>> GetAllowedProviderNamesAsync(string userId, string role);

        /// <summary>Create or overwrite a provider (admin only).</summary>
        Task<LlmProviderDto> UpsertProviderAsync(UpsertLlmProviderRequest req);

        /// <summary>Enable / disable a provider (admin only).</summary>
        Task<bool> SetEnabledAsync(string providerName, bool enabled);

        /// <summary>Grant a user access to a provider.</summary>
        Task<bool> AddAllowedUserAsync(string providerName, string userId);

        /// <summary>Revoke a user's access to a provider.</summary>
        Task<bool> RemoveAllowedUserAsync(string providerName, string userId);

        /// <summary>
        /// Resolve the plain-text API key for an allowed user.
        /// Throws UnauthorizedAccessException if user is not admin and not in allowed list.
        /// Returns null if provider not found or disabled.
        /// </summary>
        Task<string?> ResolveApiKeyAsync(string providerName, string userId, string role);
    }

    // ── DTOs ────────────────────────────────────────────────────────────────

    public class LlmProviderDto
    {
        public string Id { get; set; } = string.Empty;
        public string ProviderName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool Enabled { get; set; }
        public string Model { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public List<string> AllowedUserIds { get; set; } = new();
        // api_key intentionally omitted — never sent to any client
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UpsertLlmProviderRequest
    {
        public string ProviderName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;   // plain-text; will be encrypted before storing
        public string Model { get; set; } = "gpt-4o-mini";
        public string BaseUrl { get; set; } = "https://api.openai.com/v1";
        public bool Enabled { get; set; } = false;
    }
}
