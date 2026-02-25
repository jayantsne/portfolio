using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;
using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Infrastructure.Services;

/// <summary>
/// Redis cache implementation of ICacheService
/// </summary>
public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly TimeSpan _defaultExpiration;

    public RedisCacheService(
        IConnectionMultiplexer redis,
        IConfiguration configuration,
        ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _database = redis.GetDatabase();
        _logger = logger;

        // Get default cache duration from configuration (default: 60 minutes)
        var defaultMinutes = configuration.GetValue<int>("Redis:DefaultCacheDurationMinutes", 60);
        _defaultExpiration = TimeSpan.FromMinutes(defaultMinutes);
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            var value = await _database.StringGetAsync(key);
            
            if (!value.HasValue)
            {
                _logger.LogDebug("Cache miss for key: {Key}", key);
                return null;
            }

            _logger.LogDebug("Cache hit for key: {Key}", key);
            return JsonSerializer.Deserialize<T>(value!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting value from cache for key: {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            var expirationTime = expiration ?? _defaultExpiration;

            await _database.StringSetAsync(key, json, expirationTime);
            _logger.LogDebug("Cached value for key: {Key} with expiration: {Expiration}", key, expirationTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting value in cache for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _database.KeyDeleteAsync(key);
            _logger.LogDebug("Removed cache key: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache key: {Key}", key);
        }
    }

    public async Task RemoveByPatternAsync(string pattern)
    {
        try
        {
            var endpoints = _redis.GetEndPoints();
            var server = _redis.GetServer(endpoints.First());

            var keys = server.Keys(pattern: pattern).ToArray();
            
            if (keys.Length > 0)
            {
                await _database.KeyDeleteAsync(keys);
                _logger.LogDebug("Removed {Count} cache keys matching pattern: {Pattern}", keys.Length, pattern);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache keys by pattern: {Pattern}", pattern);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            return await _database.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache key existence: {Key}", key);
            return false;
        }
    }
}
