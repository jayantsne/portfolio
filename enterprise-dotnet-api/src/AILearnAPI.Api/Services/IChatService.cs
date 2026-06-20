using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.StreamProvider;

namespace AILearnAPI.Api.Services;

// ── Service-layer DTOs ────────────────────────────────────────────────────────
// Kept in the same file as the interface so callers have one import.

/// <summary>Summary of a conversation (no messages).</summary>
public record ConversationSummaryDto(string Id, string Title, DateTime CreatedAt, DateTime UpdatedAt);

/// <summary>A single chat message as returned to callers.</summary>
public record ChatMessageDto(string Id, string ConversationId, string Role, string Content, DateTime CreatedAt);

/// <summary>
/// Returned by <see cref="IChatService.PrepareSessionAsync"/> so the controller
/// knows whether to emit a new-conversation SSE event.
/// </summary>
public record ChatSessionDto(string ConversationId, bool IsNew);

// ── Interface ─────────────────────────────────────────────────────────────────

/// <summary>
/// All chat business logic lives here.
/// The controller handles only HTTP concerns (SSE formatting, JWT extraction).
/// </summary>
public interface IChatService
{
    // ── Conversation CRUD ──────────────────────────────────────────────────

    /// <summary>Returns the 50 most-recent conversations for the given user.</summary>
    Task<List<ConversationSummaryDto>> GetUserConversationsAsync(string userId);

    /// <summary>Creates a new empty conversation and returns its summary.</summary>
    Task<ConversationSummaryDto> CreateConversationAsync(string userId, string title);

    /// <summary>
    /// Deletes a conversation (ownership-checked) and all its messages.
    /// Returns false when the conversation does not exist or belongs to a different user.
    /// </summary>
    Task<bool> DeleteConversationAsync(string conversationId, string userId);

    /// <summary>
    /// Returns all messages for a conversation in chronological order.
    /// Returns null when the conversation does not exist or belongs to a different user.
    /// </summary>
    Task<List<ChatMessageDto>?> GetConversationMessagesAsync(string conversationId, string userId);

    // ── Streaming session lifecycle ────────────────────────────────────────

    /// <summary>
    /// Ensures the conversation exists (creates one when <paramref name="conversationId"/> is
    /// null or empty), then saves the user message.
    /// Returns the resolved conversationId and whether it was freshly created.
    /// </summary>
    Task<ChatSessionDto> PrepareSessionAsync(
        string?           conversationId,
        string?           userId,
        string?           guestId,
        string            userMessage,
        CancellationToken ct);

    /// <summary>
    /// Fetches the most-recent <paramref name="limit"/> messages as role/content pairs,
    /// oldest → newest, ready to be forwarded to the AI as conversation history.
    /// </summary>
    Task<IReadOnlyList<ConversationMessage>> GetHistoryAsync(string conversationId, int limit = 20);

    /// <summary>
    /// Selects the AI provider, builds the mode-aware prompt, and streams tokens.
    /// Yields raw text tokens — SSE formatting is the controller's responsibility.
    /// </summary>
    IAsyncEnumerable<string> StreamAiAsync(
        string                         userMessage,
        string?                        mode,
        string?                        toneMode,
        string?                        model,
        float?                         temperature,
        int?                           maxTokens,
        bool                           rawMode,
        IReadOnlyList<ConversationMessage> history,
        string?                        userId,
        string?                        userName,
        CancellationToken              ct);

    /// <summary>
    /// Saves the full AI response as an assistant message, bumps the conversation
    /// timestamp, and persists a semantic memory entry for future RAG retrieval.
    /// </summary>
    Task FinalizeSessionAsync(
        string            conversationId,
        string            fullResponse,
        string?           userId,
        CancellationToken ct);
}
