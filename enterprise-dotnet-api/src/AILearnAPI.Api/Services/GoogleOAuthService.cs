using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Services;

public sealed class GoogleOAuthService : IGoogleOAuthService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ISecretProvider _secrets;

    public GoogleOAuthService(IHttpClientFactory httpClientFactory, ISecretProvider secrets)
    {
        _httpClientFactory = httpClientFactory;
        _secrets = secrets;
    }

    public string BuildAuthorizationUrl(string redirectUri, string state)
    {
        var clientId = _secrets.GetRequired("GoogleOAuth:ClientId");

        var query = new Dictionary<string, string?>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["prompt"] = "select_account",
            ["access_type"] = "online"
        };

        return "https://accounts.google.com/o/oauth2/v2/auth?" + BuildQuery(query);
    }

    public async Task<GoogleOAuthUserIdentity> ExchangeCodeAsync(string code, string redirectUri, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Google authorization code is required.");

        var clientId = _secrets.GetRequired("GoogleOAuth:ClientId");
        var clientSecret = _secrets.GetRequired("GoogleOAuth:ClientSecret");

        var client = _httpClientFactory.CreateClient("GoogleOAuth");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code"
            })
        };

        using var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new UnauthorizedAccessException("Google authorization code could not be exchanged.");

        var token = JsonSerializer.Deserialize<GoogleTokenResponse>(body, JsonOptions);
        if (string.IsNullOrWhiteSpace(token?.IdToken))
            throw new UnauthorizedAccessException("Google did not return an identity token.");

        var identity = await ValidateIdTokenAsync(token.IdToken, clientId, ct);
        if (!identity.EmailVerified)
            throw new UnauthorizedAccessException("Google account email is not verified.");

        return identity;
    }

    private async Task<GoogleOAuthUserIdentity> ValidateIdTokenAsync(string idToken, string expectedAudience, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("GoogleOAuth");
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            "https://oauth2.googleapis.com/tokeninfo?id_token=" + Uri.EscapeDataString(idToken));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await client.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new UnauthorizedAccessException("Google identity token is invalid or expired.");

        var tokenInfo = JsonSerializer.Deserialize<GoogleTokenInfoResponse>(body, JsonOptions);

        if (tokenInfo == null ||
            tokenInfo.Audience != expectedAudience ||
            string.IsNullOrWhiteSpace(tokenInfo.Subject) ||
            string.IsNullOrWhiteSpace(tokenInfo.Email))
        {
            throw new UnauthorizedAccessException("Google identity token claims are invalid.");
        }

        return new GoogleOAuthUserIdentity(
            tokenInfo.Subject,
            tokenInfo.Email,
            tokenInfo.Name,
            string.Equals(tokenInfo.EmailVerified, "true", StringComparison.OrdinalIgnoreCase));
    }

    private static string BuildQuery(Dictionary<string, string?> values)
    {
        return string.Join("&", values
            .Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))
            .Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value!)}"));
    }

    private sealed class GoogleTokenResponse
    {
        [JsonPropertyName("id_token")]
        public string? IdToken { get; set; }
    }

    private sealed class GoogleTokenInfoResponse
    {
        [JsonPropertyName("sub")]
        public string? Subject { get; set; }

        [JsonPropertyName("aud")]
        public string? Audience { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("email_verified")]
        public string? EmailVerified { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
