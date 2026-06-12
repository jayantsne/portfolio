using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AILearnAPI.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Infrastructure.Services
{
    /// <summary>
    /// Generates text embeddings using OpenAI's text-embedding-3-small model.
    /// Registered as Scoped — shares the injected HttpClient.
    /// </summary>
    public class OpenAIEmbeddingService : IEmbeddingService
    {
        private const string EmbeddingModel = "text-embedding-3-small";
        private const string EmbeddingUrl   = "https://api.openai.com/v1/embeddings";

        private readonly IHttpClientFactory _httpFactory;
        private readonly ISecretProvider    _secrets;
        private readonly ILogger<OpenAIEmbeddingService> _logger;

        public OpenAIEmbeddingService(
            IHttpClientFactory httpFactory,
            ISecretProvider secrets,
            ILogger<OpenAIEmbeddingService> logger)
        {
            _httpFactory = httpFactory;
            _secrets     = secrets;
            _logger      = logger;
        }

        public async Task<float[]?> GetEmbeddingAsync(string text, CancellationToken ct = default)
        {
            var apiKey = _secrets.GetOptional("OPENAI_API_KEY")
                      ?? _secrets.GetOptional("LlmProviders:OpenAI:ApiKey")
                      ?? _secrets.GetOptional("OpenAI:ApiKey");

            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogDebug("OpenAI API key not available — skipping embedding");
                return null;
            }

            // Truncate to avoid exceeding the 8192-token input limit
            var input = text.Length > 8000 ? text[..8000] : text;

            try
            {
                var client = _httpFactory.CreateClient("OpenAI");

                var body = JsonSerializer.Serialize(new { model = EmbeddingModel, input });
                using var request = new HttpRequestMessage(HttpMethod.Post, EmbeddingUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = new StringContent(body, Encoding.UTF8, "application/json");

                var response = await client.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Embedding API returned {Status}", (int)response.StatusCode);
                    return null;
                }

                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                var embeddingElement = doc.RootElement
                    .GetProperty("data")[0]
                    .GetProperty("embedding");

                var dims = embeddingElement.GetArrayLength();
                var vector = new float[dims];
                int i = 0;
                foreach (var v in embeddingElement.EnumerateArray())
                    vector[i++] = v.GetSingle();

                return vector;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate embedding");
                return null;
            }
        }
    }
}
