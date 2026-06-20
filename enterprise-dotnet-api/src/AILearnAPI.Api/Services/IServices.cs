using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Services;

public interface IOllamaService
{
    /// <summary>
    /// Generate text with specific model and parameters
    /// </summary>
    Task<OllamaResponseDto> GenerateAsync(
        string prompt,
        string? model = null,
        float temperature = 0.7f,
        int maxTokens = 2048,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Legacy method for backward compatibility
    /// </summary>
    Task<OllamaResponseDto> GenerateAsync(string prompt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get list of available Ollama models on server
    /// </summary>
    Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if Ollama service is healthy and responsive
    /// </summary>
    Task<bool> HealthCheckAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Stream tokens from Ollama using Server-Sent Events (stream: true)
    /// Yields each text token as it is generated
    /// </summary>
    IAsyncEnumerable<string> StreamAsync(
        string prompt,
        string? model = null,
        float temperature = 0.7f,
        int maxTokens = 512,
        string? systemPrompt = null,
        CancellationToken cancellationToken = default);
}

public interface ILearningService
{
    Task<LearnResponseDto> GenerateLearningContentAsync(LearnRequestDto request, CancellationToken cancellationToken = default);
}
