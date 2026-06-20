using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services
{
    /// <summary>
    /// Semantic Kernel–style memory service.
    ///
    /// Store path:
    ///   content → embedding → persist to MongoDB
    ///
    /// Retrieve path:
    ///   query → embedding → cosine similarity against user's stored memories
    ///   → return top-K formatted context string for prompt injection
    ///
    /// Filter rule: only store content longer than 80 characters (avoids
    /// polluting the store with trivial one-liners).
    /// </summary>
    public class SemanticMemoryService : ISemanticMemoryService
    {
        private const int MinContentLength = 80;   // below this = not worth storing
        private const int MaxStoredMemories = 100; // per-user cap (prune oldest)

        private readonly IUserMemoryRepository _repo;
        private readonly IEmbeddingService     _embedSvc;
        private readonly ILogger<SemanticMemoryService> _logger;

        public SemanticMemoryService(
            IUserMemoryRepository repo,
            IEmbeddingService embedSvc,
            ILogger<SemanticMemoryService> logger)
        {
            _repo     = repo;
            _embedSvc = embedSvc;
            _logger   = logger;
        }

        // ── Store ────────────────────────────────────────────────────────────

        public async Task StoreAsync(string userId, string topic, string content, CancellationToken ct = default)
        {
            // Smart filter: skip short, trivial, or empty content
            if (string.IsNullOrWhiteSpace(content) || content.Length < MinContentLength)
                return;

            try
            {
                var embedding = await _embedSvc.GetEmbeddingAsync(content, ct);
                if (embedding == null) return; // OpenAI key unavailable — skip silently

                var memory = new UserMemory
                {
                    UserId    = userId,
                    Topic     = topic.Length > 200 ? topic[..200] : topic,
                    Content   = content.Length > 4000 ? content[..4000] : content,
                    Embedding = embedding,
                };

                await _repo.CreateAsync(memory);
                _logger.LogDebug("Stored memory for user {U} — topic: {T}", userId, memory.Topic);
            }
            catch (Exception ex)
            {
                // Fire-and-forget: never let memory errors break the main request
                _logger.LogWarning(ex, "Non-fatal: failed to store memory for user {U}", userId);
            }
        }

        // ── Retrieve (RAG) ───────────────────────────────────────────────────

        public async Task<string?> RetrieveContextAsync(
            string userId, string query, int topK = 3, CancellationToken ct = default)
        {
            try
            {
                var queryEmbedding = await _embedSvc.GetEmbeddingAsync(query, ct);
                if (queryEmbedding == null) return null;

                var memories = await _repo.GetByUserIdAsync(userId, MaxStoredMemories);
                if (memories.Count == 0) return null;

                // Rank by cosine similarity
                var ranked = memories
                    .Where(m => m.Embedding.Length > 0)
                    .Select(m => (memory: m, score: CosineSimilarity(queryEmbedding, m.Embedding)))
                    .OrderByDescending(x => x.score)
                    .Take(topK)
                    .Where(x => x.score > 0.70f)   // relevance threshold — avoids injecting noise
                    .ToList();

                if (ranked.Count == 0) return null;

                var sb = new System.Text.StringBuilder();
                sb.AppendLine("Relevant context from the user's previous sessions:");
                foreach (var (m, score) in ranked)
                {
                    sb.AppendLine($"\n[Topic: {m.Topic}]");
                    sb.AppendLine(m.Content);
                }

                _logger.LogDebug("RAG retrieved {N} memories for user {U} (query: {Q})",
                    ranked.Count, userId, query[..Math.Min(60, query.Length)]);

                return sb.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Non-fatal: failed to retrieve memory context for user {U}", userId);
                return null;
            }
        }

        // ── Cosine Similarity ────────────────────────────────────────────────

        private static float CosineSimilarity(float[] a, float[] b)
        {
            if (a.Length != b.Length || a.Length == 0) return 0f;

            float dot = 0, normA = 0, normB = 0;
            for (int i = 0; i < a.Length; i++)
            {
                dot   += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }

            var denom = MathF.Sqrt(normA) * MathF.Sqrt(normB);
            return denom < float.Epsilon ? 0f : dot / denom;
        }
    }
}
