using AILearnAPI.Shared.DTOs.Notes;

namespace AILearnAPI.Application.Interfaces
{
    public interface INoteService
    {
        Task<List<NoteDto>> GetByUserIdAsync(string userId);
        Task<NoteDto>       CreateAsync(string userId, CreateNoteDto dto);
        /// <summary>Updates a note (topic/category/tags/content). Returns null if not found / not owned.</summary>
        Task<NoteDto?>      UpdateAsync(string userId, string noteId, UpdateNoteDto dto);
        /// <summary>Deletes a note only if it belongs to userId. Returns false if not found / not owned.</summary>
        Task<bool>          DeleteAsync(string userId, string noteId);
    }
}
