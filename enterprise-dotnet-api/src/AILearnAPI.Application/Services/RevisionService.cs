using System.Text.Json;
using System.Text.RegularExpressions;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.Revision;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    public class RevisionService : IRevisionService
    {
        private readonly IRevisionRepository _revisionRepo;
        private readonly INoteRepository     _noteRepo;
        private readonly ILogger<RevisionService> _logger;
        private readonly IRevisionAiGenerator _aiGenerator;

        private static readonly JsonSerializerOptions _jsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            AllowTrailingCommas = true,
        };

        public RevisionService(
            IRevisionRepository revisionRepo,
            INoteRepository     noteRepo,
            ILogger<RevisionService> logger,
            IRevisionAiGenerator aiGenerator)
        {
            _revisionRepo = revisionRepo;
            _noteRepo     = noteRepo;
            _logger       = logger;
            _aiGenerator  = aiGenerator;
        }

        // ── Core API ────────────────────────────────────────────────────────

        public async Task<TodayRevisionDto> GetTodayRevisionAsync(string userId)
        {
            var endOfDay = DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            var dueItems = await _revisionRepo.GetDueForReviewAsync(userId, endOfDay);

            var dtos = new List<RevisionItemDto>();
            foreach (var item in dueItems)
            {
                var dto = await HydrateItemAsync(item);
                dtos.Add(dto);
            }

            dtos = dtos.OrderBy(d => d.NextReviewDate).ToList();

            return new TodayRevisionDto
            {
                TotalDue  = dtos.Count,
                TotalNew  = dtos.Count(d => d.Difficulty == "new"),
                Items     = dtos,
            };
        }

        public async Task<RevisionItemDto> EnrollNoteAsync(string userId, string noteId)
        {
            // Idempotent — return existing if already enrolled
            var existing = await _revisionRepo.GetByUserAndNoteAsync(userId, noteId);
            if (existing != null)
                return await HydrateItemAsync(existing);

            // Verify the note belongs to the user
            var note = await _noteRepo.GetByIdAndUserIdAsync(noteId, userId)
                ?? throw new KeyNotFoundException($"Note {noteId} not found for user.");

            var item = new RevisionItem
            {
                UserId         = userId,
                NoteId         = noteId,
                NextReviewDate = DateTime.UtcNow,   // due immediately on enrol
                Difficulty     = "new",
                ReviewCount    = 0,
                IntervalDays   = 1,
                EaseFactor     = 2.5f,
            };

            await _revisionRepo.CreateAsync(item);
            return await HydrateItemAsync(item);
        }

        public async Task<RevisionQuestionsResponseDto> GetQuestionsAsync(string userId, string noteId)
        {
            var note = await _noteRepo.GetByIdAndUserIdAsync(noteId, userId)
                ?? throw new KeyNotFoundException($"Note {noteId} not found.");

            var prompt  = BuildQuestionPrompt(note.Topic, note.Content);
            var raw     = string.Empty;
            var isFallback = false;

            try
            {
                raw = await _aiGenerator.GenerateAsync(prompt);
                var questions = ParseQuestionsJson(raw, note.Topic, note.Content);
                return new RevisionQuestionsResponseDto
                {
                    NoteId     = noteId,
                    NoteTopic  = note.Topic,
                    Questions  = questions,
                    IsFallback = false,
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI question generation failed for note {NoteId}, using fallback.", noteId);
                isFallback = true;
            }

            return new RevisionQuestionsResponseDto
            {
                NoteId     = noteId,
                NoteTopic  = note.Topic,
                Questions  = BuildFallbackQuestions(note.Topic, note.Content),
                IsFallback = isFallback,
            };
        }

        public async Task<RevisionItemDto> SubmitFeedbackAsync(string userId, string revisionItemId, string difficulty)
        {
            var item = await _revisionRepo.GetByIdAndUserIdAsync(revisionItemId, userId)
                ?? throw new KeyNotFoundException($"RevisionItem {revisionItemId} not found.");

            ApplySpacedRepetition(item, difficulty);

            await _revisionRepo.UpdateAsync(item.Id, item);
            return await HydrateItemAsync(item);
        }

        public async Task<EnrolledNotesDto> GetEnrolledAsync(string userId)
        {
            var all  = await _revisionRepo.GetByUserIdAsync(userId);
            var now  = DateTime.UtcNow;
            var dtos = new List<RevisionItemDto>();

            foreach (var item in all.OrderBy(i => i.NextReviewDate))
                dtos.Add(await HydrateItemAsync(item));

            return new EnrolledNotesDto
            {
                TotalEnrolled = dtos.Count,
                TotalDue      = dtos.Count(d => d.IsDueToday),
                Items         = dtos,
            };
        }

        public async Task<bool> UnenrollNoteAsync(string userId, string noteId)
        {
            var item = await _revisionRepo.GetByUserAndNoteAsync(userId, noteId);
            if (item == null) return false;
            await _revisionRepo.DeleteAsync(item.Id);
            return true;
        }

        // ── Spaced Repetition (SM-2 simplified) ─────────────────────────────

        private static void ApplySpacedRepetition(RevisionItem item, string difficulty)
        {
            item.LastReviewedDate = DateTime.UtcNow;
            item.ReviewCount++;
            item.Difficulty = difficulty;

            switch (difficulty.ToLowerInvariant())
            {
                case "easy":
                    // Increase interval, boost ease factor
                    item.EaseFactor   = Math.Min(3.0f, item.EaseFactor + 0.1f);
                    item.IntervalDays = Math.Max(3, (int)Math.Round(item.IntervalDays * item.EaseFactor));
                    break;

                case "medium":
                    // Keep interval but reset to at least 1 day
                    item.IntervalDays = Math.Max(1, item.IntervalDays);
                    // EaseFactor unchanged
                    break;

                case "hard":
                    // Reset interval, penalise ease factor
                    item.EaseFactor   = Math.Max(1.3f, item.EaseFactor - 0.2f);
                    item.IntervalDays = 1;
                    break;
            }

            item.NextReviewDate = DateTime.UtcNow.AddDays(item.IntervalDays);
            item.UpdatedAt      = DateTime.UtcNow;
        }

        // ── AI prompt builder ────────────────────────────────────────────────

        private static string BuildQuestionPrompt(string topic, string content)
        {
            // Truncate content to ~1500 chars to stay within token limits
            var truncated = content.Length > 1500 ? content[..1500] + "\u2026" : content;

            return
                "You are an expert flashcard generator for active-recall learning.\n\n" +
                "Given the note below, generate exactly 4 questions that help the user memorize and understand the material.\n\n" +
                $"NOTE TOPIC: {topic}\n\n" +
                $"NOTE CONTENT:\n{truncated}\n\n" +
                "STRICT RULES:\n" +
                "1. Return ONLY valid JSON \u2014 no markdown fences, no preamble, no trailing text.\n" +
                "2. Every field must be non-empty.\n" +
                "3. Keep answers to 1\u20133 sentences. No markdown inside answers.\n" +
                "4. Keep questions specific to THIS content \u2014 no generic questions.\n\n" +
                "Required JSON shape:\n" +
                "{\n" +
                "  \"questions\": [\n" +
                "    { \"type\": \"conceptual\", \"question\": \"A what/why question\",      \"answer\": \"Concise answer\",        \"explanation\": \"Why it matters\" },\n" +
                "    { \"type\": \"factual\",    \"question\": \"A how/when/what question\",  \"answer\": \"Short factual answer\",  \"explanation\": \"Why this fact is useful\" },\n" +
                "    { \"type\": \"practical\",  \"question\": \"How would you use this?\",   \"answer\": \"Practical usage\",       \"explanation\": \"Real-world context\" },\n" +
                "    { \"type\": \"conceptual\", \"question\": \"A deeper follow-up question\", \"answer\": \"Answer\",             \"explanation\": \"Why this is important\" }\n" +
                "  ]\n" +
                "}";
        }

        // ── JSON parser (3-stage: clean → fence-extract → fallback) ─────────

        private List<RevisionQuestionDto> ParseQuestionsJson(string raw, string topic, string content)
        {
            // Stage 1: direct parse
            try
            {
                var direct = JsonSerializer.Deserialize<QuestionPayload>(raw.Trim(), _jsonOpts);
                if (IsValidPayload(direct)) return MapToDto(direct!.Questions!);
            }
            catch { /* fall through */ }

            // Stage 2: extract from ```json ... ``` fence or first { ... }
            var extracted = ExtractJson(raw);
            if (extracted != null)
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<QuestionPayload>(extracted, _jsonOpts);
                    if (IsValidPayload(parsed)) return MapToDto(parsed!.Questions!);
                }
                catch { /* fall through */ }
            }

            // Stage 3: fallback
            return BuildFallbackQuestions(topic, content);
        }

        private static string? ExtractJson(string text)
        {
            // Try ```json...``` fence
            var fenceMatch = Regex.Match(text, @"```(?:json)?\s*([\s\S]*?)```", RegexOptions.IgnoreCase);
            if (fenceMatch.Success) return fenceMatch.Groups[1].Value.Trim();

            // Try first { ... } block
            var start = text.IndexOf('{');
            var end   = text.LastIndexOf('}');
            if (start >= 0 && end > start) return text[start..(end + 1)];

            return null;
        }

        private static bool IsValidPayload(QuestionPayload? p) =>
            p?.Questions != null && p.Questions.Count > 0 &&
            p.Questions.All(q => !string.IsNullOrWhiteSpace(q.Question) && !string.IsNullOrWhiteSpace(q.Answer));

        private static List<RevisionQuestionDto> MapToDto(List<QuestionPayloadItem> items) =>
            items.Select(q => new RevisionQuestionDto
            {
                Question    = q.Question    ?? string.Empty,
                Answer      = q.Answer      ?? string.Empty,
                Explanation = q.Explanation ?? string.Empty,
                Type        = q.Type        ?? "conceptual",
            }).ToList();

        private static List<RevisionQuestionDto> BuildFallbackQuestions(string topic, string content)
        {
            var preview = content.Length > 80 ? content[..80] + "…" : content;
            return new List<RevisionQuestionDto>
            {
                new()
                {
                    Type        = "conceptual",
                    Question    = $"What is the main concept covered in the note about '{topic}'?",
                    Answer      = $"Review your note: \"{preview}\"",
                    Explanation = "Understanding the core concept is the first step to mastering the topic.",
                },
                new()
                {
                    Type        = "factual",
                    Question    = $"What are the key points you should remember about '{topic}'?",
                    Answer      = "Re-read the note and identify 3 key facts or rules.",
                    Explanation = "Active recall of key facts strengthens long-term retention.",
                },
                new()
                {
                    Type        = "practical",
                    Question    = $"How would you apply what you learned about '{topic}' in a real project?",
                    Answer      = "Think of a concrete scenario from your own work where this knowledge applies.",
                    Explanation = "Connecting theory to practice is the most effective way to solidify understanding.",
                },
            };
        }

        // ── Helper: hydrate DTO with note data ───────────────────────────────

        private async Task<RevisionItemDto> HydrateItemAsync(RevisionItem item)
        {
            var note = await _noteRepo.GetByIdAsync(item.NoteId);
            var endOfDay = DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
            return new RevisionItemDto
            {
                Id                = item.Id,
                NoteId            = item.NoteId,
                NoteTopic         = note?.Topic    ?? "(deleted note)",
                NoteContent       = note?.Content  ?? string.Empty,
                NoteCategory      = note?.Category ?? string.Empty,
                NextReviewDate    = item.NextReviewDate,
                LastReviewedDate  = item.LastReviewedDate,
                Difficulty        = item.Difficulty,
                ReviewCount       = item.ReviewCount,
                IntervalDays      = item.IntervalDays,
                IsDueToday        = item.NextReviewDate <= endOfDay,
            };
        }

        // ── Internal JSON shims ──────────────────────────────────────────────

        private sealed class QuestionPayload
        {
            public List<QuestionPayloadItem>? Questions { get; set; }
        }

        private sealed class QuestionPayloadItem
        {
            public string? Type        { get; set; }
            public string? Question    { get; set; }
            public string? Answer      { get; set; }
            public string? Explanation { get; set; }
        }
    }
}
