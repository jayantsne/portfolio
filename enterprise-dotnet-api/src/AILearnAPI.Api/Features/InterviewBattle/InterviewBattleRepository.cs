using MongoDB.Driver;

namespace AILearnAPI.Api.Features.InterviewBattle;

public interface IInterviewBattleRepository
{
    Task InitializeAsync(); Task<BattleSession> CreateSessionAsync(BattleSession session);
    Task<BattleSession?> GetSessionAsync(string id, string userId); Task UpdateSessionAsync(BattleSession session);
    Task<BattleQuestion> CreateQuestionAsync(BattleQuestion question); Task<BattleQuestion?> GetQuestionAsync(string id, string sessionId, string userId);
    Task<BattleAnswer> CreateAnswerAsync(BattleAnswer answer); Task<List<BattleAnswer>> GetAnswersAsync(string sessionId, string userId);
    Task<BattleAnswer?> GetAnswerAsync(string id,string sessionId,string userId); Task UpdateAnswerAsync(BattleAnswer answer); Task<List<BattleSession>> GetHistoryAsync(string userId); Task<List<BattleQuestion>> GetQuestionsAsync(string sessionId,string userId);
    Task UpsertRevisionAsync(InterviewRevisionItem item); Task<List<InterviewRevisionItem>> GetRevisionAsync(string userId); Task<InterviewRevisionItem?> GetRevisionItemAsync(string id,string userId); Task UpdateRevisionAsync(InterviewRevisionItem item);
    Task UpsertMistakeAsync(UserEnglishMistake item); Task<List<UserEnglishMistake>> GetMistakesAsync(string userId,string? type); Task<UserEnglishMistake?> GetMistakeAsync(string id,string userId); Task UpdateMistakeAsync(UserEnglishMistake item);
}

