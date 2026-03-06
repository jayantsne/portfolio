using AILearnAPI.Api.Models;
using Microsoft.Extensions.Options;

namespace AILearnAPI.Api.Middleware;

public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthenticationMiddleware> _logger;
    private readonly string _apiKey;

    public ApiKeyAuthenticationMiddleware(
        RequestDelegate next,
        IOptions<ApiSettings> settings,
        ILogger<ApiKeyAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _apiKey = settings.Value.ApiKey;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";
        
        // Skip authentication for health check
        if (path.Contains("/health"))
        {
            await _next(context);
            return;
        }

        // Skip authentication for Swagger UI and Swagger JSON
        if (path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/auth/* — these use JWT (login/signup/logout)
        if (path.StartsWith("/api/auth/") || path.Equals("/api/auth"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/user-config — protected by JWT Bearer token
        if (path.StartsWith("/api/user-config"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/master-config — protected by JWT Bearer + ADMIN role
        if (path.StartsWith("/api/master-config"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/notes — protected by JWT Bearer token
        if (path.StartsWith("/api/notes"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/deploy — protected by JWT Bearer (ADMIN) + localhost IP filter
        if (path.StartsWith("/api/deploy"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/analytics — visit/click endpoints are intentionally public;
        // the dashboard endpoint is self-protected by [Authorize(Roles=ADMIN)].
        if (path.StartsWith("/api/analytics"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/questions — public read access for Interview Prep
        if (path.StartsWith("/api/questions"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/app-config — public config endpoint
        if (path.StartsWith("/api/app-config"))
        {
            await _next(context);
            return;
        }

        // Skip authentication for all AI endpoints — protected by JWT Bearer token
        if (path.StartsWith("/api/ai/"))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-API-Key", out var extractedApiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "API Key is missing" });
            return;
        }

        if (!string.Equals(extractedApiKey, _apiKey, StringComparison.Ordinal))
        {
            _logger.LogWarning("Invalid API key attempt from {IP}", context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API Key" });
            return;
        }

        await _next(context);
    }
}
