using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class AIQARepository : BaseRepository<AIQA>, IAIQARepository
    {
        public AIQARepository(IMongoDatabase database) 
            : base(database, "aiqas")
        {
        }

        public async Task<List<AIQA>> GetByUserIdAsync(string userId)
        {
            return await _collection
                .Find(x => x.UserId == userId)
                .SortByDescending(x => x.Timestamp)
                .ToListAsync();
        }
    }
}
