using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using MongoDB.Driver;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class RevisionRepository : BaseRepository<RevisionItem>, IRevisionRepository
    {
        public RevisionRepository(IMongoDatabase database)
            : base(database, "revision_items") { }

        public async Task<List<RevisionItem>> GetByUserIdAsync(string userId) =>
            await FindAsync(x => x.UserId == userId);

        public async Task<RevisionItem?> GetByUserAndNoteAsync(string userId, string noteId)
        {
            var results = await FindAsync(x => x.UserId == userId && x.NoteId == noteId);
            return results.FirstOrDefault();
        }

        public async Task<List<RevisionItem>> GetDueForReviewAsync(string userId, DateTime asOf) =>
            await FindAsync(x => x.UserId == userId && x.NextReviewDate <= asOf);

        public async Task<RevisionItem?> GetByIdAndUserIdAsync(string id, string userId)
        {
            var results = await FindAsync(x => x.Id == id && x.UserId == userId);
            return results.FirstOrDefault();
        }
    }
}
