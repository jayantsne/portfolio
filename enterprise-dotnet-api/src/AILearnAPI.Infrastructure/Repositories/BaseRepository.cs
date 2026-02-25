using MongoDB.Driver;
using System.Linq.Expressions;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class BaseRepository<T> : IBaseRepository<T> where T : BaseEntity
    {
        protected readonly IMongoCollection<T> _collection;

        public BaseRepository(IMongoDatabase database, string collectionName)
        {
            _collection = database.GetCollection<T>(collectionName);
        }

        public virtual async Task<T?> GetByIdAsync(string id)
        {
            return await _collection.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public virtual async Task<List<T>> GetAllAsync()
        {
            return await _collection.Find(_ => true).ToListAsync();
        }

        public virtual async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await _collection.Find(predicate).ToListAsync();
        }

        public virtual async Task<T> CreateAsync(T entity)
        {
            entity.CreatedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;
            await _collection.InsertOneAsync(entity);
            return entity;
        }

        public virtual async Task<T> UpdateAsync(string id, T entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            await _collection.ReplaceOneAsync(x => x.Id == id, entity);
            return entity;
        }

        public virtual async Task<bool> DeleteAsync(string id)
        {
            var result = await _collection.DeleteOneAsync(x => x.Id == id);
            return result.DeletedCount > 0;
        }

        public virtual async Task<long> CountAsync(Expression<Func<T, bool>>? predicate = null)
        {
            if (predicate == null)
                return await _collection.CountDocumentsAsync(_ => true);
            
            return await _collection.CountDocumentsAsync(predicate);
        }

        public virtual async Task<(List<T> items, long total)> GetPagedAsync(
            int page,
            int pageSize,
            Expression<Func<T, bool>>? predicate = null,
            Expression<Func<T, object>>? orderBy = null,
            bool descending = false)
        {
            var filter = predicate ?? (_ => true);
            var total = await _collection.CountDocumentsAsync(filter);

            var query = _collection.Find(filter);

            if (orderBy != null)
            {
                var sort = descending
                    ? Builders<T>.Sort.Descending(orderBy)
                    : Builders<T>.Sort.Ascending(orderBy);
                query = query.Sort(sort);
            }

            var items = await query
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            return (items, total);
        }
    }
}
