using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    /// <summary>
    /// MongoDB repository for per-user semantic memory entries.
    /// Collection: "user_memories"
    /// Indexed on (userId, createdAt DESC) for efficient per-user retrieval.
    /// </summary>
    public class UserMemoryRepository : IUserMemoryRepository
    {
        private readonly IMongoCollection<UserMemory> _collection;

        public UserMemoryRepository(IMongoDatabase database)
        {
            _collection = database.GetCollection<UserMemory>("user_memories");

            // Ensure compound index exists (no-op if already present)
            var indexModel = new CreateIndexModel<UserMemory>(
                Builders<UserMemory>.IndexKeys
                    .Ascending(m => m.UserId)
                    .Descending(m => m.CreatedAt),
                new CreateIndexOptions { Background = true });
            _collection.Indexes.CreateOne(indexModel);
        }

        public async Task<UserMemory> CreateAsync(UserMemory memory)
        {
            memory.CreatedAt = DateTime.UtcNow;
            await _collection.InsertOneAsync(memory);
            return memory;
        }

        public async Task<List<UserMemory>> GetByUserIdAsync(string userId, int limit = 50)
        {
            return await _collection
                .Find(m => m.UserId == userId)
                .SortByDescending(m => m.CreatedAt)
                .Limit(limit)
                .ToListAsync();
        }
    }
}
