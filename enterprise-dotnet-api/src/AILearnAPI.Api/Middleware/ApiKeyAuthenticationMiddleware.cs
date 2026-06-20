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

        // Browser-owned authentication routes must never require the shared
        // X-API-Key. Google OAuth starts as a top-level redirect, so the
        // frontend cannot and should not attach server secrets to this request.
        if (path.Equals("/api/auth") || path.StartsWith("/api/auth/") ||
            path.Equals("/auth") || path.StartsWith("/auth/"))
        {
            await _next(context);
            return;
        }
        
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

        // Skip for /api/conversation - protected by JWT Bearer token in ConversationController.
        // Browser clients should not need or expose the shared X-API-Key for user chat history.
        if (path.StartsWith("/api/conversation"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/app-config - public config endpoint
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

        // Skip for /api/llm-providers — protected by JWT Bearer + RBAC (role checks in controller)
        if (path.StartsWith("/api/llm-providers"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/playground — browser clients cannot safely keep shared API keys.
        if (path.StartsWith("/api/playground"))
        {
            await _next(context);
            return;
        }

        // Skip for /api/learn — public learning endpoint used by the Angular app.
        if (path.StartsWith("/api/learn"))
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
