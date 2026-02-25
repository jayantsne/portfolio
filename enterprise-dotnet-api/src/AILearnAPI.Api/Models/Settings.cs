namespace AILearnAPI.Api.Models;

public class OllamaSettings
{
    public string BaseUrl { get; set; } = "http://127.0.0.1:11434";
    public string Model { get; set; } = "qwen2.5:7b-instruct-q4_K_M";
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxTokens { get; set; } = 2000;
}

public class ApiSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public int RateLimitPerMinute { get; set; } = 30;
}