public sealed class InterviewBattleRepository : IInterviewBattleRepository
{
    private readonly IMongoCollection<BattleSession> _sessions; private readonly IMongoCollection<BattleQuestion> _questions; private readonly IMongoCollection<BattleAnswer> _answers; private readonly IMongoCollection<InterviewRevisionItem> _revision; private readonly IMongoCollection<UserEnglishMistake> _mistakes;
    public InterviewBattleRepository(IMongoDatabase db) { _sessions=db.GetCollection<BattleSession>("InterviewBattleSessions"); _questions=db.GetCollection<BattleQuestion>("InterviewBattleQuestions"); _answers=db.GetCollection<BattleAnswer>("InterviewBattleAnswers"); _revision=db.GetCollection<InterviewRevisionItem>("InterviewRevisionItems"); _mistakes=db.GetCollection<UserEnglishMistake>("UserEnglishMistakes"); }
    public async Task InitializeAsync()
    {
        await _sessions.Indexes.CreateOneAsync(new CreateIndexModel<BattleSession>(Builders<BattleSession>.IndexKeys.Ascending(x=>x.UserId).Descending(x=>x.StartedAt)));
        await _questions.Indexes.CreateManyAsync([new(Builders<BattleQuestion>.IndexKeys.Ascending(x=>x.SessionId).Ascending(x=>x.CreatedAt)),new(Builders<BattleQuestion>.IndexKeys.Ascending(x=>x.Id))]);
        await _answers.Indexes.CreateManyAsync([new(Builders<BattleAnswer>.IndexKeys.Ascending(x=>x.SessionId).Ascending(x=>x.CreatedAt)),new(Builders<BattleAnswer>.IndexKeys.Ascending(x=>x.QuestionId))]);
        await _revision.Indexes.CreateManyAsync([new(Builders<InterviewRevisionItem>.IndexKeys.Ascending(x=>x.UserId).Ascending(x=>x.NextRevisionAt)),new(Builders<InterviewRevisionItem>.IndexKeys.Ascending(x=>x.UserId).Ascending(x=>x.Question),new CreateIndexOptions{Unique=true})]);
        await _mistakes.Indexes.CreateManyAsync([new(Builders<UserEnglishMistake>.IndexKeys.Ascending(x=>x.UserId).Descending(x=>x.LastDetectedAt)),new(Builders<UserEnglishMistake>.IndexKeys.Ascending(x=>x.UserId).Ascending(x=>x.OriginalSentence),new CreateIndexOptions{Unique=true})]);
    }
    public async Task<BattleSession> CreateSessionAsync(BattleSession x){await _sessions.InsertOneAsync(x);return x;}
    public async Task<BattleSession?> GetSessionAsync(string id,string userId)=>await _sessions.Find(x=>x.Id==id&&x.UserId==userId).FirstOrDefaultAsync();
    public Task UpdateSessionAsync(BattleSession x)=>_sessions.ReplaceOneAsync(s=>s.Id==x.Id&&s.UserId==x.UserId,x);
    public async Task<BattleQuestion> CreateQuestionAsync(BattleQuestion x){await _questions.InsertOneAsync(x);return x;}
    public async Task<BattleQuestion?> GetQuestionAsync(string id,string sessionId,string userId)=>await _questions.Find(x=>x.Id==id&&x.SessionId==sessionId&&x.UserId==userId).FirstOrDefaultAsync();
    public async Task<BattleAnswer> CreateAnswerAsync(BattleAnswer x){await _answers.InsertOneAsync(x);return x;}
    public Task<List<BattleAnswer>> GetAnswersAsync(string sessionId,string userId)=>_answers.Find(x=>x.SessionId==sessionId&&x.UserId==userId).SortBy(x=>x.CreatedAt).ToListAsync();
    public Task<BattleAnswer?> GetAnswerAsync(string id,string sessionId,string userId)=>_answers.Find(x=>x.Id==id&&x.SessionId==sessionId&&x.UserId==userId).FirstOrDefaultAsync()!;
    public Task UpdateAnswerAsync(BattleAnswer x)=>_answers.ReplaceOneAsync(a=>a.Id==x.Id&&a.UserId==x.UserId,x);
    public Task<List<BattleSession>> GetHistoryAsync(string userId)=>_sessions.Find(x=>x.UserId==userId).SortByDescending(x=>x.StartedAt).Limit(100).ToListAsync();
    public Task<List<BattleQuestion>> GetQuestionsAsync(string sessionId,string userId)=>_questions.Find(x=>x.SessionId==sessionId&&x.UserId==userId).SortBy(x=>x.Sequence).ToListAsync();
    public Task UpsertRevisionAsync(InterviewRevisionItem x)=>_revision.UpdateOneAsync(i=>i.UserId==x.UserId&&i.Question==x.Question,Builders<InterviewRevisionItem>.Update.SetOnInsert(i=>i.Id,x.Id).SetOnInsert(i=>i.UserId,x.UserId).SetOnInsert(i=>i.Question,x.Question).Set(i=>i.Topic,x.Topic).Set(i=>i.Technology,x.Technology).Set(i=>i.QuestionType,x.QuestionType).Set(i=>i.MissingConcepts,x.MissingConcepts).Set(i=>i.IncorrectConcepts,x.IncorrectConcepts).Set(i=>i.TechnicalScore,x.TechnicalScore).Set(i=>i.EnglishScore,x.EnglishScore).Set(i=>i.LastAttemptAt,x.LastAttemptAt).Set(i=>i.NextRevisionAt,x.NextRevisionAt),new UpdateOptions{IsUpsert=true});
    public Task<List<InterviewRevisionItem>> GetRevisionAsync(string userId)=>_revision.Find(x=>x.UserId==userId&&!x.Mastered).SortBy(x=>x.NextRevisionAt).ToListAsync();
    public Task<InterviewRevisionItem?> GetRevisionItemAsync(string id,string userId)=>_revision.Find(x=>x.Id==id&&x.UserId==userId).FirstOrDefaultAsync()!;
    public Task UpdateRevisionAsync(InterviewRevisionItem x)=>_revision.ReplaceOneAsync(i=>i.Id==x.Id&&i.UserId==x.UserId,x);
    public Task UpsertMistakeAsync(UserEnglishMistake x)=>_mistakes.UpdateOneAsync(i=>i.UserId==x.UserId&&i.OriginalSentence==x.OriginalSentence,Builders<UserEnglishMistake>.Update.SetOnInsert(i=>i.Id,x.Id).SetOnInsert(i=>i.UserId,x.UserId).SetOnInsert(i=>i.OriginalSentence,x.OriginalSentence).SetOnInsert(i=>i.FirstDetectedAt,x.FirstDetectedAt).Set(i=>i.CorrectedSentence,x.CorrectedSentence).Set(i=>i.EasyToSpeakSentence,x.EasyToSpeakSentence).Set(i=>i.MistakeType,x.MistakeType).Set(i=>i.Explanation,x.Explanation).Set(i=>i.LastDetectedAt,x.LastDetectedAt).Inc(i=>i.OccurrenceCount,1),new UpdateOptions{IsUpsert=true});
    public Task<List<UserEnglishMistake>> GetMistakesAsync(string userId,string? type)=>_mistakes.Find(x=>x.UserId==userId&&(type==null||x.MistakeType==type)).SortByDescending(x=>x.LastDetectedAt).ToListAsync();
    public Task<UserEnglishMistake?> GetMistakeAsync(string id,string userId)=>_mistakes.Find(x=>x.Id==id&&x.UserId==userId).FirstOrDefaultAsync()!;
    public Task UpdateMistakeAsync(UserEnglishMistake x)=>_mistakes.ReplaceOneAsync(i=>i.Id==x.Id&&i.UserId==x.UserId,x);
}
