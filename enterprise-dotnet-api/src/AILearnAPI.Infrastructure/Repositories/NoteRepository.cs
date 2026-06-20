using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class NoteRepository : BaseRepository<Note>, INoteRepository
    {
        public NoteRepository(IMongoDatabase database)
            : base(database, "notes")
        {
        }

        public async Task<List<Note>> GetByUserIdAsync(string userId)
        {
            return await _collection
                .Find(n => n.UserId == userId)
                .SortByDescending(n => n.SavedAt)
                .ToListAsync();
        }

        public async Task<Note?> GetByIdAndUserIdAsync(string noteId, string userId)
        {
            return await _collection
                .Find(n => n.Id == noteId && n.UserId == userId)
                .FirstOrDefaultAsync();
        }

        public async Task<List<Note>> GetByContextAsync(string userId, string contextType, string? contextId = null)
        {
            var filter = Builders<Note>.Filter.And(
                Builders<Note>.Filter.Eq(n => n.UserId, userId),
                Builders<Note>.Filter.Eq(n => n.ContextType, contextType)
            );
            if (!string.IsNullOrEmpty(contextId))
                filter = Builders<Note>.Filter.And(
                    filter,
                    Builders<Note>.Filter.Eq(n => n.ContextId, contextId)
                );
            return await _collection
                .Find(filter)
                .SortByDescending(n => n.SavedAt)
                .ToListAsync();
        }
    }
}
