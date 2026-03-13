using MongoDB.Driver;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;

namespace AILearnAPI.Infrastructure.Repositories
{
    public class InterviewRoadmapRepository
        : BaseRepository<InterviewRoadmap>, IInterviewRoadmapRepository
    {
        public InterviewRoadmapRepository(IMongoDatabase database)
            : base(database, "interview_roadmaps") { }

        public async Task<List<InterviewRoadmap>> GetByUserIdAsync(string userId)
            => await _collection
                .Find(r => r.UserId == userId)
                .SortByDescending(r => r.LastAccessedAt)
                .ToListAsync();

        public async Task<InterviewRoadmap?> GetByUserAndStackAsync(string userId, string techStackId)
            => await _collection
                .Find(r => r.UserId == userId && r.TechStackId == techStackId)
                .FirstOrDefaultAsync();

        public async Task<InterviewRoadmap> UpsertAsync(InterviewRoadmap roadmap)
        {
            var existing = await GetByUserAndStackAsync(roadmap.UserId, roadmap.TechStackId);
            if (existing == null)
            {
                return await CreateAsync(roadmap);
            }
            roadmap.Id        = existing.Id;
            roadmap.CreatedAt = existing.CreatedAt;
            return await UpdateAsync(existing.Id, roadmap);
        }

        public async Task<bool> DeleteByUserAndIdAsync(string userId, string id)
        {
            var result = await _collection
                .DeleteOneAsync(r => r.Id == id && r.UserId == userId);
            return result.DeletedCount > 0;
        }
    }
}
