using System.Text;
using System.Text.Json;
using AILearnAPI.Api.Models;
using AILearnAPI.Api.Models.DTOs;
using Microsoft.Extensions.Options;

namespace AILearnAPI.Api.Services;

public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaService> _logger;

    public OllamaService(
        HttpClient httpClient,
        IOptions<OllamaSettings> settings,
        ILogger<OllamaService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
        
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    public async Task<OllamaResponseDto> GenerateAsync(string prompt, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new OllamaRequestDto
            {
                Model = _settings.Model,
                Prompt = prompt,
                Stream = false,
                Options = new OllamaOptionsDto
                {
                    Temperature = 0,
                    NumPredict = _settings.MaxTokens
                }
            };

            var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogInformation("Calling Ollama API with model {Model}", _settings.Model);

            var response = await _httpClient.PostAsync("/api/generate", content, cancellationToken);

            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            var ollamaResponse = JsonSerializer.Deserialize<OllamaResponseDto>(responseJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (ollamaResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize Ollama response");
            }

            _logger.LogInformation("Ollama API call successful. Tokens: {Tokens}", ollamaResponse.Eval_count);

            return ollamaResponse;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error calling Ollama API");
            throw new InvalidOperationException($"Failed to call Ollama API: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Ollama API call timed out");
            throw new TimeoutException("Ollama API call timed out", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Ollama API");
            throw;
        }
    }
}
