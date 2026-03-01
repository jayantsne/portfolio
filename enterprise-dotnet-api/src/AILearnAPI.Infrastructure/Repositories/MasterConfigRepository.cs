using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class MasterConfigRepository : IMasterConfigRepository
    {
        private readonly IMongoCollection<MasterConfig> _collection;

        public MasterConfigRepository(IMongoDatabase database)
        {
            _collection = database.GetCollection<MasterConfig>("master_config");
        }

        public async Task<MasterConfig> GetOrCreateAsync()
        {
            var config = await _collection
                .Find(x => x.ConfigId == "global")
                .FirstOrDefaultAsync();

            if (config != null) return config;

            // Seed the singleton on first access
            config = new MasterConfig();
            await _collection.InsertOneAsync(config);
            return config;
        }

        public async Task<MasterConfig> UpdateAsync(MasterConfig config)
        {
            var filter  = Builders<MasterConfig>.Filter.Eq(x => x.ConfigId, "global");
            var options = new ReplaceOptions { IsUpsert = true };
            await _collection.ReplaceOneAsync(filter, config, options);
            return config;
        }
    }
}
