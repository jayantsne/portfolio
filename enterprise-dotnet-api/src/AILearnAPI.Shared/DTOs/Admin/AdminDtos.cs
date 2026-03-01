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
}
