using AILearnAPI.Application.Interfaces;
using AILearnAPI.Infrastructure.Services;
using StackExchange.Redis;

namespace AILearnAPI.Api.Configuration;

public static class CachingServiceCollectionExtensions
{
    public static IServiceCollection AddCaching(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();

        var redisEnabled = configuration.GetValue("Redis:Enabled", true);
        if (!redisEnabled)
        {
            services.AddSingleton<ICacheService, NullCacheService>();
            return services;
        }

        var redisConnectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var redisConfiguration = ConfigurationOptions.Parse(redisConnectionString);
            redisConfiguration.AbortOnConnectFail = false;
            return ConnectionMultiplexer.Connect(redisConfiguration);
        });
        services.AddSingleton<ICacheService, RedisCacheService>();

        return services;
    }
}
