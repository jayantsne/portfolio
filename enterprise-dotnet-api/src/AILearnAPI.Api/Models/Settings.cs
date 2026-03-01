namespace AILearnAPI.Api.Models;

public class OllamaSettings
{
    public string BaseUrl { get; set; } = "http://127.0.0.1:11434";
    /// <summary>Primary model: qwen2.5:3b — fast, great for technical Q&amp;A</summary>
    public string Model { get; set; } = "qwen2.5:3b-instruct-q4_0";
    /// <summary>Backup model: llama3.2:3b — tutor-style, more explanatory</summary>
    public string BackupModel { get; set; } = "llama3.2:3b";
    public int TimeoutSeconds { get; set; } = 300;
    public int MaxTokens { get; set; } = 1500;
    /// <summary>Max concurrent Ollama requests. Excess requests are queued (not dropped).</summary>
    public int MaxConcurrentRequests { get; set; } = 3;
}

public class ApiSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public int RateLimitPerMinute { get; set; } = 30;
}
