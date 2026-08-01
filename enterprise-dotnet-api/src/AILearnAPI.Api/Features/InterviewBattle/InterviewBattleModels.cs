using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace AILearnAPI.Api.Features.InterviewBattle;

public sealed class CreateBattleSessionRequest
{
    [Required, StringLength(100)] public string Role { get; set; } = "";
    [Required, StringLength(30)] public string ExperienceLevel { get; set; } = "";
    [Required, MinLength(1), MaxLength(10)] public List<string> Technologies { get; set; } = [];
    [Required] public string InterviewType { get; set; } = "Technical";
    [Required] public string Difficulty { get; set; } = "Intermediate";
    [Required] public string InterviewerStyle { get; set; } = "Normal";
    [Range(5, 30)] public int DurationMinutes { get; set; } = 10;
    [Required] public string AssistanceLevel { get; set; } = "Guided";
    [StringLength(1000)] public string? PlannedQuestion { get; set; }
    [StringLength(100)] public string? PlannedQuestionCategory { get; set; }
    [StringLength(1000)] public string? PlannedAnswerHint { get; set; }
    [StringLength(100)] public string? SourceQuestionId { get; set; }
    [StringLength(100)] public string? SourceNoteId { get; set; }
}

public class SubmitBattleAnswerRequest
{
    [Required] public string QuestionId { get; set; } = "";
    [Required, StringLength(12000, MinimumLength = 1)] public string UserTranscript { get; set; } = "";
    [Range(0, 300)] public int AnswerDurationSeconds { get; set; }
    [Range(0, 120)] public int StartedSpeakingAfterSeconds { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class BattleSession
{
    [BsonId, BsonRepresentation(BsonType.ObjectId)] public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    [BsonElement("userId")] public string UserId { get; set; } = "";
    public string Role { get; set; } = ""; public string ExperienceLevel { get; set; } = "";
    public List<string> Technologies { get; set; } = []; public string InterviewType { get; set; } = "";
    public string Difficulty { get; set; } = ""; public string InterviewerStyle { get; set; } = "";
    public string AssistanceLevel { get; set; } = ""; public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow; public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = "active"; public int CurrentQuestionIndex { get; set; }
    public double OverallScore { get; set; } public double TechnicalScore { get; set; }
    public double EnglishScore { get; set; } public double ConfidenceScore { get; set; }
    public double AnswerStructureScore { get; set; }
    public string PlannedQuestion { get; set; } = ""; public string PlannedQuestionCategory { get; set; } = "";
    public string PlannedAnswerHint { get; set; } = ""; public string SourceQuestionId { get; set; } = ""; public string SourceNoteId { get; set; } = "";
}

public sealed class BattleQuestion
{
    [BsonId, BsonRepresentation(BsonType.ObjectId)] public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    public string SessionId { get; set; } = ""; public string UserId { get; set; } = "";
    public string Question { get; set; } = ""; public string QuestionType { get; set; } = "definition";
    public List<string> AnswerFramework { get; set; } = []; public string Technology { get; set; } = "";
    public int Sequence { get; set; } public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class TechnicalEvaluation { public double Score { get; set; } public List<string> CorrectPoints { get; set; }=[]; public List<string> MissingPoints { get; set; }=[]; public List<string> IncorrectPoints { get; set; }=[]; public double DepthScore { get; set; } public double SeniorityScore { get; set; } public string Feedback { get; set; }=""; }
public sealed class FillerWord { public string Word { get; set; }=""; public int Count { get; set; } }
public sealed class CommunicationEvaluation { public double OverallScore { get; set; } public double GrammarScore { get; set; } public double ClarityScore { get; set; } public double FluencyScore { get; set; } public double ConfidenceScore { get; set; } public double ProfessionalVocabularyScore { get; set; } public List<FillerWord> FillerWords { get; set; }=[]; public List<string> UncertainPhrases { get; set; }=[]; public List<string> LongPauses { get; set; }=[]; public string Feedback { get; set; }=""; }
public sealed class LanguageCorrection { public string Original { get; set; }=""; public string Corrected { get; set; }=""; public string EasyToSpeak { get; set; }=""; public string Explanation { get; set; }=""; }
public sealed class AnswerImprovement
{
    public List<string> IdealStructure { get; set; }=[];
    public string StartWith { get; set; }="";
    public List<string> KeyPointsToInclude { get; set; }=[];
    public string ImprovedAnswer { get; set; }="";
    public string EasySpokenAnswer { get; set; }="";
    public string ShortAnswer { get; set; }="";
    public string WhyThisWorks { get; set; }="";
}
public sealed class AnswerEvaluation { public TechnicalEvaluation TechnicalEvaluation { get; set; }=new(); public CommunicationEvaluation CommunicationEvaluation { get; set; }=new(); public List<LanguageCorrection> LanguageCorrections { get; set; }=[]; public AnswerImprovement AnswerImprovement { get; set; }=new(); public string FollowUpQuestion { get; set; }=""; public bool ShouldAddToRevision { get; set; } public string RevisionReason { get; set; }=""; }

public sealed class BattleAnswer
{
    [BsonId, BsonRepresentation(BsonType.ObjectId)] public string Id { get; set; }=ObjectId.GenerateNewId().ToString();
    public string SessionId { get; set; }=""; public string QuestionId { get; set; }=""; public string UserId { get; set; }="";
    public string Transcript { get; set; }=""; public int DurationSeconds { get; set; } public int StartedSpeakingAfterSeconds { get; set; }
    public AnswerEvaluation Evaluation { get; set; }=new(); public string? RetryOfAnswerId { get; set; } public int AttemptNumber { get; set; }=1; public DateTime CreatedAt { get; set; }=DateTime.UtcNow;
}

public sealed class BattleSummary { public double OverallScore { get; set; } public double TechnicalKnowledge { get; set; } public double EnglishCommunication { get; set; } public double AnswerStructure { get; set; } public double Confidence { get; set; } public double SeniorityDemonstration { get; set; } public double AverageResponseTime { get; set; } public int FillerWordCount { get; set; } public int QuestionsAnswered { get; set; } public int QuestionsSkipped { get; set; } public List<string> StrongTopics { get; set; }=[]; public List<string> WeakTopics { get; set; }=[]; public string RecommendedNextPractice { get; set; }=""; }

public sealed class RetryBattleAnswerRequest : SubmitBattleAnswerRequest { }
public sealed class RetryComparison { public BattleAnswer FirstAttempt { get; set; }=new(); public BattleAnswer SecondAttempt { get; set; }=new(); public double TechnicalImprovement { get; set; } public double EnglishImprovement { get; set; } public int FillerWordsReduced { get; set; } public int MissingPointsReduced { get; set; } }
public sealed class BattleHistoryDetail { public BattleSession Session { get; set; }=new(); public List<BattleQuestion> Questions { get; set; }=[]; public List<BattleAnswer> Answers { get; set; }=[]; }

public sealed class InterviewRevisionItem
{
    [BsonId,BsonRepresentation(BsonType.ObjectId)] public string Id { get; set; }=ObjectId.GenerateNewId().ToString(); public string UserId { get; set; }=""; public string Topic { get; set; }=""; public string Technology { get; set; }=""; public string Question { get; set; }=""; public string QuestionType { get; set; }=""; public List<string> MissingConcepts { get; set; }=[]; public List<string> IncorrectConcepts { get; set; }=[]; public double TechnicalScore { get; set; } public double EnglishScore { get; set; } public int AttemptCount { get; set; } public DateTime LastAttemptAt { get; set; }=DateTime.UtcNow; public DateTime NextRevisionAt { get; set; }=DateTime.UtcNow.AddDays(1); public int RevisionLevel { get; set; } public bool Mastered { get; set; }
}
public sealed class RevisionAttemptRequest { [Range(0,10)] public double TechnicalScore { get; set; } [Range(0,10)] public double EnglishScore { get; set; } }
public sealed class UserEnglishMistake
{
    [BsonId,BsonRepresentation(BsonType.ObjectId)] public string Id { get; set; }=ObjectId.GenerateNewId().ToString(); public string UserId { get; set; }=""; public string OriginalSentence { get; set; }=""; public string CorrectedSentence { get; set; }=""; public string EasyToSpeakSentence { get; set; }=""; public string MistakeType { get; set; }="Sentence structure"; public string Explanation { get; set; }=""; public int OccurrenceCount { get; set; }=1; public DateTime FirstDetectedAt { get; set; }=DateTime.UtcNow; public DateTime LastDetectedAt { get; set; }=DateTime.UtcNow; public bool Mastered { get; set; }
}
