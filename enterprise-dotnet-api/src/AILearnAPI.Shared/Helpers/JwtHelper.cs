using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AILearnAPI.Shared.Helpers
{
    public static class JwtHelper
    {
        /// <summary>
        /// Generates a signed JWT access token for the given user.
        /// </summary>
        public static string GenerateToken(
            string userId,
            string username,
            string email,
            string role,
            string secretKey,
            string issuer,
            string audience,
            int expiryHours = 24)
        {
            var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub,        userId),
                new Claim(JwtRegisteredClaimNames.UniqueName, username),
                new Claim(JwtRegisteredClaimNames.Email,      email),
                new Claim(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString()),
                // Role claim — recognised by ASP.NET Core's [Authorize(Roles="...")]
                new Claim(ClaimTypes.Role, role),
            };

            var token = new JwtSecurityToken(
                issuer:             issuer,
                audience:           audience,
                claims:             claims,
                expires:            DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
