using System.Linq.Expressions;
using AILearnAPI.Domain.Entities;

namespace AILearnAPI.Domain.Interfaces
{
    public interface IBaseRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(string id);
        Task<List<T>> GetAllAsync();
        Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate);
        Task<T> CreateAsync(T entity);
        Task<T> UpdateAsync(string id, T entity);
        Task<bool> DeleteAsync(string id);
        Task<long> CountAsync(Expression<Func<T, bool>>? predicate = null);
        Task<(List<T> items, long total)> GetPagedAsync(
            int page,
            int pageSize,
            Expression<Func<T, bool>>? predicate = null,
            Expression<Func<T, object>>? orderBy = null,
            bool descending = false);
    }
}
