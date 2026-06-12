using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Services;

public sealed class ConfigurationSecretProvider : ISecretProvider
{
    private readonly IConfiguration _configuration;

    public ConfigurationSecretProvider(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string? GetOptional(string key)
    {
        var value = _configuration[key];
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    public string GetRequired(string key)
    {
        var value = GetOptional(key);
        if (value == null)
        {
            throw new InvalidOperationException(
                $"Missing required secret/configuration value '{key}'. Set environment variable '{key.Replace(":", "__")}'.");
        }

        return value;
    }
}
