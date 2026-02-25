using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Infrastructure.Services;

/// <summary>
/// No-op cache implementation for graceful degradation when Redis is unavailable
/// </summary>
public class NullCacheService : ICacheService
{
    public Task<T?> GetAsync<T>(string key) where T : class
    {
        return Task.FromResult<T?>(null);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key)
    {
        return Task.CompletedTask;
    }

    public Task RemoveByPatternAsync(string pattern)
    {
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string key)
    {
        return Task.FromResult(false);
    }
}
