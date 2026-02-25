using BCrypt.Net;

namespace AILearnAPI.Shared.Helpers
{
    public static class PasswordHelper
    {
        /// <summary>
        /// Hashes a password using BCrypt with work factor 10 (matching Node.js bcrypt default)
        /// </summary>
        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 10);
        }

        /// <summary>
        /// Verifies a password against a BCrypt hash
        /// Compatible with Node.js bcrypt hashes
        /// </summary>
        public static bool VerifyPassword(string password, string hash)
        {
            try
            {
                return BCrypt.Net.BCrypt.Verify(password, hash);
            }
            catch
            {
                return false;
            }
        }
    }
}
