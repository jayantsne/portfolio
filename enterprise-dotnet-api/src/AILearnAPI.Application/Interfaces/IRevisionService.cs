using AILearnAPI.Shared.DTOs.Revision;

namespace AILearnAPI.Application.Interfaces
{
    public interface IRevisionService
    {
        /// <summary>Returns all notes due for review today for the given user.</summary>
        Task<TodayRevisionDto> GetTodayRevisionAsync(string userId);

        /// <summary>
        /// Enrols a note in spaced repetition for the user.
        /// Idempotent — returns the existing item if already enrolled.
        /// </summary>
        Task<RevisionItemDto> EnrollNoteAsync(string userId, string noteId);

        /// <summary>
        /// Generates 3–5 AI questions for the note. Falls back to basic
        /// template questions when the AI call fails or returns invalid JSON.
        /// </summary>
        Task<RevisionQuestionsResponseDto> GetQuestionsAsync(string userId, string noteId);

        /// <summary>
        /// Records the user's self-assessed difficulty and reschedules
        /// the next review using the SM-2 spaced-repetition algorithm.
        /// </summary>
        Task<RevisionItemDto> SubmitFeedbackAsync(string userId, string revisionItemId, string difficulty);

        /// <summary>Returns every enrolled note for the user, ordered by NextReviewDate.</summary>
        Task<EnrolledNotesDto> GetEnrolledAsync(string userId);

        /// <summary>Unenrols a note (removes the RevisionItem document).</summary>
        Task<bool> UnenrollNoteAsync(string userId, string noteId);
    }
}
