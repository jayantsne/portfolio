using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class QuestionRepository : BaseRepository<Question>, IQuestionRepository
    {
        public QuestionRepository(IMongoDatabase database) 
            : base(database, "questions")
        {
        }

        public async Task<Question?> GetByQuestionIdAsync(int questionId)
        {
            return await _collection.Find(x => x.QuestionId == questionId).FirstOrDefaultAsync();
        }

        public async Task<int> GetNextQuestionIdAsync()
        {
            var lastQuestion = await _collection
                .Find(_ => true)
                .SortByDescending(x => x.QuestionId)
                .FirstOrDefaultAsync();

            return lastQuestion?.QuestionId + 1 ?? 1;
        }

        public async Task<List<Question>> GetByCategoryAsync(string category)
        {
            return await _collection
                .Find(x => x.Category == category)
                .ToListAsync();
        }

        public async Task DeleteAllAsync()
        {
            await _collection.DeleteManyAsync(_ => true);
        }

        public async Task<int> InsertManyAsync(List<Question> questions)
        {
            if (questions == null || !questions.Any())
                return 0;

            foreach (var question in questions)
            {
                question.CreatedAt = DateTime.UtcNow;
                question.UpdatedAt = DateTime.UtcNow;
            }

            await _collection.InsertManyAsync(questions);
            return questions.Count;
        }

        public async Task<(List<Question> questions, int total, Dictionary<string, int> categoryCount)> GetAllWithMetadataAsync()
        {
            var questions = await GetAllAsync();
            var total = questions.Count;
            
            var categoryCount = questions
                .GroupBy(q => q.Category)
                .ToDictionary(g => g.Key, g => g.Count());

            return (questions, total, categoryCount);
        }
    }
}
