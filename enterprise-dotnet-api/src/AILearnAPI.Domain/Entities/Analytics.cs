using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// One record per page-view. Stored in collection "analytics_visits".
    /// </summary>
    [BsonIgnoreExtraElements]
    public class AnalyticsVisit : BaseEntity
    {
        /// <summary>Random UUID generated client-side and stored in sessionStorage. Links all events in a tab session.</summary>
        [BsonElement("sessionId")]
        public string SessionId { get; set; } = string.Empty;

        /// <summary>MongoDB userId when the visitor is authenticated; null for guests.</summary>
        [BsonElement("userId")]
        public string? UserId { get; set; }

        /// <summary>Username for display (null for guests).</summary>
        [BsonElement("username")]
        public string? Username { get; set; }

        /// <summary>Angular route path e.g. "/home", "/notes", "/azure-ai-102".</summary>
        [BsonElement("page")]
        public string Page { get; set; } = string.Empty;

        /// <summary>HTTP Referrer header (may be empty for direct visits).</summary>
        [BsonElement("referrer")]
        public string Referrer { get; set; } = string.Empty;

        /// <summary>Client IP address (IPv4 or IPv6).</summary>
        [BsonElement("ipAddress")]
        public string IpAddress { get; set; } = string.Empty;

        /// <summary>User-Agent header.</summary>
        [BsonElement("userAgent")]
        public string UserAgent { get; set; } = string.Empty;

        /// <summary>True when a JWT was supplied (logged-in user).</summary>
        [BsonElement("isLoggedIn")]
        public bool IsLoggedIn { get; set; }

        /// <summary>UTC timestamp.</summary>
        [BsonElement("visitedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime VisitedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// One record per tracked click / user-interaction. Stored in "analytics_clicks".
    /// </summary>
    [BsonIgnoreExtraElements]
    public class AnalyticsClick : BaseEntity
    {
        /// <summary>Links to the session that generated the click.</summary>
        [BsonElement("sessionId")]
        public string SessionId { get; set; } = string.Empty;

        /// <summary>MongoDB userId when authenticated; null for guests.</summary>
        [BsonElement("userId")]
        public string? UserId { get; set; }

        /// <summary>Semantic name of the action e.g. "ask_question", "save_note", "toggle_dark_mode".</summary>
        [BsonElement("eventName")]
        public string EventName { get; set; } = string.Empty;

        /// <summary>Angular route where the click happened.</summary>
        [BsonElement("pageName")]
        public string PageName { get; set; } = string.Empty;

        /// <summary>Optional HTML element id.</summary>
        [BsonElement("elementId")]
        public string? ElementId { get; set; }

        /// <summary>Optional visible label / text of the clicked element (trimmed to 120 chars).</summary>
        [BsonElement("elementText")]
        public string? ElementText { get; set; }

        /// <summary>UTC timestamp.</summary>
        [BsonElement("clickedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime ClickedAt { get; set; } = DateTime.UtcNow;
    }
}
