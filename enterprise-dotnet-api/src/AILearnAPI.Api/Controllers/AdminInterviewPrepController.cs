using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AILearnAPI.Api.Controllers;

[ApiController]
[Route("api/admin-interview-prep")]
[Authorize]
public class AdminInterviewPrepController : ControllerBase
{
    private readonly IMongoCollection<AdminInterviewPrepQuestion> _questions;
    private readonly ILogger<AdminInterviewPrepController> _logger;

    public AdminInterviewPrepController(
        IMongoDatabase database,
        ILogger<AdminInterviewPrepController> logger)
    {
        _questions = database.GetCollection<AdminInterviewPrepQuestion>("admin_interview_prep_questions");
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<AdminInterviewPrepResponse>> GetAll(
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] bool includeCovered = true)
    {
        var ownerId = GetUserId();
        var filter = Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.OwnerUserId, ownerId);

        if (!includeCovered)
            filter &= Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.IsCovered, false);

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            filter &= Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.Category, category.Trim());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            filter &= Builders<AdminInterviewPrepQuestion>.Filter.Or(
                Builders<AdminInterviewPrepQuestion>.Filter.Regex(x => x.Question, new BsonRegularExpression(q, "i")),
                Builders<AdminInterviewPrepQuestion>.Filter.Regex(x => x.Category, new BsonRegularExpression(q, "i")),
                Builders<AdminInterviewPrepQuestion>.Filter.Regex(x => x.Tags, new BsonRegularExpression(q, "i")));
        }

        var items = await _questions.Find(filter)
            .SortBy(x => x.IsCovered)
            .ThenByDescending(x => x.UpdatedAt)
            .ToListAsync();

        var allForStats = await _questions.Find(x => x.OwnerUserId == ownerId).ToListAsync();

        return Ok(new AdminInterviewPrepResponse
        {
            Questions = items.Select(ToDto).ToList(),
            Categories = allForStats
                .Select(x => x.Category)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(x => x)
                .ToList(),
            Total = allForStats.Count,
            Covered = allForStats.Count(x => x.IsCovered),
            DailyTarget = 5
        });
    }

    [HttpGet("daily")]
    public async Task<ActionResult<List<AdminInterviewPrepQuestionDto>>> GetDailyPlan(
        [FromQuery] int target = 5,
        [FromQuery] string? category = null)
    {
        var ownerId = GetUserId();
        target = Math.Clamp(target, 1, 20);
        var today = DateTime.UtcNow.Date;

        var ownerFilter = Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.OwnerUserId, ownerId);
        var scopeFilter = ownerFilter;

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            scopeFilter &= Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.Category, category.Trim());

        var plannedToday = await _questions.Find(scopeFilter &
                Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.PlannedDate, today))
            .SortBy(x => x.UpdatedAt)
            .Limit(target)
            .ToListAsync();

        if (plannedToday.Count < target)
        {
            var remaining = await _questions.Find(scopeFilter &
                    Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.IsCovered, false) &
                    Builders<AdminInterviewPrepQuestion>.Filter.Ne(x => x.PlannedDate, today))
                .SortBy(x => x.PlannedDate)
                .ThenBy(x => x.UpdatedAt)
                .Limit(target - plannedToday.Count)
                .ToListAsync();

            if (remaining.Count > 0)
            {
                var ids = remaining.Select(x => x.Id).ToList();
                await _questions.UpdateManyAsync(
                    Builders<AdminInterviewPrepQuestion>.Filter.In(x => x.Id, ids) & ownerFilter,
                    Builders<AdminInterviewPrepQuestion>.Update
                        .Set(x => x.PlannedDate, today)
                        .Set(x => x.UpdatedAt, DateTime.UtcNow));

                foreach (var item in remaining)
                {
                    item.PlannedDate = today;
                    item.UpdatedAt = DateTime.UtcNow;
                }
            }

            plannedToday.AddRange(remaining);
        }

        return Ok(plannedToday.Select(ToDto).ToList());
    }

    [HttpPost("import")]
    public async Task<ActionResult<AdminInterviewPrepImportResult>> Import([FromBody] AdminInterviewPrepImportRequest request)
    {
        if (request.Questions.Count == 0)
            return BadRequest(new { message = "At least one question is required." });

        var ownerId = GetUserId();

        if (request.ReplaceExisting)
            await _questions.DeleteManyAsync(x => x.OwnerUserId == ownerId);

        var now = DateTime.UtcNow;
        var docs = request.Questions
            .Where(x => !string.IsNullOrWhiteSpace(x.Question))
            .Select(x => new AdminInterviewPrepQuestion
            {
                OwnerUserId = ownerId,
                Question = x.Question.Trim(),
                Category = NormalizeCategory(x.Category),
                Difficulty = string.IsNullOrWhiteSpace(x.Difficulty) ? "Medium" : x.Difficulty.Trim(),
                Tags = x.Tags.Select(t => t.Trim()).Where(t => t.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                AnswerHint = x.AnswerHint?.Trim() ?? string.Empty,
                NoteUrl = x.NoteUrl?.Trim() ?? string.Empty,
                AllowedUserIds = x.AllowedUserIds.Select(u => u.Trim()).Where(u => u.Length > 0).Distinct().ToList(),
                CreatedAt = now,
                UpdatedAt = now
            })
            .ToList();

        // Non-replacing imports are synchronization-safe: preserve existing
        // user progress and insert only questions not already in this user's
        // personal library. Comparison ignores case and surrounding spacing.
        if (!request.ReplaceExisting && docs.Count > 0)
        {
            var existingQuestions = await _questions
                .Find(x => x.OwnerUserId == ownerId)
                .Project(x => x.Question)
                .ToListAsync();

            var known = existingQuestions
                .Select(NormalizeQuestionKey)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            docs = docs
                .Where(x => known.Add(NormalizeQuestionKey(x.Question)))
                .ToList();
        }

        if (docs.Count == 0)
            return Ok(new AdminInterviewPrepImportResult { Imported = 0 });

        await _questions.InsertManyAsync(docs);
        _logger.LogInformation("Admin interview prep import: {Count} questions for {UserId}", docs.Count, ownerId);

        return Ok(new AdminInterviewPrepImportResult { Imported = docs.Count });
    }

    [HttpPatch("{id}/covered")]
    public async Task<ActionResult<AdminInterviewPrepQuestionDto>> SetCovered(string id, [FromBody] SetCoveredRequest request)
    {
        var ownerId = GetUserId();
        var update = Builders<AdminInterviewPrepQuestion>.Update
            .Set(x => x.IsCovered, request.Covered)
            .Set(x => x.CoveredAt, request.Covered ? DateTime.UtcNow : null)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var filter = Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.Id, id) &
                     Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.OwnerUserId, ownerId);
        var updated = await _questions.FindOneAndUpdateAsync<AdminInterviewPrepQuestion>(
            filter,
            update,
            new FindOneAndUpdateOptions<AdminInterviewPrepQuestion, AdminInterviewPrepQuestion> { ReturnDocument = ReturnDocument.After });

        if (updated == null)
            return NotFound(new { message = "Question not found." });

        return Ok(ToDto(updated));
    }

    [HttpPatch("{id}/plan")]
    public async Task<ActionResult<AdminInterviewPrepQuestionDto>> SetPlanDate(string id, [FromBody] SetPlanDateRequest request)
    {
        var ownerId = GetUserId();
        var planDate = request.PlannedDate?.Date ?? DateTime.UtcNow.Date;

        var update = Builders<AdminInterviewPrepQuestion>.Update
            .Set(x => x.PlannedDate, planDate)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var filter = Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.Id, id) &
                     Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.OwnerUserId, ownerId);
        var updated = await _questions.FindOneAndUpdateAsync<AdminInterviewPrepQuestion>(
            filter,
            update,
            new FindOneAndUpdateOptions<AdminInterviewPrepQuestion, AdminInterviewPrepQuestion> { ReturnDocument = ReturnDocument.After });

        if (updated == null)
            return NotFound(new { message = "Question not found." });

        return Ok(ToDto(updated));
    }

    [HttpPost("{id}/access")]
    public async Task<ActionResult<AdminInterviewPrepQuestionDto>> SetAccess(string id, [FromBody] SetQuestionAccessRequest request)
    {
        var ownerId = GetUserId();
        var allowedUsers = request.AllowedUserIds
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .Distinct()
            .ToList();

        var update = Builders<AdminInterviewPrepQuestion>.Update
            .Set(x => x.AllowedUserIds, allowedUsers)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var filter = Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.Id, id) &
                     Builders<AdminInterviewPrepQuestion>.Filter.Eq(x => x.OwnerUserId, ownerId);
        var updated = await _questions.FindOneAndUpdateAsync<AdminInterviewPrepQuestion>(
            filter,
            update,
            new FindOneAndUpdateOptions<AdminInterviewPrepQuestion, AdminInterviewPrepQuestion> { ReturnDocument = ReturnDocument.After });

        if (updated == null)
            return NotFound(new { message = "Question not found." });

        return Ok(ToDto(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var ownerId = GetUserId();
        var result = await _questions.DeleteOneAsync(x => x.Id == id && x.OwnerUserId == ownerId);
        return result.DeletedCount == 0 ? NotFound(new { message = "Question not found." }) : NoContent();
    }

    [HttpPost("ai-helper")]
    public ActionResult<AdminInterviewPrepAiHelperResponse> AiHelper([FromBody] AdminInterviewPrepAiHelperRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { message = "Question is required." });

        var q = request.Question.Trim();
        var category = NormalizeCategory(request.Category);

        return Ok(new AdminInterviewPrepAiHelperResponse
        {
            StudyPrompt = $"Explain this {category} interview question for a 10-year experienced developer: {q}. Include what it is, why it matters, implementation details, pitfalls, and a concise interview answer.",
            NotesPrompt = $"Create copy-paste friendly interview revision notes for: {q}. Avoid fenced code blocks. Include definition, why needed, implementation, real example, and short interview answer.",
            PracticePrompt = $"Ask me 5 follow-up interview questions based on: {q}. Start easy, then go senior-level with scenario-based questions."
        });
    }

    private string GetUserId() =>
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? string.Empty;

    private static string NormalizeCategory(string? category) =>
        string.IsNullOrWhiteSpace(category) ? "General" : category.Trim();

    private static string NormalizeQuestionKey(string? question) =>
        string.Join(' ', (question ?? string.Empty)
            .Trim()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static AdminInterviewPrepQuestionDto ToDto(AdminInterviewPrepQuestion q) => new()
    {
        Id = q.Id,
        Question = q.Question,
        Category = q.Category,
        Difficulty = q.Difficulty,
        Tags = q.Tags,
        AnswerHint = q.AnswerHint,
        NoteUrl = q.NoteUrl,
        IsCovered = q.IsCovered,
        CoveredAt = q.CoveredAt,
        PlannedDate = q.PlannedDate,
        AllowedUserIds = q.AllowedUserIds,
        CreatedAt = q.CreatedAt,
        UpdatedAt = q.UpdatedAt
    };
}

