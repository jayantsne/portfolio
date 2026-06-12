using System.Runtime.CompilerServices;
using AILearnAPI.Api.Services;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.StreamProvider;

public class OpenAiChatStreamProvider : IChatStreamProvider
{
    public string Name => "openai";

    private readonly IOpenAIStreamingService _openAI;
    private readonly IPromptBuilderService   _promptBuilder;
    private readonly ILlmProviderService     _llmProvider;
    private readonly ISemanticMemoryService  _memory;
    private readonly ISecretProvider         _secrets;

    public OpenAiChatStreamProvider(
        IOpenAIStreamingService openAI,
        IPromptBuilderService promptBuilder,
        ILlmProviderService llmProvider,
        ISemanticMemoryService memory,
        ISecretProvider secrets)
    {
        _openAI        = openAI;
        _promptBuilder = promptBuilder;
        _llmProvider   = llmProvider;
        _memory        = memory;
        _secrets       = secrets;
    }

    public async IAsyncEnumerable<string> StreamAsync(
        ChatAiStreamRequest request,
        MasterConfigDto cfg,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var maxTokens = request.MaxTokens;
        var (systemPrompt, userMessage) = BuildOpenAiMessages(request, cfg, ref maxTokens);

        systemPrompt = await AddSemanticMemoryContextAsync(
            systemPrompt,
            request.UserId,
            request.UserMessage,
            ct);

        var providers = await _llmProvider.GetAllForAdminAsync();
        var prov      = providers.FirstOrDefault(p => p.ProviderName == "openai" && p.Enabled);

        var apiKey = _secrets.GetOptional("OPENAI_API_KEY")
                  ?? _secrets.GetOptional("OpenAI:ApiKey")
                  ?? string.Empty;

        await foreach (var token in _openAI.StreamAsync(
            apiKey,
            prov?.BaseUrl ?? "https://api.openai.com/v1",
            request.Model ?? prov?.Model ?? "gpt-4o-mini",
            systemPrompt,
            userMessage,
            maxTokens ?? 600,
            ct,
            request.History,
            temperature: request.Temperature ?? 0.7f))
        {
            yield return token;
        }
    }

    private (string systemPrompt, string userMessage) BuildOpenAiMessages(
        ChatAiStreamRequest request,
        MasterConfigDto cfg,
        ref int? maxTokens)
    {
        var (sys, _, recommended) = _promptBuilder.Build(
            request.UserMessage,
            request.Mode,
            request.ToneMode,
            cfg,
            request.UserName);

        maxTokens ??= recommended;
        return (sys, request.UserMessage);
    }

    private async Task<string> AddSemanticMemoryContextAsync(
        string systemPrompt,
        string? userId,
        string userMessage,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(userId))
            return systemPrompt;

        var ragContext = await _memory.RetrieveContextAsync(userId, userMessage, 3, ct);
        return string.IsNullOrEmpty(ragContext)
            ? systemPrompt
            : systemPrompt + "\n\n" + ragContext;
    }
}
