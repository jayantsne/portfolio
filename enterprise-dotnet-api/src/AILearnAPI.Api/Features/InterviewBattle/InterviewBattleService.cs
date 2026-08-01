using System.Text.Json;
using AILearnAPI.Api.Services;

namespace AILearnAPI.Api.Features.InterviewBattle;

public interface IInterviewBattleService
{
    Task<BattleSession> CreateAsync(string userId,CreateBattleSessionRequest request); Task<BattleSession?> GetAsync(string userId,string id);
    Task<BattleQuestion> NextQuestionAsync(string userId,string sessionId,CancellationToken ct); Task<BattleAnswer> EvaluateAsync(string userId,string sessionId,SubmitBattleAnswerRequest request,CancellationToken ct);
    Task<BattleSummary> CompleteAsync(string userId,string sessionId);
    Task<RetryComparison> RetryAsync(string userId,string sessionId,string answerId,RetryBattleAnswerRequest request,CancellationToken ct); Task<BattleQuestion> FollowUpAsync(string userId,string sessionId,string answerId);
    Task<List<BattleSession>> HistoryAsync(string userId); Task<BattleHistoryDetail?> HistoryDetailAsync(string userId,string sessionId);
    Task<List<InterviewRevisionItem>> RevisionAsync(string userId); Task<InterviewRevisionItem> RevisionAttemptAsync(string userId,string id,RevisionAttemptRequest request);
    Task<List<UserEnglishMistake>> MistakesAsync(string userId,string? type); Task<UserEnglishMistake> MarkMistakeAsync(string userId,string id,bool mastered);
}

