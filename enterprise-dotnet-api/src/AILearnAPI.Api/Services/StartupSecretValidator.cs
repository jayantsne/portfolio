using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Services;

public interface IStartupSecretValidator
{
    void Validate();
}

public sealed class StartupSecretValidator : IStartupSecretValidator
{
    private static readonly string[] RequiredSecrets =
    [
        "ConnectionStrings:MongoDB",
        "ApiSettings:ApiKey",
        "JwtSettings:SecretKey",
        "LlmProvider:EncryptionKey"
    ];

    private readonly ISecretProvider _secrets;
    private readonly IHostEnvironment _environment;

    public StartupSecretValidator(ISecretProvider secrets, IHostEnvironment environment)
    {
        _secrets = secrets;
        _environment = environment;
    }

    public void Validate()
    {
        var missing = RequiredSecrets
            .Where(key => string.IsNullOrWhiteSpace(_secrets.GetOptional(key)))
            .ToArray();

        if (missing.Length == 0)
            return;

        var envNames = string.Join(", ", missing.Select(key => key.Replace(":", "__")));
        var scope = _environment.IsProduction() ? "server" : "local development";
        throw new InvalidOperationException(
            $"Missing required {scope} secret(s): {envNames}. Store them as environment variables or .NET user-secrets, not in appsettings.json.");
    }
}
