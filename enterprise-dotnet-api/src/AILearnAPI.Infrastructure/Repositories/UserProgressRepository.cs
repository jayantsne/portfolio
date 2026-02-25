using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class UserProgressRepository : BaseRepository<UserProgress>, IUserProgressRepository
    {
        public UserProgressRepository(IMongoDatabase database) 
            : base(database, "userprogress")
        {
        }

        public async Task<UserProgress?> GetByUserIdAsync(string userId)
        {
            return await _collection.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        }

        public async Task<UserProgress> UpsertAsync(string userId, UserProgress progress)
        {
            var filter = Builders<UserProgress>.Filter.Eq(x => x.UserId, userId);
            
            progress.UpdatedAt = DateTime.UtcNow;
            
            var options = new FindOneAndReplaceOptions<UserProgress>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After
            };

            var result = await _collection.FindOneAndReplaceAsync(filter, progress, options);
            return result;
        }

        public async Task<UserProgress> GetOrCreateAsync(string userId)
        {
            var existing = await GetByUserIdAsync(userId);
            
            if (existing != null)
                return existing;

            var newProgress = new UserProgress
            {
                UserId = userId,
                Bookmarks = new List<int>(),
                Progress = new Dictionary<string, int>(),
                TotalTime = 0,
                LastVisit = DateTime.UtcNow,
                VisitDates = new List<string> { DateTime.UtcNow.ToString("yyyy-MM-dd") },
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _collection.InsertOneAsync(newProgress);
            return newProgress;
        }
    }
}
