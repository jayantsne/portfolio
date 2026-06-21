using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Services;

public sealed class FlowOpenAiProvider : IFlowAiProvider
{
    private readonly HttpClient _httpClient;
    private readonly ISecretProvider _secrets;
    private readonly ILogger<FlowOpenAiProvider> _logger;

    public FlowOpenAiProvider(
        HttpClient httpClient,
        ISecretProvider secrets,
        ILogger<FlowOpenAiProvider> logger)
    {
        _httpClient = httpClient;
        _secrets = secrets;
        _logger = logger;
    }

    public async Task<string> GenerateAsync(string prompt, CancellationToken cancellationToken)
    {
        var apiKey = _secrets.GetOptional("OPENAI_API_KEY")
                  ?? _secrets.GetOptional("OpenAI:ApiKey")
                  ?? _secrets.GetOptional("LlmProviders:OpenAI:ApiKey");

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("OpenAI API key is not configured.");

        var baseUrl = _secrets.GetOptional("OpenAI:BaseUrl")
                   ?? _secrets.GetOptional("LlmProviders:OpenAI:BaseUrl")
                   ?? "https://api.openai.com/v1";

        var model = _secrets.GetOptional("OpenAI:Model")
                 ?? _secrets.GetOptional("LlmProviders:OpenAI:Model")
                 ?? "gpt-4o-mini";

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{baseUrl.TrimEnd('/')}/chat/completions");

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model,
            temperature = 0.2,
            max_tokens = 3600,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = "You generate strict JSON for visual technical learning flows. Return JSON only."
                },
                new
                {
                    role = "user",
                    content = prompt
                }
            }
        }), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("OpenAI flow generation failed with status {StatusCode}", (int)response.StatusCode);
            throw new InvalidOperationException("OpenAI flow generation failed.");
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var content = document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
                throw new InvalidOperationException("OpenAI returned an empty flow response.");

            return content;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "OpenAI flow response envelope was invalid JSON");
            throw new InvalidOperationException("OpenAI returned an invalid response envelope.", ex);
        }
    }
}
