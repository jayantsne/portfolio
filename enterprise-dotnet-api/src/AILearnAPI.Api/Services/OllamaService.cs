using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using AILearnAPI.Api.Models;
using AILearnAPI.Api.Models.DTOs;
using Microsoft.Extensions.Options;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Optimized Ollama service for Claude-quality AI responses
/// Supports multiple models, configurable parameters, and health checks
/// </summary>
public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaService> _logger;
    // Limits concurrent Ollama calls (Ollama handles ~1-2 at a time; queue the rest)
    private readonly SemaphoreSlim _concurrencyGate;

    public OllamaService(
        HttpClient httpClient,
        IOptions<OllamaSettings> settings,
        ILogger<OllamaService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
        _concurrencyGate = new SemaphoreSlim(_settings.MaxConcurrentRequests > 0 ? _settings.MaxConcurrentRequests : 3);
        
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        // Extended timeout for longer responses (5 minutes)
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    /// <summary>
    /// Generate text with full control over model and parameters
    /// Optimized for Claude-quality responses
    /// </summary>
    public async Task<OllamaResponseDto> GenerateAsync(
        string prompt,
        string? model = null,
        float temperature = 0.7f,
        int maxTokens = 2048,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var selectedModel = model ?? _settings.Model;

            var request = new OllamaRequestDto
            {
                Model = selectedModel,
                Prompt = prompt,
                Stream = false,
                Options = new OllamaOptionsDto
                {
                    // Temperature: 0.7 = balanced creativity/consistency
                    // Claude uses similar temperature for educational content
                    Temperature = (int)(temperature * 10), // Ollama expects 0-10 scale
                    NumPredict = maxTokens,
                    // Optimized for speed + quality
                    TopK = 20,       // Narrower beam = faster sampling
                    TopP = 0.85f,    // Focus on high-probability tokens
                    RepeatPenalty = 1.05f // Gentle anti-repetition
                }
            };

            var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });

            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogInformation(
                "🎯 Calling Ollama with model: {Model}, temp: {Temp}, max tokens: {MaxTokens}",
                selectedModel, temperature, maxTokens);

            // Use independent timeout - do NOT use HTTP request's cancellationToken
            // because nginx/client timeout would cancel the Ollama call mid-generation
            using var ollamaCts = new CancellationTokenSource(TimeSpan.FromMinutes(5));

            // Queue request if Ollama is already busy (100-user safety)
            await _concurrencyGate.WaitAsync(cancellationToken);
            try
            {
            var response = await _httpClient.PostAsync("/api/generate", content, ollamaCts.Token);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(ollamaCts.Token);

            var ollamaResponse = JsonSerializer.Deserialize<OllamaResponseDto>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (ollamaResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize Ollama response");
            }

            _logger.LogInformation(
                "✅ Ollama response: {Tokens} tokens, model: {Model}",
                ollamaResponse.Eval_count, ollamaResponse.Model);

            return ollamaResponse;
            }
            finally
            {
                _concurrencyGate.Release();
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ HTTP error calling Ollama API");
            throw new InvalidOperationException($"Failed to call Ollama API: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "⏰ Ollama API call timed out after {Timeout}s", _settings.TimeoutSeconds);
            throw new TimeoutException($"Ollama API call timed out after {_settings.TimeoutSeconds} seconds", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected error calling Ollama API");
            throw;
        }
    }

    /// <summary>
    /// Legacy method for backward compatibility
    /// Uses default settings from configuration
    /// </summary>
    public async Task<OllamaResponseDto> GenerateAsync(string prompt, CancellationToken cancellationToken = default)
    {
        return await GenerateAsync(
            prompt,
            model: _settings.Model,
            temperature: 0.0f,
            maxTokens: _settings.MaxTokens,
            cancellationToken);
    }

    /// <summary>
    /// Stream tokens as they are generated by Ollama (stream: true)
    /// Each yielded string is a single token/word piece
    /// </summary>
    public async IAsyncEnumerable<string> StreamAsync(
        string prompt,
        string? model = null,
        float temperature = 0.7f,
        int maxTokens = 1500,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var selectedModel = model ?? _settings.Model;

        var request = new OllamaRequestDto
        {
            Model = selectedModel,
            Prompt = prompt,
            Stream = true,
            Options = new OllamaOptionsDto
            {
                Temperature = (int)(temperature * 10),
                NumPredict = maxTokens,
                TopK = 20,
                TopP = 0.85f,
                RepeatPenalty = 1.05f
            }
        };

        var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        _logger.LogInformation("⚡ Streaming Ollama: model={Model}, maxTokens={MaxTokens}", selectedModel, maxTokens);

        // Independent 5-min CTS - not tied to HTTP request lifecycle
        using var ollamaCts = new CancellationTokenSource(TimeSpan.FromMinutes(5));

        // Queue if Ollama is already at capacity (100-user safety)
        await _concurrencyGate.WaitAsync(cancellationToken);
        try
        {

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/generate") { Content = content };
        using var response = await _httpClient.SendAsync(
            httpRequest,
            HttpCompletionOption.ResponseHeadersRead,
            ollamaCts.Token);

        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(ollamaCts.Token);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ollamaCts.Token);
            if (string.IsNullOrEmpty(line)) continue;

            OllamaResponseDto? chunk = null;
            try
            {
                chunk = JsonSerializer.Deserialize<OllamaResponseDto>(line,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { continue; }

            if (chunk?.Response != null && chunk.Response.Length > 0)
                yield return chunk.Response;

            if (chunk?.Done == true) break;
        }

        _logger.LogInformation("✅ Stream complete for model: {Model}", selectedModel);
        }
        finally
        {
            _concurrencyGate.Release();
        }
    }


    /// <summary>
    /// Get list of available Ollama models
    /// </summary>
    public async Task<List<string>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("📋 Fetching available Ollama models");

            var response = await _httpClient.GetAsync("/api/tags", cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<OllamaModelsListDto>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var modelNames = result?.Models?.Select(m => m.Name).ToList() ?? new List<string>();

            _logger.LogInformation("✅ Found {Count} Ollama models", modelNames.Count);

            return modelNames;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to fetch Ollama models");
            // Return empty list instead of throwing - graceful degradation
            return new List<string>();
        }
    }

    /// <summary>
    /// Health check for Ollama service
    /// </summary>
    public async Task<bool> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("💊 Checking Ollama health");

            // Quick health check with short timeout
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(5));

            var response = await _httpClient.GetAsync("/api/tags", cts.Token);

            var isHealthy = response.IsSuccessStatusCode;

            _logger.LogInformation(
                isHealthy ? "✅ Ollama is healthy" : "⚠️ Ollama returned non-success status");

            return isHealthy;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ Ollama health check failed");
            return false;
        }
    }
}

/// <summary>
/// Internal DTO for Ollama models list response
/// </summary>
internal class OllamaModelsListDto
{
    public List<OllamaModelDto>? Models { get; set; }
}

internal class OllamaModelDto
{
    public string Name { get; set; } = string.Empty;
    public string? Model { get; set; }
    public long Size { get; set; }
}
