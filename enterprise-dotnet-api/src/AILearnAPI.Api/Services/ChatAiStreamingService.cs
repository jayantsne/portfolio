using System.Runtime.CompilerServices;
using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.StreamProvider;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.MasterConfig;

namespace AILearnAPI.Api.Services;

public record ChatAiStreamRequest(
    string UserMessage,
    string? Mode,
    string? ToneMode,
    string? Model,
    float? Temperature,
    int? MaxTokens,
    bool RawMode,
    IReadOnlyList<ConversationMessage> History,
    string? UserId,
    string? UserName);

public interface IChatAiStreamingService
{
    IAsyncEnumerable<string> StreamAsync(
        ChatAiStreamRequest request,
        CancellationToken ct);
}

/// <summary>
/// Selects a registered chat stream provider and delegates streaming.
/// Provider-specific code lives behind <see cref="IChatStreamProvider"/>.
/// </summary>
public class ChatAiStreamingService : IChatAiStreamingService
{
    private readonly IMasterConfigService _masterConfig;
    private readonly IReadOnlyDictionary<string, IChatStreamProvider> _providers;
    private readonly ILogger<ChatAiStreamingService> _logger;

    public ChatAiStreamingService(
        IMasterConfigService masterConfig,
        IEnumerable<IChatStreamProvider> providers,
        ILogger<ChatAiStreamingService> logger)
    {
        _masterConfig = masterConfig;
        _providers    = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
        _logger       = logger;
    }

    public async IAsyncEnumerable<string> StreamAsync(
        ChatAiStreamRequest request,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var cfg          = await _masterConfig.GetAsync();
        var providerName = SelectProvider(request.UserId);

        _logger.LogInformation(
            "StreamAsync: provider={Provider} mode={Mode} userId={UserId} username={Username}",
            providerName,
            request.Mode ?? "chat",
            request.UserId ?? "guest",
            request.UserName ?? "guest");

        if (!_providers.TryGetValue(providerName, out var provider))
            throw new InvalidOperationException($"Chat stream provider '{providerName}' is not registered.");

        await foreach (var token in provider.StreamAsync(request, cfg, ct))
            yield return token;
    }

    /// <summary>
    /// Route the main chat stream through the server-side OpenAI provider.
    /// The API key stays in backend configuration and is never sent to Angular.
    /// </summary>
    private static string SelectProvider(string? userId) => "openai";
}