public sealed class InterviewBattleService : IInterviewBattleService
{
    private readonly IInterviewBattleRepository _repo; private readonly IChatAiStreamingService _ai; private readonly ILogger<InterviewBattleService> _log;
    private static readonly JsonSerializerOptions Json=new(){PropertyNameCaseInsensitive=true};
    public InterviewBattleService(IInterviewBattleRepository repo,IChatAiStreamingService ai,ILogger<InterviewBattleService> log){_repo=repo;_ai=ai;_log=log;}
    public Task<BattleSession?> GetAsync(string userId,string id)=>_repo.GetSessionAsync(id,userId);
    public Task<BattleSession> CreateAsync(string userId,CreateBattleSessionRequest r)=>_repo.CreateSessionAsync(new(){UserId=userId,Role=r.Role.Trim(),ExperienceLevel=r.ExperienceLevel,Technologies=r.Technologies.Select(x=>x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),InterviewType=r.InterviewType,Difficulty=r.Difficulty,InterviewerStyle=r.InterviewerStyle,DurationMinutes=r.DurationMinutes,AssistanceLevel=r.AssistanceLevel,PlannedQuestion=r.PlannedQuestion?.Trim()??"",PlannedQuestionCategory=r.PlannedQuestionCategory?.Trim()??"",PlannedAnswerHint=r.PlannedAnswerHint?.Trim()??"",SourceQuestionId=r.SourceQuestionId?.Trim()??"",SourceNoteId=r.SourceNoteId?.Trim()??""});
    public async Task<BattleQuestion> NextQuestionAsync(string userId,string sessionId,CancellationToken ct)
    {
        var s=await Owned(userId,sessionId); var tech=s.Technologies[s.CurrentQuestionIndex%s.Technologies.Count];
        var questionSchema=JsonSerializer.Serialize(new QuestionAi{Question="...",QuestionType="definition",AnswerFramework=["step 1"],Technology=tech});
        var prompt=$"You are a technical interviewer. Return JSON only matching this example: {questionSchema}. Create one {s.Difficulty} question for a {s.Role} with {s.ExperienceLevel} experience about {tech}. Avoid trivia. Framework has 3-5 concise steps.";
        QuestionAi generated;
        if(s.CurrentQuestionIndex==0&&!string.IsNullOrWhiteSpace(s.PlannedQuestion))
        {
            var framework=new List<string>{"State the core idea clearly","Explain how it works","Give a concrete production example","Mention trade-offs or limitations"};
            if(!string.IsNullOrWhiteSpace(s.PlannedAnswerHint))framework.Insert(0,s.PlannedAnswerHint);
            generated=new(){Question=s.PlannedQuestion,QuestionType="planned-practice",AnswerFramework=framework,Technology=string.IsNullOrWhiteSpace(s.PlannedQuestionCategory)?tech:s.PlannedQuestionCategory};
        }
        else
        {
        try
        {
            var raw=await GenerateWithOpenAiAsync(userId,prompt,.55f,500,ct);
            generated=Parse<QuestionAi>(raw,"question generation");
        }
        catch(Exception ex) when(ex is HttpRequestException or TimeoutException or InvalidOperationException)
        {
            _log.LogWarning(ex,"AI question generation unavailable; using the built-in interview question bank for {Technology}",tech);
            generated=FallbackQuestion(tech,s.CurrentQuestionIndex,s.Difficulty);
        }
        }
        var q=await _repo.CreateQuestionAsync(new(){SessionId=s.Id,UserId=userId,Question=generated.Question,QuestionType=generated.QuestionType,AnswerFramework=generated.AnswerFramework??[],Technology=tech,Sequence=s.CurrentQuestionIndex+1});
        s.CurrentQuestionIndex++; await _repo.UpdateSessionAsync(s); return q;
    }
    public async Task<BattleAnswer> EvaluateAsync(string userId,string sessionId,SubmitBattleAnswerRequest r,CancellationToken ct)
    {
        var s=await Owned(userId,sessionId); var q=await _repo.GetQuestionAsync(r.QuestionId,sessionId,userId)??throw new KeyNotFoundException("Question not found.");
        var evaluationSchema=JsonSerializer.Serialize(new AnswerEvaluation(),Json);
        var prompt=$"Evaluate this interview answer as a practical interview coach. Return valid JSON only, no markdown, matching this schema: {evaluationSchema}. Scores are 0-10. Technical score must be independent of English. Correct only meaningful language issues, max 5 corrections. StartWith must be one concrete opening sentence the candidate can say for this exact question. KeyPointsToInclude must contain 3-5 question-specific technical points. ShortAnswer, EasySpokenAnswer and ImprovedAnswer must be complete, factually correct answers to the exact question, not generic advice. WhyThisWorks must briefly explain why the proposed answer is strong. If the transcript is wrong, explicitly name the incorrect claim and replace it with the correct one. For 10+ years require trade-offs, production examples, performance, limitations, architecture and decisions. Context: role={s.Role}; experience={s.ExperienceLevel}; difficulty={s.Difficulty}; technologies={string.Join(", ",s.Technologies)}. Question: {q.Question}. Candidate transcript: {r.UserTranscript}";
        AnswerEvaluation evaluation;
        try
        {
            var raw=await GenerateWithOpenAiAsync(userId,prompt,.2f,1800,ct);
            evaluation=Parse<AnswerEvaluation>(raw,"answer evaluation");
        }
        catch(Exception ex) when(ex is HttpRequestException or TimeoutException or InvalidOperationException)
        {
            _log.LogWarning(ex,"AI answer evaluation unavailable; using the local rubric for question {QuestionId}",q.Id);
            evaluation=FallbackEvaluation(q,r.UserTranscript,r.AnswerDurationSeconds,r.StartedSpeakingAfterSeconds);
        }
        evaluation.LanguageCorrections=evaluation.LanguageCorrections.Take(5).ToList(); Clamp(evaluation);
        var answer=await _repo.CreateAnswerAsync(new(){SessionId=sessionId,QuestionId=q.Id,UserId=userId,Transcript=r.UserTranscript.Trim(),DurationSeconds=r.AnswerDurationSeconds,StartedSpeakingAfterSeconds=r.StartedSpeakingAfterSeconds,Evaluation=evaluation});
        await TrackRevisionAndMistakes(userId,q,answer);
        _log.LogInformation("Interview answer evaluated for user {UserId}; provider OpenAI; question {QuestionId}",userId,q.Id); return answer;
    }
    public async Task<RetryComparison> RetryAsync(string userId,string sessionId,string answerId,RetryBattleAnswerRequest request,CancellationToken ct)
    {
        var first=await _repo.GetAnswerAsync(answerId,sessionId,userId)??throw new KeyNotFoundException("Original answer not found."); request.QuestionId=first.QuestionId; var second=await EvaluateAsync(userId,sessionId,request,ct); second.RetryOfAnswerId=first.Id; second.AttemptNumber=first.AttemptNumber+1; await _repo.UpdateAnswerAsync(second);
        int Fill(BattleAnswer x)=>x.Evaluation.CommunicationEvaluation.FillerWords.Sum(w=>w.Count); return new(){FirstAttempt=first,SecondAttempt=second,TechnicalImprovement=Math.Round(second.Evaluation.TechnicalEvaluation.Score-first.Evaluation.TechnicalEvaluation.Score,1),EnglishImprovement=Math.Round(second.Evaluation.CommunicationEvaluation.OverallScore-first.Evaluation.CommunicationEvaluation.OverallScore,1),FillerWordsReduced=Fill(first)-Fill(second),MissingPointsReduced=first.Evaluation.TechnicalEvaluation.MissingPoints.Count-second.Evaluation.TechnicalEvaluation.MissingPoints.Count};
    }
    public async Task<BattleQuestion> FollowUpAsync(string userId,string sessionId,string answerId)
    {
        var s=await Owned(userId,sessionId); var a=await _repo.GetAnswerAsync(answerId,sessionId,userId)??throw new KeyNotFoundException("Answer not found."); var original=await _repo.GetQuestionAsync(a.QuestionId,sessionId,userId)??throw new KeyNotFoundException("Question not found.");
        if(string.IsNullOrWhiteSpace(a.Evaluation.FollowUpQuestion))throw new InvalidOperationException("No relevant follow-up was generated."); return await _repo.CreateQuestionAsync(new(){SessionId=sessionId,UserId=userId,Question=a.Evaluation.FollowUpQuestion,QuestionType=original.QuestionType,Technology=original.Technology,Sequence=s.CurrentQuestionIndex+1,AnswerFramework=original.AnswerFramework});
    }
    public Task<List<BattleSession>> HistoryAsync(string userId)=>_repo.GetHistoryAsync(userId);
    public async Task<BattleHistoryDetail?> HistoryDetailAsync(string userId,string sessionId){var s=await _repo.GetSessionAsync(sessionId,userId);return s==null?null:new(){Session=s,Questions=await _repo.GetQuestionsAsync(sessionId,userId),Answers=await _repo.GetAnswersAsync(sessionId,userId)};}
    public Task<List<InterviewRevisionItem>> RevisionAsync(string userId)=>_repo.GetRevisionAsync(userId);
    public async Task<InterviewRevisionItem> RevisionAttemptAsync(string userId,string id,RevisionAttemptRequest r){var x=await _repo.GetRevisionItemAsync(id,userId)??throw new KeyNotFoundException("Revision item not found.");x.AttemptCount++;x.RevisionLevel=Math.Min(4,x.RevisionLevel+(r.TechnicalScore>=7&&r.EnglishScore>=6?1:0));x.TechnicalScore=r.TechnicalScore;x.EnglishScore=r.EnglishScore;x.LastAttemptAt=DateTime.UtcNow;int[] days=[1,3,7,15,30];var interval=days[x.RevisionLevel];if(r.TechnicalScore<7||r.EnglishScore<6)interval=Math.Max(1,interval/2);x.NextRevisionAt=DateTime.UtcNow.AddDays(interval);x.Mastered=x.RevisionLevel>=4&&r.TechnicalScore>=8&&r.EnglishScore>=7;await _repo.UpdateRevisionAsync(x);return x;}
    public Task<List<UserEnglishMistake>> MistakesAsync(string userId,string? type)=>_repo.GetMistakesAsync(userId,string.IsNullOrWhiteSpace(type)?null:type);
    public async Task<UserEnglishMistake> MarkMistakeAsync(string userId,string id,bool mastered){var x=await _repo.GetMistakeAsync(id,userId)??throw new KeyNotFoundException("English mistake not found.");x.Mastered=mastered;await _repo.UpdateMistakeAsync(x);return x;}
    private async Task TrackRevisionAndMistakes(string userId,BattleQuestion q,BattleAnswer a)
    {
        var t=a.Evaluation.TechnicalEvaluation;var c=a.Evaluation.CommunicationEvaluation;if(t.Score<7||c.OverallScore<6||t.MissingPoints.Count>0||t.IncorrectPoints.Count>0||a.StartedSpeakingAfterSeconds>10)await _repo.UpsertRevisionAsync(new(){UserId=userId,Topic=q.Question,Technology=q.Technology,Question=q.Question,QuestionType=q.QuestionType,MissingConcepts=t.MissingPoints,IncorrectConcepts=t.IncorrectPoints,TechnicalScore=t.Score,EnglishScore=c.OverallScore,LastAttemptAt=DateTime.UtcNow,NextRevisionAt=DateTime.UtcNow.AddDays(1)});
        foreach(var correction in a.Evaluation.LanguageCorrections.Take(5)){var original=Normalize(correction.Original);if(original.Length==0)continue;await _repo.UpsertMistakeAsync(new(){UserId=userId,OriginalSentence=original,CorrectedSentence=correction.Corrected,EasyToSpeakSentence=correction.EasyToSpeak,MistakeType=InferMistakeType(correction.Explanation),Explanation=correction.Explanation,LastDetectedAt=DateTime.UtcNow});}
    }
    private static string Normalize(string value)=>string.Join(' ',value.Trim().ToLowerInvariant().Split(' ',StringSplitOptions.RemoveEmptyEntries));
    private static string InferMistakeType(string text){var x=text.ToLowerInvariant();if(x.Contains("article"))return "Missing article";if(x.Contains("tense"))return "Verb tense";if(x.Contains("subject")||x.Contains("agreement"))return "Subject-verb agreement";if(x.Contains("preposition"))return "Preposition";if(x.Contains("plural")||x.Contains("singular"))return "Plural or singular";return "Sentence structure";}
    private static QuestionAi FallbackQuestion(string technology,int index,string difficulty)
    {
        var questions=new Dictionary<string,string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["C#"]=["Explain how async and await work in C#, including one common production pitfall.","When would you choose an interface over an abstract class in C#?"],
            [".NET Core"]=["Walk me through the ASP.NET Core dependency injection lifetimes and when each should be used.","How would you diagnose high memory usage in a .NET application?"],
            ["ASP.NET Core"]=["How would you design exception handling and validation for a production ASP.NET Core API?","Explain the ASP.NET Core middleware pipeline and why ordering matters."],
            ["Web API"]=["How would you design an idempotent and resilient REST API endpoint?","What trade-offs do you consider when versioning a public Web API?"],
            ["Entity Framework Core"]=["How do you avoid N+1 queries and unnecessary tracking in Entity Framework Core?","Explain how you would manage EF Core migrations across environments."],
            ["SQL Server"]=["How would you investigate and improve a slow SQL Server query?","Explain transaction isolation levels and a case where the choice matters."],
            ["Angular"]=["How do Angular change detection and OnPush work, and when would you use OnPush?","How would you structure state management in a large Angular application?"],
            ["JavaScript"]=["Explain the JavaScript event loop using a practical asynchronous example.","How do closures work, and where have you used one in production?"],
            ["TypeScript"]=["How do generics improve type safety in TypeScript? Give a practical example.","What is the difference between type narrowing and type assertions?"],
            ["Microservices"]=["How would you handle consistency and failures across multiple microservices?","When should a system remain a modular monolith instead of becoming microservices?"],
            ["System Design"]=["Design a scalable notification service and explain your main trade-offs.","How would you design a rate limiter for a distributed API?"],
            ["Design Patterns"]=["Describe a design pattern you used to remove coupling, including its trade-offs.","When can the repository pattern become unnecessary abstraction?"],
            ["Azure"]=["How would you design a reliable deployment pipeline for an Azure-hosted API?","When would you choose Azure Service Bus over direct HTTP communication?"],
            ["PostgreSQL"]=["How would you diagnose and optimize a slow PostgreSQL query?","Explain when a PostgreSQL index can hurt write performance."],
            ["Oracle PL/SQL"]=["How would you tune a slow PL/SQL procedure?","Explain exception handling and transaction boundaries in PL/SQL."]
        };
        var options=questions.TryGetValue(technology,out var selected)?selected:["Explain a production problem you solved with this technology and the trade-offs you considered.","How would you diagnose a performance issue involving this technology?"];
        return new(){Question=options[index%options.Length],QuestionType=difficulty.Equals("Beginner",StringComparison.OrdinalIgnoreCase)?"fundamentals":"scenario",Technology=technology,AnswerFramework=["State the core idea clearly","Explain how it works","Give a concrete production example","Mention trade-offs or limitations"]};
    }
    private static AnswerEvaluation FallbackEvaluation(BattleQuestion q,string transcript,int duration,int thinking)
    {
        var words=transcript.Split((char[]?)null,StringSplitOptions.RemoveEmptyEntries);
        var unique=words.Select(x=>x.Trim(' ','.',',',';',':','!','?','(',')').ToLowerInvariant()).Where(x=>x.Length>3).Distinct().Count();
        var hasExample=transcript.Contains("example",StringComparison.OrdinalIgnoreCase)||transcript.Contains("production",StringComparison.OrdinalIgnoreCase)||transcript.Contains("project",StringComparison.OrdinalIgnoreCase);
        var hasTradeoff=transcript.Contains("trade-off",StringComparison.OrdinalIgnoreCase)||transcript.Contains("tradeoff",StringComparison.OrdinalIgnoreCase)||transcript.Contains("however",StringComparison.OrdinalIgnoreCase)||transcript.Contains("limitation",StringComparison.OrdinalIgnoreCase);
        var technical=Math.Clamp(2.5+Math.Min(4,unique/12.0)+(hasExample?1.2:0)+(hasTradeoff?1.0:0),0,10);
        var clarity=Math.Clamp(3+Math.Min(5,words.Length/18.0),0,10); var confidence=Math.Clamp(8-thinking*.18,2,10);
        var missing=new List<string>();if(!hasExample)missing.Add("Add a concrete production example.");if(!hasTradeoff)missing.Add("Explain at least one trade-off or limitation.");if(words.Length<35)missing.Add("Develop the answer with more technical detail.");
        var subject=q.Question.TrimEnd('?', '.');
        var opening=$"I would start by defining {subject.ToLowerInvariant()}, then explain how it behaves in a real application.";
        return new(){TechnicalEvaluation=new(){Score=technical,DepthScore=Math.Clamp(technical-(hasTradeoff?0:.8),0,10),SeniorityScore=Math.Clamp(technical-(hasExample?0:1),0,10),CorrectPoints=hasExample?["Used a practical example."]:[],MissingPoints=missing,Feedback=missing.Count==0?"Well structured and supported with practical reasoning.":string.Join(" ",missing)},CommunicationEvaluation=new(){OverallScore=(clarity+confidence)/2,GrammarScore=clarity,ClarityScore=clarity,FluencyScore=Math.Clamp(duration>0?words.Length/Math.Max(1,duration/60.0)/18:clarity,0,10),ConfidenceScore=confidence,ProfessionalVocabularyScore=Math.Clamp(3+unique/14.0,0,10),Feedback="Keep sentences concise and lead with the main point."},AnswerImprovement=new(){IdealStructure=q.AnswerFramework,StartWith=opening,KeyPointsToInclude=q.AnswerFramework.Take(4).ToList(),ShortAnswer=$"{opening} I would describe the mechanism, give one production example, and close with the main trade-off.",EasySpokenAnswer=$"{opening} In practice, I would explain the important steps in simple terms, show where I used it, and mention one limitation or alternative.",ImprovedAnswer=$"{opening} A senior answer should connect the implementation flow to a concrete production decision, including performance or reliability impact, limitations, and the trade-off that would justify a different approach.",WhyThisWorks="It leads with a direct definition, demonstrates practical understanding, and closes with the judgment interviewers expect at senior level."},FollowUpQuestion=$"What trade-off would make you choose a different approach for {q.Technology}?",ShouldAddToRevision=technical<7,RevisionReason=technical<7?"Add more depth, examples, and trade-offs.":""};
    }
    public async Task<BattleSummary> CompleteAsync(string userId,string sessionId)
    {
        var s=await Owned(userId,sessionId); var a=await _repo.GetAnswersAsync(sessionId,userId); if(a.Count==0)throw new InvalidOperationException("Answer at least one question before completing the battle.");
        double Avg(Func<BattleAnswer,double> f)=>Math.Round(a.Average(f),1); var summary=new BattleSummary{TechnicalKnowledge=Avg(x=>x.Evaluation.TechnicalEvaluation.Score),EnglishCommunication=Avg(x=>x.Evaluation.CommunicationEvaluation.OverallScore),AnswerStructure=Avg(x=>x.Evaluation.TechnicalEvaluation.DepthScore),Confidence=Avg(x=>x.Evaluation.CommunicationEvaluation.ConfidenceScore),SeniorityDemonstration=Avg(x=>x.Evaluation.TechnicalEvaluation.SeniorityScore),AverageResponseTime=Avg(x=>x.DurationSeconds),FillerWordCount=a.Sum(x=>x.Evaluation.CommunicationEvaluation.FillerWords.Sum(w=>w.Count)),QuestionsAnswered=a.Count,QuestionsSkipped=Math.Max(0,s.CurrentQuestionIndex-a.Count)};
        summary.OverallScore=Math.Round((summary.TechnicalKnowledge*.55+summary.EnglishCommunication*.25+summary.AnswerStructure*.1+summary.Confidence*.1)*10); summary.WeakTopics=s.Technologies.Where((_,i)=>i>=Math.Max(0,s.Technologies.Count-2)).ToList(); summary.StrongTopics=s.Technologies.Except(summary.WeakTopics).Take(3).ToList(); summary.RecommendedNextPractice=summary.TechnicalKnowledge<7?"Practice missing technical concepts":"Practice concise, confident delivery";
        s.Status="completed";s.CompletedAt=DateTime.UtcNow;s.OverallScore=summary.OverallScore;s.TechnicalScore=summary.TechnicalKnowledge;s.EnglishScore=summary.EnglishCommunication;s.ConfidenceScore=summary.Confidence;s.AnswerStructureScore=summary.AnswerStructure;await _repo.UpdateSessionAsync(s);return summary;
    }
    private async Task<BattleSession> Owned(string userId,string id)=>await _repo.GetSessionAsync(id,userId)??throw new KeyNotFoundException("Interview session not found.");
    private static T Parse<T>(string raw,string operation){var start=raw.IndexOf('{');var end=raw.LastIndexOf('}');if(start<0||end<=start)throw new InvalidOperationException($"AI returned invalid JSON for {operation}.");return JsonSerializer.Deserialize<T>(raw[start..(end+1)],Json)??throw new InvalidOperationException($"AI returned an empty {operation} response.");}
    private async Task<string> GenerateWithOpenAiAsync(string userId,string prompt,float temperature,int maxTokens,CancellationToken ct)
    {
        var request=new ChatAiStreamRequest(prompt,"interview","professional",null,temperature,maxTokens,true,[],userId,null);
        var response=new System.Text.StringBuilder();
        await foreach(var token in _ai.StreamAsync(request,ct))response.Append(token);
        var raw=response.ToString();
        if(string.IsNullOrWhiteSpace(raw)||raw.StartsWith("[ERROR]",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException(raw);
        return raw;
    }
    private static void Clamp(AnswerEvaluation e){double C(double v)=>Math.Clamp(v,0,10);var t=e.TechnicalEvaluation;var c=e.CommunicationEvaluation;t.Score=C(t.Score);t.DepthScore=C(t.DepthScore);t.SeniorityScore=C(t.SeniorityScore);c.OverallScore=C(c.OverallScore);c.GrammarScore=C(c.GrammarScore);c.ClarityScore=C(c.ClarityScore);c.FluencyScore=C(c.FluencyScore);c.ConfidenceScore=C(c.ConfidenceScore);c.ProfessionalVocabularyScore=C(c.ProfessionalVocabularyScore);}
    private sealed class QuestionAi{public string Question{get;set;}="";public string QuestionType{get;set;}="definition";public List<string>? AnswerFramework{get;set;}public string Technology{get;set;}="";}
}
