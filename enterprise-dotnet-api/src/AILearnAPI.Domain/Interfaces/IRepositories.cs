using AILearnAPI.Domain.Entities;

namespace AILearnAPI.Domain.Interfaces
{
    public interface IQuestionRepository : IBaseRepository<Question>
    {
        Task<Question?> GetByQuestionIdAsync(int questionId);
        Task<int> GetNextQuestionIdAsync();
        Task<List<Question>> GetByCategoryAsync(string category);
        Task DeleteAllAsync();
        Task<int> InsertManyAsync(List<Question> questions);
        Task<(List<Question> questions, int total, Dictionary<string, int> categoryCount)> GetAllWithMetadataAsync();
    }

    public interface IUserProgressRepository : IBaseRepository<UserProgress>
    {
        Task<UserProgress?> GetByUserIdAsync(string userId);
        Task<UserProgress> UpsertAsync(string userId, UserProgress progress);
        Task<UserProgress> GetOrCreateAsync(string userId);
    }

    public interface IAuthRepository : IBaseRepository<Auth>
    {
        Task<Auth?> GetByUsernameAsync(string username);
        Task<Auth?> GetByUserIdAsync(string userId);
        Task<Auth?> GetByEmailAsync(string email);
        Task<bool> UsernameExistsAsync(string username);
        Task<bool> EmailExistsAsync(string email);
        Task<string> GetNextUserIdAsync();
        Task<bool> UpdateAuthenticationStatusAsync(string userId, bool isAuthenticated);
        /// <summary>Returns total number of users — used to assign ADMIN to the very first signup.</summary>
        Task<long> CountUsersAsync();
        Task<bool> UpdateRoleAsync(string userId, string role);
    }

    public interface IAIQARepository : IBaseRepository<AIQA>
    {
        Task<List<AIQA>> GetByUserIdAsync(string userId);
    }

    public interface IUserConfigRepository : IBaseRepository<UserConfig>
    {
        Task<UserConfig?> GetByUserIdAsync(string userId);
        Task<UserConfig>  UpsertAsync(string userId, UserConfig config);
    }

    public interface IMasterConfigRepository
    {
        /// <summary>Returns the singleton global config, creating it with defaults if absent.</summary>
        Task<MasterConfig> GetOrCreateAsync();
        Task<MasterConfig> UpdateAsync(MasterConfig config);
    }

    public interface INoteRepository : IBaseRepository<Note>
    {
        Task<List<Note>> GetByUserIdAsync(string userId);
        /// <summary>Fetches a note only when it belongs to the given userId (prevents cross-user access).</summary>
        Task<Note?> GetByIdAndUserIdAsync(string noteId, string userId);
    }

    public interface ILlmProviderRepository : IBaseRepository<LlmProvider>
    {
        Task<LlmProvider?> GetByNameAsync(string providerName);
        Task<List<LlmProvider>> GetEnabledAsync();
        Task<bool> AddAllowedUserAsync(string providerName, string userId);
        Task<bool> RemoveAllowedUserAsync(string providerName, string userId);
        Task<bool> SetEnabledAsync(string providerName, bool enabled);
        Task<bool> UpdateApiKeyAsync(string providerName, string encryptedKey);
    }
}
