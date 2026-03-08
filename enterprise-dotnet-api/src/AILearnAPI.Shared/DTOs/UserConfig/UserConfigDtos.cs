namespace AILearnAPI.Shared.DTOs.UserConfig
{
    /// <summary>Custom provider as returned to the frontend — no API key.</summary>
    public class UserCustomProviderDto
    {
        public string id      { get; set; } = string.Empty;
        public string name    { get; set; } = string.Empty;
        public string baseUrl { get; set; } = string.Empty;
        public string model   { get; set; } = string.Empty;
        public string createdAt { get; set; } = string.Empty;
    }

    public class UserConfigDto
    {
        public string userId          { get; set; } = string.Empty;
        public int    maxTokens       { get; set; } = 2048;
        public string systemPrompt    { get; set; } = string.Empty;
        public Dictionary<string, bool> providerToggles { get; set; } = new();
        public string defaultProvider { get; set; } = "ollama";
        public List<UserCustomProviderDto> customProviders { get; set; } = new();
    }

    public class UpdateUserConfigDto
    {
        public int?                      maxTokens       { get; set; }
        public string?                   systemPrompt    { get; set; }
        public Dictionary<string, bool>? providerToggles { get; set; }
        public string?                   defaultProvider { get; set; }
    }

    public class AddCustomProviderDto
    {
        public string name    { get; set; } = string.Empty;
        public string baseUrl { get; set; } = string.Empty;
        public string apiKey  { get; set; } = string.Empty;
        public string model   { get; set; } = "gpt-4o-mini";
    }

    public class UpdateCustomProviderDto
    {
        public string? name    { get; set; }
        public string? baseUrl { get; set; }
        public string? apiKey  { get; set; }  // null = keep existing
        public string? model   { get; set; }
    }

    public class SetDefaultProviderDto
    {
        public string providerName { get; set; } = "ollama";
    }

    /// <summary>Internal DTO used by AIController to route a custom provider stream.</summary>
    public class CustomProviderStreamInfo
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey  { get; set; } = string.Empty;
        public string Model   { get; set; } = string.Empty;
    }
}
