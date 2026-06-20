using System.ComponentModel.DataAnnotations;

namespace AILearnAPI.Shared.DTOs.Revision
{
    // ── Revision item state ───────────────────────────────────────────────────

    public class RevisionItemDto
    {
        public string   Id               { get; set; } = string.Empty;
        public string   NoteId           { get; set; } = string.Empty;
        public string   NoteTopic        { get; set; } = string.Empty;
        public string   NoteContent      { get; set; } = string.Empty;
        public string   NoteCategory     { get; set; } = string.Empty;
        public DateTime NextReviewDate   { get; set; }
        public DateTime? LastReviewedDate { get; set; }
        public string   Difficulty       { get; set; } = "new";
        public int      ReviewCount      { get; set; }
        public int      IntervalDays     { get; set; }
        public bool     IsDueToday       { get; set; }
    }

    // ── Today's revision dashboard ────────────────────────────────────────────

    public class TodayRevisionDto
    {
        public int                  TotalDue  { get; set; }
        public int                  TotalNew  { get; set; }
        public List<RevisionItemDto> Items    { get; set; } = new();
    }

    // ── AI-generated questions ────────────────────────────────────────────────

    public class RevisionQuestionDto
    {
        public string Question    { get; set; } = string.Empty;
        public string Answer      { get; set; } = string.Empty;
        public string Explanation { get; set; } = string.Empty;
        /// <summary>conceptual | factual | practical</summary>
        public string Type        { get; set; } = "conceptual";
    }

    public class RevisionQuestionsResponseDto
    {
        public string                    NoteId    { get; set; } = string.Empty;
        public string                    NoteTopic { get; set; } = string.Empty;
        public List<RevisionQuestionDto> Questions { get; set; } = new();
        public bool                      IsFallback { get; set; } = false;
    }

    // ── Enroll request ────────────────────────────────────────────────────────

    public class EnrollNoteDto
    {
        [Required]
        public string NoteId { get; set; } = string.Empty;
    }

    // ── Feedback / scheduling input ───────────────────────────────────────────

    public class SubmitFeedbackDto
    {
        /// <summary>easy | medium | hard</summary>
        [Required]
        [RegularExpression("^(easy|medium|hard)$", ErrorMessage = "Difficulty must be easy, medium, or hard.")]
        public string Difficulty { get; set; } = string.Empty;
    }

    // ── Enrolled-notes list ───────────────────────────────────────────────────

    public class EnrolledNotesDto
    {
        public int                    TotalEnrolled { get; set; }
        public int                    TotalDue      { get; set; }
        public List<RevisionItemDto>  Items         { get; set; } = new();
    }
}
