namespace AILearnAPI.Shared.DTOs.Auth
{
    public class AuthDto
    {
        public string userId          { get; set; } = string.Empty;
        public string username        { get; set; } = string.Empty;
        public string email           { get; set; } = string.Empty;  // was missing
        public string role            { get; set; } = string.Empty;  // was missing
        public bool   isAuthenticated { get; set; }
        public DateTime? lastLogin    { get; set; }
    }

    public class RegisterDto
    {
        public string username { get; set; } = string.Empty;
        public string email    { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        /// <summary>Login with email address</summary>
        public string email    { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public string message  { get; set; } = string.Empty;
        public string userId   { get; set; } = string.Empty;
        public string username { get; set; } = string.Empty;
        public string email    { get; set; } = string.Empty;
        public string role     { get; set; } = "USER";
        public string token    { get; set; } = string.Empty;
    }
}
