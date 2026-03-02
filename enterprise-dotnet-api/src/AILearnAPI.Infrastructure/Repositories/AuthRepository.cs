using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class AuthRepository : BaseRepository<Auth>, IAuthRepository
    {
        public AuthRepository(IMongoDatabase database) 
            : base(database, "auth")
        {
        }

        public async Task<Auth?> GetByUsernameAsync(string username)
        {
            return await _collection.Find(x => x.Username == username).FirstOrDefaultAsync();
        }

        public async Task<Auth?> GetByUserIdAsync(string userId)
        {
            return await _collection.Find(x => x.UserId == userId).FirstOrDefaultAsync();
        }

        public async Task<bool> UsernameExistsAsync(string username)
        {
            var count = await _collection.CountDocumentsAsync(x => x.Username == username);
            return count > 0;
        }

        public Task<string> GetNextUserIdAsync()
        {
            // Count-based IDs cause duplicates under concurrent registrations.
            // Use a timestamp + 8-char guid fragment for guaranteed uniqueness.
            var millis = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var suffix = Guid.NewGuid().ToString("N")[..8];
            return Task.FromResult($"user_{millis}_{suffix}");
        }

        public async Task<Auth?> GetByEmailAsync(string email)
        {
            // Always compare lowercase — email is stored lowercased at registration
            var normalized = email.Trim().ToLowerInvariant();
            return await _collection.Find(x => x.Email == normalized).FirstOrDefaultAsync();
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            // Normalize before checking so case-variants (User@X.com vs user@x.com) are caught
            var normalized = email.Trim().ToLowerInvariant();
            var count = await _collection.CountDocumentsAsync(x => x.Email == normalized);
            return count > 0;
        }

        public async Task<bool> UpdateAuthenticationStatusAsync(string userId, bool isAuthenticated)
        {
            var filter = Builders<Auth>.Filter.Eq(x => x.UserId, userId);
            var update = Builders<Auth>.Update
                .Set(x => x.IsAuthenticated, isAuthenticated)
                .Set(x => x.LastLogin, DateTime.UtcNow)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);

            var result = await _collection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<long> CountUsersAsync()
            => await _collection.CountDocumentsAsync(_ => true);

        public async Task<bool> UpdateRoleAsync(string userId, string role)
        {
            var filter = Builders<Auth>.Filter.Eq(x => x.UserId, userId);
            var update = Builders<Auth>.Update
                .Set(x => x.Role, role)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);
            var result = await _collection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }
    }
}
