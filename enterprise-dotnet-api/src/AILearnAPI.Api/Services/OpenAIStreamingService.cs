using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AILearnAPI.Api.Models.DTOs;

namespace AILearnAPI.Api.Services
{
    /// <summary>
    /// Calls OpenAI-compatible Chat Completions API with streaming (SSE).
    /// Supports conversation history for multi-turn context (short-term memory).
    /// Emits tokens incrementally; the caller writes each to the HTTP response.
    /// </summary>
    public interface IOpenAIStreamingService
    {
        IAsyncEnumerable<string> StreamAsync(
            string apiKey,
            string baseUrl,
            string model,
            string systemPrompt,
            string userPrompt,
            int maxTokens,
            CancellationToken cancellationToken,
            IReadOnlyList<ConversationMessage>? history = null,
            float temperature = 0.7f);
    }

    public class OpenAIStreamingService : IOpenAIStreamingService
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<OpenAIStreamingService> _logger;

        public OpenAIStreamingService(IHttpClientFactory httpFactory, ILogger<OpenAIStreamingService> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
        }

        public async IAsyncEnumerable<string> StreamAsync(
            string apiKey,
            string baseUrl,
            string model,
            string systemPrompt,
            string userPrompt,
            int maxTokens,
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken,
            IReadOnlyList<ConversationMessage>? history = null,
            float temperature = 0.7f)
        {
            var client = _httpFactory.CreateClient("OpenAI");

            // Build messages array: system → conversation history → current user message
            var messages = new List<object>();

            if (!string.IsNullOrWhiteSpace(systemPrompt))
                messages.Add(new { role = "system", content = systemPrompt });

            // Inject conversation history
            if (history != null)
            {
                foreach (var turn in history)
                    messages.Add(new { role = turn.Role, content = turn.Content });
            }

            messages.Add(new { role = "user", content = userPrompt });

            var requestBody = new
            {
                model,
                messages = messages.ToArray(),
                max_tokens = maxTokens,
                stream = true,
                temperature,
                frequency_penalty = 0.3,
                presence_penalty = 0.1
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/chat/completions");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            req.Content = content;

            HttpResponseMessage response;
            string? connectionError = null;
            try
            {
                response = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI HTTP request failed");
                connectionError = "[ERROR] Could not connect to OpenAI.";
                response = null!;
            }

            if (connectionError != null)
            {
                yield return connectionError;
                yield break;
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("OpenAI returned {Status}: {Body}", (int)response.StatusCode, body);
                var friendlyMsg = (int)response.StatusCode switch
                {
                    429 => "The AI provider is rate-limited right now. Please wait a moment and try again.",
                    401 => "The AI provider API key is invalid or expired. Please update it in Settings.",
                    403 => "Access to this AI provider was denied. Check your API key permissions.",
                    500 or 502 or 503 => "The AI provider is temporarily unavailable. Please try again shortly.",
                    _ => $"The AI provider returned an unexpected error ({(int)response.StatusCode}). Please try again."
                };
                yield return $"[ERROR] {friendlyMsg}";
                yield break;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new System.IO.StreamReader(stream, Encoding.UTF8);

            while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(line)) continue;
                if (!line.StartsWith("data: ")) continue;

                var data = line["data: ".Length..];
                if (data == "[DONE]") yield break;

                string? token = null;
                try
                {
                    using var doc = JsonDocument.Parse(data);
                    token = doc.RootElement
                               .GetProperty("choices")[0]
                               .GetProperty("delta")
                               .GetProperty("content")
                               .GetString();
                }
                catch { /* delta may have no 'content' on first/last chunk */ }

                if (token != null)
                    yield return token;
            }
        }
    }
}