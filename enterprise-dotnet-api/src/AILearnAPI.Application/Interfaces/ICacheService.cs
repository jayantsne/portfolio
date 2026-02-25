using System.Threading.Tasks;

namespace AILearnAPI.Application.Interfaces;

/// <summary>
/// Interface for caching service to abstract Redis implementation
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Get a cached value by key
    /// </summary>
    Task<T?> GetAsync<T>(string key) where T : class;

    /// <summary>
    /// Set a cached value with expiration
    /// </summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;

    /// <summary>
    /// Remove a cached value by key
    /// </summary>
    Task RemoveAsync(string key);

    /// <summary>
    /// Remove all cached values matching a pattern
    /// </summary>
    Task RemoveByPatternAsync(string pattern);

    /// <summary>
    /// Check if a key exists in cache
    /// </summary>
    Task<bool> ExistsAsync(string key);
}
