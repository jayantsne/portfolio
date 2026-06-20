using System.Runtime.CompilerServices;
using AILearnAPI.Api.Services;
using AILearnAPI.Api.StreamProvider;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.StreamProvider;

public class OllamaChatStreamProvider : IChatStreamProvider
{
    public string Name => "ollama";

    private readonly IOllamaService        _ollama;
    private readonly IPromptBuilderService _promptBuilder;

    public OllamaChatStreamProvider(
        IOllamaService ollama,
        IPromptBuilderService promptBuilder)
    {
        _ollama        = ollama;
        _promptBuilder = promptBuilder;
    }

    public async IAsyncEnumerable<string> StreamAsync(
        ChatAiStreamRequest request,
        MasterConfigDto cfg,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var maxTokens = request.MaxTokens;
        var prompt = BuildPrompt(request, cfg, ref maxTokens);

        await foreach (var token in _ollama.StreamAsync(
            prompt,
            request.Model ?? cfg.modelOllamaStream,
            temperature: request.Temperature ?? (float)cfg.defaultTemperature,
            maxTokens: maxTokens ?? 600,
            cancellationToken: ct))
        {
            yield return token;
        }
    }

    private string BuildPrompt(
        ChatAiStreamRequest request,
        MasterConfigDto cfg,
        ref int? maxTokens)
    {
        if (request.RawMode)
            return request.UserMessage;

        var (sys, usr, recommended) = _promptBuilder.Build(
            request.UserMessage,
            request.Mode,
            request.ToneMode,
            cfg,
            request.UserName);

        maxTokens ??= recommended;
        return string.IsNullOrEmpty(sys) ? usr : $"{sys}\n\nUser: {usr}";
    }
}
