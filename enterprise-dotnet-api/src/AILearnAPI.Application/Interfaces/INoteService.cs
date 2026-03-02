using AILearnAPI.Shared.DTOs.Notes;

namespace AILearnAPI.Application.Interfaces
{
    public interface INoteService
    {
        Task<List<NoteDto>> GetByUserIdAsync(string userId);
        Task<NoteDto>       CreateAsync(string userId, CreateNoteDto dto);
        /// <summary>Replaces the content of an existing note. Returns null if not found / not owned.</summary>
        Task<NoteDto?>      UpdateAsync(string userId, string noteId, string newContent);
        /// <summary>Deletes a note only if it belongs to userId. Returns false if not found / not owned.</summary>
        Task<bool>          DeleteAsync(string userId, string noteId);
    }
}
