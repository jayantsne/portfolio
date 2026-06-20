using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Constants;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.Helpers;
using MongoDB.Driver;
using Serilog;

namespace AILearnAPI.Api.Configuration;

public static class StartupTasks
{
    public static bool HasAdminPasswordResetRequest(string[] args)
    {
        return args.Any(arg => string.Equals(arg, "--reset-admin-password", StringComparison.OrdinalIgnoreCase));
    }

    public static async Task ResetAdminPasswordAsync(
        IServiceProvider services,
        string[] args,
        ISecretProvider secrets)
    {
        using var resetScope = services.CreateScope();
        var database = resetScope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var resetEmail = GetAdminResetEmail(args);
        var resetPassword = secrets.GetRequired("AdminReset:Password");
        var authCollection = database.GetCollection<Auth>("auth");

        var filter = Builders<Auth>.Filter.Eq(x => x.Email, resetEmail);
        var update = Builders<Auth>.Update
            .Set(x => x.Password, PasswordHelper.HashPassword(resetPassword))
            .Set(x => x.Role, UserRoles.Admin)
            .Set(x => x.AuthProvider, "local")
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var result = await authCollection.UpdateOneAsync(filter, update);
        if (result.MatchedCount == 0)
        {
            throw new InvalidOperationException("Admin account was not found. No password was changed.");
        }

        Log.Information("Admin password reset completed for {Email}", resetEmail);
    }

    public static async Task InitializeDefaultUserAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        try
        {
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            await authService.InitializeDefaultUserAsync();
            Log.Information("Default user initialization complete.");
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Default user initialization skipped - MongoDB may not be ready.");
        }
    }

    private static string GetAdminResetEmail(string[] args)
    {
        var resetEmailArg = args
            .SkipWhile(arg => !string.Equals(arg, "--reset-admin-password", StringComparison.OrdinalIgnoreCase))
            .Skip(1)
            .FirstOrDefault(arg => !arg.StartsWith("--", StringComparison.Ordinal));

        return string.IsNullOrWhiteSpace(resetEmailArg)
            ? "admin@learnwithai.tech"
            : resetEmailArg.Trim().ToLowerInvariant();
    }
}
