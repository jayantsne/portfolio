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
    }
}
