namespace AILearnAPI.Shared.DTOs.Auth
{
    public class AuthDto
    {
        public string userId { get; set; } = string.Empty;
        public string username { get; set; } = string.Empty;
        public bool isAuthenticated { get; set; }
        public DateTime? lastLogin { get; set; }
    }

    public class RegisterDto
    {
        public string username { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        public string username { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public string message { get; set; } = string.Empty;
        public string userId { get; set; } = string.Empty;
        public string username { get; set; } = string.Empty;
    }
}
