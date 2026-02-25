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
