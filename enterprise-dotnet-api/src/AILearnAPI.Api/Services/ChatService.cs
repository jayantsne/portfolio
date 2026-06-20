using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.StreamProvider;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using System.Runtime.CompilerServices;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Coordinates chat conversation lifecycle and message persistence.
/// Provider-specific AI streaming lives in <see cref="IChatAiStreamingService"/>.
/// </summary>
public class ChatService : IChatService
{
    private readonly IConversationRepository _conversations;
    private readonly IMessageRepository      _messages;
    private readonly ISemanticMemoryService  _memory;
    private readonly IChatAiStreamingService _aiStreaming;
    private readonly ILogger<ChatService>    _logger;

    public ChatService(
        IConversationRepository conversations,
        IMessageRepository messages,
        ISemanticMemoryService memory,
        IChatAiStreamingService aiStreaming,
        ILogger<ChatService> logger)
    {
        _conversations = conversations;
        _messages      = messages;
        _memory        = memory;
        _aiStreaming   = aiStreaming;
        _logger        = logger;
    }

    public async Task<List<ConversationSummaryDto>> GetUserConversationsAsync(string userId)
    {
        var list = await _conversations.GetByUserIdAsync(userId, limit: 50);
        return list.Select(ToSummaryDto).ToList();
    }

    public async Task<ConversationSummaryDto> CreateConversationAsync(string userId, string title)
    {
        var convo = new Conversation
        {
            UserId = userId,
            Title  = string.IsNullOrWhiteSpace(title) ? "New conversation" : title.Trim()
        };
        await _conversations.CreateAsync(convo);
        return ToSummaryDto(convo);
    }

    public async Task<bool> DeleteConversationAsync(string conversationId, string userId)
    {
        var convo = await _conversations.GetByIdAsync(conversationId);
        if (convo == null || convo.UserId != userId) return false;

        await _conversations.DeleteAsync(conversationId);
        await _messages.DeleteByConversationIdAsync(conversationId);
        return true;
    }

    public async Task<List<ChatMessageDto>?> GetConversationMessagesAsync(
        string conversationId,
        string userId)
    {
        var convo = await _conversations.GetByIdAsync(conversationId);
        if (convo == null || convo.UserId != userId) return null;

        var msgs = await _messages.GetByConversationIdAsync(conversationId);
        return msgs.Select(ToMessageDto).ToList();
    }

    public async Task<ChatSessionDto> PrepareSessionAsync(
        string? conversationId,
        string? userId,
        string? guestId,
        string userMessage,
        CancellationToken ct)
    {
        var isNew = string.IsNullOrEmpty(conversationId);

        if (isNew)
        {
            var convo = CreateConversationEntity(userId, guestId, userMessage);
            await _conversations.CreateAsync(convo);
            conversationId = convo.Id;
        }
        else
        {
            var existing = await _conversations.GetByIdAsync(conversationId!);
            if (existing == null)
            {
                _logger.LogWarning(
                    "PrepareSession: conversation {Id} not found; creating new one",
                    conversationId);

                var fallback = CreateConversationEntity(userId, guestId, userMessage);
                await _conversations.CreateAsync(fallback);
                conversationId = fallback.Id;
                isNew = true;
            }
        }

        await _messages.CreateAsync(new ChatMessage
        {
            ConversationId = conversationId!,
            Role           = "user",
            Content        = userMessage
        });

        return new ChatSessionDto(conversationId!, isNew);
    }

    public async Task<IReadOnlyList<ConversationMessage>> GetHistoryAsync(
        string conversationId,
        int limit = 20)
    {
        var msgs = await _messages.GetRecentAsync(conversationId, limit);
        return msgs.Select(m => new ConversationMessage
        {
            Role    = m.Role,
            Content = m.Content
        }).ToList();
    }

    public async IAsyncEnumerable<string> StreamAiAsync(
        string userMessage,
        string? mode,
        string? toneMode,
        string? model,
        float? temperature,
        int? maxTokens,
        bool rawMode,
        IReadOnlyList<ConversationMessage> history,
        string? userId,
        string? userName,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var request = new ChatAiStreamRequest(
            userMessage,
            mode,
            toneMode,
            model,
            temperature,
            maxTokens,
            rawMode,
            history,
            userId,
            userName);

        await foreach (var token in _aiStreaming.StreamAsync(request, ct))
            yield return token;
    }

    public async Task FinalizeSessionAsync(
        string conversationId,
        string fullResponse,
        string? userId,
        CancellationToken ct)
    {
        await _messages.CreateAsync(new ChatMessage
        {
            ConversationId = conversationId,
            Role           = "assistant",
            Content        = fullResponse
        });

        await _conversations.TouchUpdatedAtAsync(conversationId);

        if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(fullResponse))
        {
            _ = _memory.StoreAsync(userId, fullResponse[..Math.Min(120, fullResponse.Length)], fullResponse)
                       .ContinueWith(t =>
                           _logger.LogWarning(t.Exception, "Memory store failed for user {U}", userId),
                           ct,
                           TaskContinuationOptions.OnlyOnFaulted,
                           TaskScheduler.Default);
        }
    }

    private static Conversation CreateConversationEntity(
        string? userId,
        string? guestId,
        string userMessage)
    {
        return new Conversation
        {
            UserId = userId ?? guestId ?? string.Empty,
            Title  = userMessage.Length > 50 ? userMessage[..50] : userMessage
        };
    }

    private static ConversationSummaryDto ToSummaryDto(Conversation c)
        => new(c.Id, c.Title, c.CreatedAt, c.UpdatedAt);

    private static ChatMessageDto ToMessageDto(ChatMessage m)
        => new(m.Id, m.ConversationId, m.Role, m.Content, m.CreatedAt);
}
