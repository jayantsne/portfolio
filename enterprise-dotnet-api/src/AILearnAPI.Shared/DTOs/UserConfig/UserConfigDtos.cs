namespace AILearnAPI.Shared.DTOs.UserConfig
{
    public class UserConfigDto
    {
        public string userId          { get; set; } = string.Empty;
        public int    maxTokens       { get; set; } = 2048;
        public string systemPrompt    { get; set; } = string.Empty;
        public Dictionary<string, bool> providerToggles { get; set; } = new();
    }

    public class UpdateUserConfigDto
    {
        public int?                      maxTokens       { get; set; }
        public string?                   systemPrompt    { get; set; }
        public Dictionary<string, bool>? providerToggles { get; set; }
    }
}
