namespace AILearnAPI.Api.Services;

public sealed record GoogleOAuthUserIdentity(
    string UserId,
    string Email,
    string? DisplayName,
    bool EmailVerified);

public interface IGoogleOAuthService
{
    string BuildAuthorizationUrl(string redirectUri, string state);
    Task<GoogleOAuthUserIdentity> ExchangeCodeAsync(string code, string redirectUri, CancellationToken ct);
}
