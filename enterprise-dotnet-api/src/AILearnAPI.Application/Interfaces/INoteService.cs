using AILearnAPI.Shared.DTOs.Notes;

namespace AILearnAPI.Application.Interfaces
{
    public interface INoteService
    {
        Task<List<NoteDto>> GetByUserIdAsync(string userId);
        Task<NoteDto>       CreateAsync(string userId, CreateNoteDto dto);
        /// <summary>Deletes a note only if it belongs to userId. Returns false if not found / not owned.</summary>
        Task<bool>          DeleteAsync(string userId, string noteId);
    }
}
