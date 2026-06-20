using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories;

/// <summary>
/// MongoDB repository for chat messages.
/// Collection: "chat_messages"
/// Single Responsibility: data access only — no business logic.
/// </summary>
public class MessageRepository : BaseRepository<ChatMessage>, IMessageRepository
{
    public MessageRepository(IMongoDatabase database)
        : base(database, "chat_messages") { }

    public async Task<List<ChatMessage>> GetByConversationIdAsync(string conversationId)
        => await _collection
            .Find(m => m.ConversationId == conversationId)
            .SortBy(m => m.CreatedAt)
            .ToListAsync();

    public async Task<List<ChatMessage>> GetRecentAsync(string conversationId, int limit = 20)
    {
        // Fetch newest N, then reverse so the AI receives messages oldest → newest
        var messages = await _collection
            .Find(m => m.ConversationId == conversationId)
            .SortByDescending(m => m.CreatedAt)
            .Limit(limit)
            .ToListAsync();

        messages.Reverse();
        return messages;
    }

    public async Task DeleteByConversationIdAsync(string conversationId)
        => await _collection.DeleteManyAsync(m => m.ConversationId == conversationId);
}
