using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class SubscriptionRepository : BaseRepository<Subscription>, ISubscriptionRepository
    {
        public SubscriptionRepository(IMongoDatabase database)
            : base(database, "subscriptions") { }

        public async Task<Subscription?> GetByUserIdAsync(string userId)
            => await _collection.Find(s => s.UserId == userId).FirstOrDefaultAsync();

        public async Task<Subscription> UpsertByUserIdAsync(Subscription subscription)
        {
            var existing = await GetByUserIdAsync(subscription.UserId);
            if (existing == null)
            {
                return await CreateAsync(subscription);
            }
            subscription.Id        = existing.Id;
            subscription.CreatedAt = existing.CreatedAt;
            return await UpdateAsync(existing.Id, subscription);
        }
    }
}
