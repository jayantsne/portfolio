using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.Notes;

namespace AILearnAPI.Application.Services
{
    public class NoteService : INoteService
    {
        private readonly INoteRepository _repo;

        public NoteService(INoteRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<NoteDto>> GetByUserIdAsync(string userId)
        {
            var notes = await _repo.GetByUserIdAsync(userId);
            return notes.Select(ToDto).ToList();
        }

        public async Task<NoteDto> CreateAsync(string userId, CreateNoteDto dto)
        {
            var note = new Note
            {
                UserId   = userId,
                Topic    = dto.topic.Trim(),
                Category = dto.category?.Trim() ?? string.Empty,
                Tags     = dto.tags ?? new(),
                Content  = dto.content,
                SavedAt  = DateTime.UtcNow
            };
            var saved = await _repo.CreateAsync(note);
            return ToDto(saved);
        }

        public async Task<bool> DeleteAsync(string userId, string noteId)
        {
            var note = await _repo.GetByIdAndUserIdAsync(noteId, userId);
            if (note == null) return false;
            return await _repo.DeleteAsync(noteId);
        }

        public async Task<NoteDto?> UpdateAsync(string userId, string noteId, UpdateNoteDto dto)
        {
            var note = await _repo.GetByIdAndUserIdAsync(noteId, userId);
            if (note == null) return null;

            if (!string.IsNullOrWhiteSpace(dto.topic))    note.Topic    = dto.topic.Trim();
            if (!string.IsNullOrWhiteSpace(dto.category)) note.Category = dto.category.Trim();
            if (dto.tags != null)                         note.Tags     = dto.tags;
            note.Content = dto.content;

            var updated = await _repo.UpdateAsync(noteId, note);
            return ToDto(updated);
        }

        // ── Mapping ──────────────────────────────────────────────────────────
        private static NoteDto ToDto(Note n) => new()
        {
            id        = n.Id,
            topic     = n.Topic,
            category  = n.Category,
            tags      = n.Tags,
            content   = n.Content,
            savedAt   = n.SavedAt,
            savedAtMs = new DateTimeOffset(n.SavedAt, TimeSpan.Zero).ToUnixTimeMilliseconds()
        };
    }
}
