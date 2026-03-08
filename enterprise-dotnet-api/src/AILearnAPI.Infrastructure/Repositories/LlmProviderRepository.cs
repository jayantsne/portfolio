using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class LlmProviderRepository : BaseRepository<LlmProvider>, ILlmProviderRepository
    {
        public LlmProviderRepository(IMongoDatabase database)
            : base(database, "llmproviders") { }

        public async Task<LlmProvider?> GetByNameAsync(string providerName)
            => await _collection.Find(p => p.ProviderName == providerName).FirstOrDefaultAsync();

        public async Task<List<LlmProvider>> GetEnabledAsync()
            => await _collection.Find(p => p.Enabled).ToListAsync();

        public async Task<bool> AddAllowedUserAsync(string providerName, string userId)
        {
            var update = Builders<LlmProvider>.Update
                .AddToSet(p => p.AllowedUserIds, userId)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            var result = await _collection.UpdateOneAsync(p => p.ProviderName == providerName, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> RemoveAllowedUserAsync(string providerName, string userId)
        {
            var update = Builders<LlmProvider>.Update
                .Pull(p => p.AllowedUserIds, userId)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            var result = await _collection.UpdateOneAsync(p => p.ProviderName == providerName, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> SetEnabledAsync(string providerName, bool enabled)
        {
            var update = Builders<LlmProvider>.Update
                .Set(p => p.Enabled, enabled)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            var result = await _collection.UpdateOneAsync(p => p.ProviderName == providerName, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateApiKeyAsync(string providerName, string encryptedKey)
        {
            var update = Builders<LlmProvider>.Update
                .Set(p => p.ApiKeyEncrypted, encryptedKey)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            var result = await _collection.UpdateOneAsync(p => p.ProviderName == providerName, update);
            return result.ModifiedCount > 0;
        }
    }
}