[BsonIgnoreExtraElements]
public class AdminInterviewPrepQuestion
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("question")]
    public string Question { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = "General";

    [BsonElement("difficulty")]
    public string Difficulty { get; set; } = "Medium";

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    [BsonElement("answerHint")]
    public string AnswerHint { get; set; } = string.Empty;

    [BsonElement("noteUrl")]
    public string NoteUrl { get; set; } = string.Empty;

    [BsonElement("isCovered")]
    public bool IsCovered { get; set; }

    [BsonElement("coveredAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? CoveredAt { get; set; }

    [BsonElement("plannedDate")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime? PlannedDate { get; set; }

    [BsonElement("allowedUserIds")]
    public List<string> AllowedUserIds { get; set; } = new();

    [BsonElement("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AdminInterviewPrepQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public string AnswerHint { get; set; } = string.Empty;
    public string NoteUrl { get; set; } = string.Empty;
    public bool IsCovered { get; set; }
    public DateTime? CoveredAt { get; set; }
    public DateTime? PlannedDate { get; set; }
    public List<string> AllowedUserIds { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AdminInterviewPrepResponse
{
    public List<AdminInterviewPrepQuestionDto> Questions { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public int Total { get; set; }
    public int Covered { get; set; }
    public int DailyTarget { get; set; }
}

public class AdminInterviewPrepImportQuestion
{
    public string Question { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Difficulty { get; set; } = "Medium";
    public List<string> Tags { get; set; } = new();
    public string? AnswerHint { get; set; }
    public string? NoteUrl { get; set; }
    public List<string> AllowedUserIds { get; set; } = new();
}

public class AdminInterviewPrepImportRequest
{
    public bool ReplaceExisting { get; set; }
    public List<AdminInterviewPrepImportQuestion> Questions { get; set; } = new();
}

public class AdminInterviewPrepImportResult
{
    public int Imported { get; set; }
}

public class SetCoveredRequest
{
    public bool Covered { get; set; }
}

public class SetPlanDateRequest
{
    public DateTime? PlannedDate { get; set; }
}

public class SetQuestionAccessRequest
{
    public List<string> AllowedUserIds { get; set; } = new();
}

public class AdminInterviewPrepAiHelperRequest
{
    public string Question { get; set; } = string.Empty;
    public string? Category { get; set; }
}

public class AdminInterviewPrepAiHelperResponse
{
    public string StudyPrompt { get; set; } = string.Empty;
    public string NotesPrompt { get; set; } = string.Empty;
    public string PracticePrompt { get; set; } = string.Empty;
}
