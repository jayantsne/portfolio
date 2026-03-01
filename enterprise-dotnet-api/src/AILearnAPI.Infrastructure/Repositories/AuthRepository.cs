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

        public async Task<string> GetNextUserIdAsync()
        {
            var count = await _collection.CountDocumentsAsync(_ => true);
            return $"user_{count + 1}";
        }

        public async Task<Auth?> GetByEmailAsync(string email)
        {
            return await _collection.Find(x => x.Email == email).FirstOrDefaultAsync();
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            var count = await _collection.CountDocumentsAsync(x => x.Email == email);
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
