using System.IdentityModel.Tokens.Jwt;
using AILearnAPI.Application.Interfaces;

namespace AILearnAPI.Api.Middleware
{
    /// <summary>
    /// Blocks access to feature endpoints when the user's trial has expired and
    /// they have no active subscription.  Returns 402 Payment Required.
    ///
    /// Protected prefixes:
    ///   /api/notes, /api/questions, /api/user-progress, /api/user-config,
    ///   /api/ai, /api/ai-learn, /api/ai-understand, /api/ai-qa, /api/learn
    ///
    /// Freely accessible:
    ///   /api/auth, /api/subscription, /api/health, /api/admin,
    ///   /swagger, /health
    /// </summary>
    public class SubscriptionAccessMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SubscriptionAccessMiddleware> _logger;

        // Prefixes that require an active trial or subscription
        private static readonly string[] ProtectedPrefixes =
        [
            "/api/notes",
            "/api/questions",
            "/api/user-progress",
            "/api/user-config",
            "/api/ai",
            "/api/learn",
        ];

        // These prefixes are always allowed (no subscription check)
        private static readonly string[] OpenPrefixes =
        [
            "/api/auth",
            "/api/subscription",
            "/api/health",
            "/api/admin",
            "/api/master-config",
            "/api/app-config",
            "/api/analytics",
            "/api/deploy",
            "/api/llm-provider",
            "/swagger",
            "/health",
        ];

        public SubscriptionAccessMiddleware(RequestDelegate next, ILogger<SubscriptionAccessMiddleware> logger)
        {
            _next   = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, ISubscriptionService subscriptionService)
        {
            var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

            // Fast-path: always-open routes
            if (OpenPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                await _next(context);
                return;
            }

            // Only apply check to protected feature routes
            if (!ProtectedPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                await _next(context);
                return;
            }

            // Extract userId from JWT claim
            var userId = ExtractUserId(context);
            if (string.IsNullOrEmpty(userId))
            {
                // No JWT at all — let the normal auth pipeline reject it
                await _next(context);
                return;
            }

            // Subscription check
            bool hasAccess;
            try
            {
                hasAccess = await subscriptionService.HasAccessAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Subscription check failed for {UserId} — allowing through", userId);
                // Fail open: if DB unreachable, don't block the user
                await _next(context);
                return;
            }

            if (!hasAccess)
            {
                context.Response.StatusCode  = StatusCodes.Status402PaymentRequired;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(
                    """{"error":"subscription_required","message":"Your free trial has ended. Subscribe for \u20b9199/month to continue using AI Learn."}""");
                return;
            }

            await _next(context);
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private static string? ExtractUserId(HttpContext ctx)
        {
            // 1. Check Authorization: Bearer <token>
            var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader["Bearer ".Length..].Trim();
                try
                {
                    var jwt    = new JwtSecurityTokenHandler().ReadJwtToken(token);
                    var userId = jwt.Claims.FirstOrDefault(c => c.Type == "userId")?.Value
                              ?? jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                    return userId;
                }
                catch { /* invalid token — fall through */ }
            }
            return null;
        }
    }
}
