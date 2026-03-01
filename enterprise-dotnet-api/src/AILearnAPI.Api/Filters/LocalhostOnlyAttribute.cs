using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Net;

namespace AILearnAPI.Api.Filters
{
    /// <summary>
    /// Action filter that rejects any request not originating from localhost.
    /// Checks both 127.0.0.1 (IPv4 loopback) and ::1 (IPv6 loopback).
    /// Applied at controller or action level: [LocalhostOnly].
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
    public class LocalhostOnlyAttribute : Attribute, IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            var remoteIp = context.HttpContext.Connection.RemoteIpAddress;

            if (remoteIp is null || !IsLocalhost(remoteIp))
            {
                var ip = remoteIp?.ToString() ?? "unknown";
                context.Result = new ObjectResult(new
                {
                    error   = "Access denied. Deployment API is only accessible from localhost.",
                    yourIp  = ip
                })
                { StatusCode = StatusCodes.Status403Forbidden };

                // Log the attempt
                var logger = context.HttpContext.RequestServices
                    .GetService<ILogger<LocalhostOnlyAttribute>>();
                logger?.LogWarning(
                    "[LocalhostOnly] Blocked request from {IP} — {Path}",
                    ip, context.HttpContext.Request.Path);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context) { /* no-op */ }

        // ── Helpers ─────────────────────────────────────────────────────────

        private static bool IsLocalhost(IPAddress ip)
        {
            // Handle IPv4-mapped IPv6 addresses (::ffff:127.0.0.1)
            var addr = ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip;

            return addr.Equals(IPAddress.Loopback)        // 127.0.0.1
                || addr.Equals(IPAddress.IPv6Loopback)    // ::1
                || addr.ToString() == "::1"
                || addr.ToString().StartsWith("127.");    // 127.x.x.x subnet
        }
    }
}
