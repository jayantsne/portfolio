using AILearnAPI.Shared.DTOs.Analytics;

namespace AILearnAPI.Application.Interfaces
{
    /// <summary>
    /// Contract for the analytics tracking + dashboard service.
    /// </summary>
    public interface IAnalyticsService
    {
        /// <summary>Persists a page-visit event. Call from the public POST /api/analytics/visit endpoint.</summary>
        Task TrackVisitAsync(TrackVisitDto dto, string? userId, string? username, bool isLoggedIn, string ipAddress, string userAgent);

        /// <summary>Persists a click / interaction event. Call from the public POST /api/analytics/click endpoint.</summary>
        Task TrackClickAsync(TrackClickDto dto, string? userId);

        /// <summary>
        /// Returns aggregated dashboard data for the given time window.
        /// Only callable by ADMIN.
        /// </summary>
        /// <param name="days">Number of trailing days to include (1 = today, 7 = last week, 30 = last month).</param>
        Task<AnalyticsDashboardDto> GetDashboardAsync(int days = 30);
    }
}
