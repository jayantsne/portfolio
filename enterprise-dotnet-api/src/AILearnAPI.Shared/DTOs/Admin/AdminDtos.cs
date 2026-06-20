namespace AILearnAPI.Shared.DTOs.Admin
{
    // Login
    public class AdminLoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AdminLoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public AdminUserDto? User { get; set; }
    }

    public class AdminUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime? LastLogin { get; set; }
    }

    // AI Providers
    public class AIProviderDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool Enabled { get; set; }
        public int Priority { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public List<string> ApiKeys { get; set; } = new List<string>();
        public AIProviderStatsDto Stats { get; set; } = new AIProviderStatsDto();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AIProviderStatsDto
    {
        public long TotalRequests { get; set; }
        public long SuccessfulRequests { get; set; }
        public long FailedRequests { get; set; }
        public double AvgResponseTime { get; set; }
        public DateTime? LastUsed { get; set; }
        public double SuccessRate => TotalRequests > 0 ? (double)SuccessfulRequests / TotalRequests * 100 : 0;
    }

    public class UpdateProviderDto
    {
        public bool? Enabled { get; set; }
        public int? Priority { get; set; }
        public List<string>? ApiKeys { get; set; }
    }

    public class AddApiKeyDto
    {
        public string ProviderId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
    }

    public class RemoveApiKeyDto
    {
        public string ProviderId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty; // Last 4 chars for identification
    }

    // ── User Management ───────────────────────────────────────────────────────

    /// <summary>
    /// Full user record combining auth + subscription data,
    /// returned to admin user-management endpoints.
    /// </summary>
    public class AdminUserDetailDto
    {
        // Auth fields
        public string    UserId    { get; set; } = string.Empty;
        public string    Username  { get; set; } = string.Empty;
        public string    Email     { get; set; } = string.Empty;
        public string    Role      { get; set; } = string.Empty;
        public DateTime? LastLogin { get; set; }
        public bool      IsAdmin   { get; set; }

        // Subscription fields
        public string    SubscriptionStatus   { get; set; } = "none";
        public bool      HasAccess            { get; set; }
        public bool      IsTrialActive        { get; set; }
        public bool      IsSubscriptionActive { get; set; }
        public int       TrialDaysRemaining   { get; set; }
        public string?   SubscriptionPlan     { get; set; }
        public DateTime? SubscriptionExpiry   { get; set; }
        public DateTime? TrialEndDate         { get; set; }
        public DateTime? SignupDate           { get; set; }
        public string?   RazorpayOrderId      { get; set; }
        public string?   RazorpayPaymentId    { get; set; }

        // Block info
        public bool      IsBlocked     { get; set; }
        public DateTime? BlockedAt     { get; set; }
        public string?   BlockedReason { get; set; }
    }

    /// <summary>Paginated list of users returned by GET /api/user-admin/users.</summary>
    public class AdminUserListDto
    {
        public int                      Total { get; set; }
        public List<AdminUserDetailDto> Users { get; set; } = new();
    }

    /// <summary>Analytics summary for the admin dashboard.</summary>
    public class AdminAnalyticsDto
    {
        public int TotalUsers         { get; set; }
        public int AdminUsers         { get; set; }
        public int ActiveTrial        { get; set; }
        public int ActiveSubscribers  { get; set; }
        public int ExpiredUsers       { get; set; }
        public int BlockedUsers       { get; set; }
    }

    /// <summary>Request body for blocking/unblocking a user.</summary>
    public class AdminBlockRequest
    {
        public bool    Block  { get; set; }
        public string? Reason { get; set; }
    }

    /// <summary>Request body for manually extending/activating a subscription.</summary>
    public class AdminExtendRequest
    {
        /// <summary>Number of days from now (default 30).</summary>
        public int Days { get; set; } = 30;
    }
}
