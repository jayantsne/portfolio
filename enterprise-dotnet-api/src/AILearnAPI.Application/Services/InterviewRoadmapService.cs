using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using AILearnAPI.Shared.DTOs.InterviewRoadmap;

namespace AILearnAPI.Application.Services
{
    public class InterviewRoadmapService : IInterviewRoadmapService
    {
        private readonly IInterviewRoadmapRepository _repo;

        public InterviewRoadmapService(IInterviewRoadmapRepository repo)
        {
            _repo = repo;
        }

        // ── Queries ──────────────────────────────────────────────────────────

        public async Task<List<InterviewRoadmapDto>> GetByUserIdAsync(string userId)
        {
            var roadmaps = await _repo.GetByUserIdAsync(userId);
            return roadmaps.Select(ToDto).ToList();
        }

        public async Task<InterviewRoadmapDto?> GetByUserAndStackAsync(string userId, string techStackId)
        {
            var rm = await _repo.GetByUserAndStackAsync(userId, techStackId.ToLowerInvariant());
            return rm == null ? null : ToDto(rm);
        }

        // ── Commands ─────────────────────────────────────────────────────────

        public async Task<InterviewRoadmapDto> SaveAsync(string userId, SaveInterviewRoadmapDto dto)
        {
            // Try to load existing to preserve createdAt
            var existing = await _repo.GetByUserAndStackAsync(userId, dto.techStackId.ToLowerInvariant());

            var roadmap = existing ?? new InterviewRoadmap
            {
                UserId       = userId,
                TechStackId  = dto.techStackId.ToLowerInvariant(),
            };

            roadmap.TechStackName  = dto.techStackName.Trim();
            roadmap.TechStackIcon  = dto.techStackIcon.Trim();
            roadmap.LastAccessedAt = DateTime.UtcNow;
            roadmap.UpdatedAt      = DateTime.UtcNow;
            roadmap.Sections       = dto.sections.Select(MapSection).ToList();

            var saved = await _repo.UpsertAsync(roadmap);
            return ToDto(saved);
        }

        public async Task<InterviewRoadmapDto?> UpdateProgressAsync(
            string userId, string roadmapId, UpdateProgressDto dto)
        {
            var roadmap = await _repo.GetByIdAsync(roadmapId);
            if (roadmap == null || roadmap.UserId != userId) return null;

            // Build quick lookup: topicId → done
            var lookup = dto.topics.ToDictionary(t => t.id, t => t.done);

            foreach (var sec in roadmap.Sections)
            {
                foreach (var topic in sec.Topics)
                {
                    if (lookup.TryGetValue(topic.Id, out var done))
                    {
                        if (done && !topic.Done)
                            topic.CompletedAt = DateTime.UtcNow;
                        else if (!done)
                            topic.CompletedAt = null;

                        topic.Done = done;
                    }
                }
            }

            roadmap.UpdatedAt      = DateTime.UtcNow;
            roadmap.LastAccessedAt = DateTime.UtcNow;

            var updated = await _repo.UpdateAsync(roadmapId, roadmap);
            return updated == null ? null : ToDto(updated);
        }

        public async Task<bool> DeleteAsync(string userId, string roadmapId)
        {
            return await _repo.DeleteByUserAndIdAsync(userId, roadmapId);
        }

        // ── Mapping ──────────────────────────────────────────────────────────

        private static InterviewRoadmapDto ToDto(InterviewRoadmap r)
        {
            var sectionDtos = r.Sections.Select(s => new RoadmapSectionDto
            {
                id       = s.Id,
                title    = s.Title,
                emoji    = s.Emoji,
                expanded = s.Expanded,
                topics   = s.Topics.Select(t => new RoadmapTopicDto
                {
                    id          = t.Id,
                    text        = t.Text,
                    done        = t.Done,
                    completedAt = t.CompletedAt
                }).ToList()
            }).ToList();

            var allTopics = sectionDtos.SelectMany(s => s.topics).ToList();
            var done  = allTopics.Count(t => t.done);
            var total = allTopics.Count;

            return new InterviewRoadmapDto
            {
                id             = r.Id,
                userId         = r.UserId,
                techStackId    = r.TechStackId,
                techStackName  = r.TechStackName,
                techStackIcon  = r.TechStackIcon,
                sections       = sectionDtos,
                doneCount      = done,
                totalCount     = total,
                percent        = total == 0 ? 0 : (int)Math.Round((double)done / total * 100),
                createdAt      = r.CreatedAt,
                updatedAt      = r.UpdatedAt,
                lastAccessedAt = r.LastAccessedAt
            };
        }

        private static RoadmapSectionData MapSection(RoadmapSectionDto s) => new()
        {
            Id       = s.id,
            Title    = s.title,
            Emoji    = s.emoji,
            Expanded = s.expanded,
            Topics   = s.topics.Select(t => new RoadmapTopicData
            {
                Id   = t.id,
                Text = t.text,
                Done = t.done,
                CompletedAt = t.completedAt
            }).ToList()
        };
    }
}
