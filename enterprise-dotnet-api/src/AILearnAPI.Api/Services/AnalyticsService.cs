using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.Analytics;
using MongoDB.Driver;

namespace AILearnAPI.Api.Services
{
    /// <summary>
    /// Writes analytics events to MongoDB and builds dashboard aggregations.
    /// Placed in the Api layer because MongoDB.Driver is only referenced here.
    /// Collections: "analytics_visits", "analytics_clicks".
    /// </summary>
    public class AnalyticsService : IAnalyticsService
    {
        private readonly IMongoCollection<AnalyticsVisit>  _visits;
        private readonly IMongoCollection<AnalyticsClick>  _clicks;
        private readonly ILogger<AnalyticsService>          _logger;

        public AnalyticsService(IMongoDatabase database, ILogger<AnalyticsService> logger)
        {
            _visits = database.GetCollection<AnalyticsVisit>("analytics_visits");
            _clicks = database.GetCollection<AnalyticsClick>("analytics_clicks");
            _logger = logger;

            // Ensure indexes for common query patterns
            EnsureIndexes();
        }

        // ── Write operations ────────────────────────────────────────────────

        public async Task TrackVisitAsync(
            TrackVisitDto dto,
            string? userId,
            string? username,
            bool    isLoggedIn,
            string  ipAddress,
            string  userAgent)
        {
            var doc = new AnalyticsVisit
            {
                SessionId  = dto.SessionId,
                UserId     = string.IsNullOrWhiteSpace(userId) ? null : userId,
                Username   = string.IsNullOrWhiteSpace(username) ? null : username,
                Page       = dto.Page?.Trim() ?? "/",
                Referrer   = dto.Referrer?.Trim() ?? string.Empty,
                IpAddress  = ipAddress,
                UserAgent  = userAgent,
                IsLoggedIn = isLoggedIn,
                VisitedAt  = DateTime.UtcNow
            };
            await _visits.InsertOneAsync(doc);
        }

        public async Task TrackClickAsync(TrackClickDto dto, string? userId)
        {
            var doc = new AnalyticsClick
            {
                SessionId   = dto.SessionId,
                UserId      = string.IsNullOrWhiteSpace(userId) ? null : userId,
                EventName   = dto.EventName?.Trim() ?? "unknown",
                PageName    = dto.PageName?.Trim() ?? "/",
                ElementId   = dto.ElementId,
                ElementText = dto.ElementText?.Length > 120
                              ? dto.ElementText[..120]
                              : dto.ElementText,
                ClickedAt   = DateTime.UtcNow
            };
            await _clicks.InsertOneAsync(doc);
        }

        // ── Dashboard aggregation ────────────────────────────────────────────

