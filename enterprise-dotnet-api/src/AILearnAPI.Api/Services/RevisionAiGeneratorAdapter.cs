using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Services
{
    /// <summary>
    /// Adapts <see cref="IOllamaService"/> to the application-layer
    /// <see cref="IRevisionAiGenerator"/> interface so RevisionService
    /// stays independent of API-layer types.
    /// </summary>
    public class RevisionAiGeneratorAdapter : IRevisionAiGenerator
    {
        private readonly IOllamaService _ollama;

        public RevisionAiGeneratorAdapter(IOllamaService ollama) => _ollama = ollama;

        public async Task<string> GenerateAsync(string prompt, CancellationToken ct = default)
        {
            var response = await _ollama.GenerateAsync(
                prompt,
                model:             null,
                temperature:       0.1f,
                maxTokens:         1024,
                cancellationToken: ct);
            return response.Response ?? string.Empty;
        }
    }
}
