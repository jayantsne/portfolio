namespace AILearnAPI.Domain.Constants
{
    /// <summary>
    /// Centralised role constants — kept in Domain so every layer can reference them
    /// without circular dependencies.
    /// </summary>
    public static class UserRoles
    {
        public const string Admin = "ADMIN";
        public const string User  = "USER";

        /// <summary>All valid roles for validation purposes.</summary>
        public static readonly IReadOnlyList<string> All = new[] { Admin, User };
    }
}
