using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories;

/// <summary>
/// MongoDB repository for chat conversations.
/// Collection: "conversations"
/// Single Responsibility: data access only — no business logic.
/// </summary>
public class ConversationRepository : BaseRepository<Conversation>, IConversationRepository
{
    public ConversationRepository(IMongoDatabase database)
        : base(database, "conversations") { }

    public async Task<List<Conversation>> GetByUserIdAsync(string userId, int limit = 50)
        => await _collection
            .Find(c => c.UserId == userId)
            .SortByDescending(c => c.UpdatedAt)
            .Limit(limit)
            .ToListAsync();

    public async Task TouchUpdatedAtAsync(string conversationId)
        => await _collection.UpdateOneAsync(
            c => c.Id == conversationId,
            Builders<Conversation>.Update.Set(c => c.UpdatedAt, DateTime.UtcNow));
}
