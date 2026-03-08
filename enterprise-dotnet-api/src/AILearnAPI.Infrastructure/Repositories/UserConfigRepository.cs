using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class UserConfigRepository : BaseRepository<UserConfig>, IUserConfigRepository
    {
        public UserConfigRepository(IMongoDatabase database)
            : base(database, "user_configs")
        {
        }

        public async Task<UserConfig?> GetByUserIdAsync(string userId)
        {
            return await _collection.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        }

        public async Task<UserConfig> UpsertAsync(string userId, UserConfig config)
        {
            var existing = await GetByUserIdAsync(userId);

            if (existing == null)
            {
                config.UserId = userId;
                await _collection.InsertOneAsync(config);
                return config;
            }

            var filter = Builders<UserConfig>.Filter.Eq(x => x.UserId, userId);
            var update = Builders<UserConfig>.Update
                .Set(x => x.MaxTokens,       config.MaxTokens)
                .Set(x => x.SystemPrompt,    config.SystemPrompt)
                .Set(x => x.ProviderToggles, config.ProviderToggles)
                .Set(x => x.DefaultProvider, config.DefaultProvider)
                .Set(x => x.CustomProviders, config.CustomProviders)
                .Set(x => x.UpdatedAt,       DateTime.UtcNow);

            await _collection.UpdateOneAsync(filter, update);
            existing.MaxTokens       = config.MaxTokens;
            existing.SystemPrompt    = config.SystemPrompt;
            existing.ProviderToggles = config.ProviderToggles;
            existing.DefaultProvider = config.DefaultProvider;
            existing.CustomProviders = config.CustomProviders;
            return existing;
        }
    }
}
