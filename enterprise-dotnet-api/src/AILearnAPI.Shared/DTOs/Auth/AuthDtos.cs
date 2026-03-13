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

    /// <summary>Lightweight user record returned to admin user-management endpoints.</summary>
    public class UserSummaryDto
    {
        public string    UserId          { get; set; } = string.Empty;
        public string    Username        { get; set; } = string.Empty;
        public string    Email           { get; set; } = string.Empty;
        public string    Role            { get; set; } = string.Empty;
        public bool      IsAuthenticated { get; set; }
        public DateTime? LastLogin       { get; set; }
        public bool      IsAdmin         => Role == AILearnAPI.Domain.Constants.UserRoles.Admin;
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