        public async Task<AnalyticsDashboardDto> GetDashboardAsync(int days = 30)
        {
            var since = DateTime.UtcNow.Date.AddDays(-(days - 1));

            // ── Filters ──────────────────────────────────────────────────
            var visitFilter = Builders<AnalyticsVisit>.Filter.Gte(v => v.VisitedAt, since);
            var clickFilter = Builders<AnalyticsClick>.Filter.Gte(c => c.ClickedAt, since);

            // ── Parallel base counts ─────────────────────────────────────
            var totalVisitsTask     = _visits.CountDocumentsAsync(visitFilter);
            var totalClicksTask     = _clicks.CountDocumentsAsync(clickFilter);
            var loggedInVisitsTask  = _visits.CountDocumentsAsync(
                visitFilter & Builders<AnalyticsVisit>.Filter.Eq(v => v.IsLoggedIn, true));

            await Task.WhenAll(totalVisitsTask, totalClicksTask, loggedInVisitsTask);

            var totalVisits    = totalVisitsTask.Result;
            var totalClicks    = totalClicksTask.Result;
            var loggedInVisits = loggedInVisitsTask.Result;

            // ── Unique visitors (distinct sessionIds) ─────────────────────
            var distinctSessions = await _visits.DistinctAsync<string>(
                "sessionId", visitFilter);
            var sessionList   = await distinctSessions.ToListAsync();
            var uniqueVisitors = (long)sessionList.Count;

            // ── Daily stats ───────────────────────────────────────────────
            var visitsByDay = await _visits
                .Aggregate()
                .Match(visitFilter)
                .Group(v => v.VisitedAt.Date, g => new
                {
                    Date         = g.Key,
                    Visits       = g.Count(),
                    UniqueUsers  = g.Select(x => x.SessionId).Distinct().Count()
                })
                .ToListAsync();

            var clicksByDay = await _clicks
                .Aggregate()
                .Match(clickFilter)
                .Group(c => c.ClickedAt.Date, g => new
                {
                    Date   = g.Key,
                    Clicks = g.Count()
                })
                .ToListAsync();

            var clickDayMap = clicksByDay.ToDictionary(x => x.Date, x => (long)x.Clicks);

            var dailyStats = Enumerable.Range(0, days)
                .Select(i => since.AddDays(i))
                .Select(date =>
                {
                    var vd = visitsByDay.FirstOrDefault(x => x.Date == date);
                    clickDayMap.TryGetValue(date, out var cl);
                    return new DailyStatDto
                    {
                        Date        = date.ToString("yyyy-MM-dd"),
                        Visits      = vd?.Visits      ?? 0,
                        Clicks      = cl,
                        UniqueUsers = vd?.UniqueUsers ?? 0
                    };
                })
                .ToList();

            // ── Top pages ─────────────────────────────────────────────────
            var topPages = await _visits
                .Aggregate()
                .Match(visitFilter)
                .Group(v => v.Page, g => new { Page = g.Key, Count = g.Count() })
                .SortByDescending(x => x.Count)
                .Limit(10)
                .ToListAsync();

            // ── Top events ────────────────────────────────────────────────
            var topEvents = await _clicks
                .Aggregate()
                .Match(clickFilter)
                .Group(c => c.EventName, g => new { EventName = g.Key, Count = g.Count() })
                .SortByDescending(x => x.Count)
                .Limit(10)
                .ToListAsync();

            // ── Recent sessions ───────────────────────────────────────────
            var recentSessionsRaw = await _visits
                .Aggregate()
                .Match(visitFilter)
                .Group(v => v.SessionId, g => new
                {
                    SessionId  = g.Key,
                    UserId     = g.First().UserId,
                    Username   = g.First().Username,
                    IsLoggedIn = g.First().IsLoggedIn,
                    IpAddress  = g.First().IpAddress,
                    FirstPage  = g.First().Page,
                    LastSeen   = g.Max(x => x.VisitedAt),
                    PageViews  = g.Count()
                })
                .SortByDescending(x => x.LastSeen)
                .Limit(20)
                .ToListAsync();

            return new AnalyticsDashboardDto
            {
                UniqueVisitors  = uniqueVisitors,
                TotalVisits     = totalVisits,
                TotalClicks     = totalClicks,
                LoggedInVisits  = loggedInVisits,
                GuestVisits     = totalVisits - loggedInVisits,
                DailyStats      = dailyStats,
                TopPages        = topPages.Select(x => new PageStatDto  { Page      = x.Page,      Count = x.Count }).ToList(),
                TopEvents       = topEvents.Select(x => new EventStatDto { EventName = x.EventName, Count = x.Count }).ToList(),
                RecentSessions  = recentSessionsRaw.Select(x => new RecentSessionDto
                {
                    SessionId  = x.SessionId,
                    UserId     = x.UserId,
                    Username   = x.Username,
                    IsLoggedIn = x.IsLoggedIn,
                    IpAddress  = x.IpAddress,
                    FirstPage  = x.FirstPage,
                    LastSeen   = x.LastSeen,
                    PageViews  = x.PageViews
                }).ToList()
            };
        }

        // ── Private helpers ─────────────────────────────────────────────────

        private void EnsureIndexes()
        {
            try
            {
                // Visits: queries filter on VisitedAt + SessionId
                _visits.Indexes.CreateMany(new[]
                {
                    new CreateIndexModel<AnalyticsVisit>(
                        Builders<AnalyticsVisit>.IndexKeys.Descending(v => v.VisitedAt)),
                    new CreateIndexModel<AnalyticsVisit>(
                        Builders<AnalyticsVisit>.IndexKeys.Ascending(v => v.SessionId))
                });

                // Clicks: queries filter on ClickedAt + SessionId
                _clicks.Indexes.CreateMany(new[]
                {
                    new CreateIndexModel<AnalyticsClick>(
                        Builders<AnalyticsClick>.IndexKeys.Descending(c => c.ClickedAt)),
                    new CreateIndexModel<AnalyticsClick>(
                        Builders<AnalyticsClick>.IndexKeys.Ascending(c => c.SessionId))
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Analytics] Index creation warning (harmless on re-run)");
            }
        }
    }
}
