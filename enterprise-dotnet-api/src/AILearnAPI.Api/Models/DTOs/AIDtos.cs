namespace AILearnAPI.Api.Models.DTOs;

/// <summary>
/// Request from Angular frontend for AI explanation
/// </summary>
public class AIExplanationRequest
{
    /// <summary>
    /// The programming concept or question to explain
    /// </summary>
    public string Question { get; set; } = string.Empty;

    /// <summary>
    /// Provider name (e.g., "ollama")
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// Ollama model to use (e.g., "llama2", "llama3", "mistral")
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Temperature for response generation (0.0 - 1.0)
    /// Higher = more creative, Lower = more focused
    /// Default: 0.7
    /// </summary>
    public float? Temperature { get; set; }

    /// <summary>
    /// Maximum tokens to generate
    /// Default: 2048
    /// </summary>
    public int? MaxTokens { get; set; }

    /// <summary>
    /// When true, <see cref="Question"/> is used as the verbatim prompt — no template wrapping.
    /// Use for raw/custom prompts like note formatting.
    /// </summary>
    public bool RawMode { get; set; } = false;
}

/// <summary>
/// Request for simplified / visual-diagram generation.
/// The <c>Prompt</c> field contains the full pre-built prompt from the frontend.
/// </summary>
public class AiSimplifiedRequest
{
    /// <summary>Full prompt string built by the Angular service (includes instructions + topic).</summary>
    public string Prompt { get; set; } = string.Empty;

    public string? Model       { get; set; }
    public float?  Temperature { get; set; }
    public int?    MaxTokens   { get; set; }
}

/// <summary>
/// Response to Angular frontend with Claude-quality explanation
/// Includes multiple format fields for backward compatibility
/// </summary>
public class AIExplanationResponse
{
    /// <summary>
    /// Success status
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The main explanation text (Claude-style formatted)
    /// </summary>
    public string Explanation { get; set; } = string.Empty;

    /// <summary>
    /// Provider used (e.g., "ollama")
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// Model used (e.g., "llama2", "qwen2.5:7b-instruct")
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Alias for explanation (backward compatibility)
    /// </summary>
    public string? Answer { get; set; }

    /// <summary>
    /// Alias for explanation (backward compatibility)
    /// </summary>
    public string? RawText { get; set; }

    /// <summary>
    /// Alias for explanation (backward compatibility)
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// Number of tokens used in generation
    /// </summary>
    public int TokensUsed { get; set; }

    /// <summary>
    /// Processing time in milliseconds
    /// </summary>
    public long ProcessingTimeMs { get; set; }

    /// <summary>
    /// Response timestamp
    /// </summary>
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Response for available Ollama models
/// </summary>
public class OllamaModelsResponse
{
    public bool Success { get; set; }
    public List<string> Models { get; set; } = new();
    public int Count { get; set; }
}

/// <summary>
/// Health check response for Ollama service
/// </summary>
public class OllamaHealthResponse
{
    public bool Healthy { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
