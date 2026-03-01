namespace AILearnAPI.Shared.DTOs.Analytics
{
    // ── Inbound (tracking calls from Angular) ──────────────────────────────

    /// <summary>Payload posted to POST /api/analytics/visit.</summary>
    public class TrackVisitDto
    {
        public string SessionId  { get; set; } = string.Empty;
        public string Page       { get; set; } = string.Empty;
        public string Referrer   { get; set; } = string.Empty;
    }

    /// <summary>Payload posted to POST /api/analytics/click.</summary>
    public class TrackClickDto
    {
        public string  SessionId   { get; set; } = string.Empty;
        public string  EventName   { get; set; } = string.Empty;
        public string  PageName    { get; set; } = string.Empty;
        public string? ElementId   { get; set; }
        public string? ElementText { get; set; }
    }

    // ── Outbound (admin dashboard) ─────────────────────────────────────────

    /// <summary>Top-level dashboard response returned by GET /api/analytics/dashboard.</summary>
    public class AnalyticsDashboardDto
    {
        /// <summary>Distinct sessionIds in the queried window.</summary>
        public long UniqueVisitors  { get; set; }

        /// <summary>Total visit records in the queried window.</summary>
        public long TotalVisits     { get; set; }

        /// <summary>Total click records in the queried window.</summary>
        public long TotalClicks     { get; set; }

        /// <summary>Visit records where isLoggedIn == true.</summary>
        public long LoggedInVisits  { get; set; }

        /// <summary>Visit records where isLoggedIn == false.</summary>
        public long GuestVisits     { get; set; }

        /// <summary>Daily breakdown for the chosen window (newest last).</summary>
        public List<DailyStatDto> DailyStats   { get; set; } = new();

        /// <summary>Top 10 pages by visit count.</summary>
        public List<PageStatDto>  TopPages     { get; set; } = new();

        /// <summary>Top 10 click events by count.</summary>
        public List<EventStatDto> TopEvents    { get; set; } = new();

        /// <summary>Most-active recent sessions (up to 20).</summary>
        public List<RecentSessionDto> RecentSessions { get; set; } = new();
    }

    public class DailyStatDto
    {
        public string Date        { get; set; } = string.Empty;   // "yyyy-MM-dd"
        public long   Visits      { get; set; }
        public long   Clicks      { get; set; }
        public long   UniqueUsers { get; set; }
    }

    public class PageStatDto
    {
        public string Page   { get; set; } = string.Empty;
        public long   Count  { get; set; }
    }

    public class EventStatDto
    {
        public string EventName { get; set; } = string.Empty;
        public long   Count     { get; set; }
    }

    public class RecentSessionDto
    {
        public string   SessionId   { get; set; } = string.Empty;
        public string?  UserId      { get; set; }
        public string?  Username    { get; set; }
        public bool     IsLoggedIn  { get; set; }
        public string   IpAddress   { get; set; } = string.Empty;
        public string   FirstPage   { get; set; } = string.Empty;
        public DateTime LastSeen    { get; set; }
        public long     PageViews   { get; set; }
    }
}
