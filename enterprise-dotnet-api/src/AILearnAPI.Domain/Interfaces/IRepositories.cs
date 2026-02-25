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
        Task<bool> UsernameExistsAsync(string username);
        Task<string> GetNextUserIdAsync();
        Task<bool> UpdateAuthenticationStatusAsync(string userId, bool isAuthenticated);
    }

    public interface IAIQARepository : IBaseRepository<AIQA>
    {
        Task<List<AIQA>> GetByUserIdAsync(string userId);
    }
}
