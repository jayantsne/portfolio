namespace AILearnAPI.Application.Interfaces
{
    /// <summary>
    /// Generates OpenAI embeddings for a piece of text.
    /// Used by the semantic memory / RAG pipeline.
    /// </summary>
    public interface IEmbeddingService
    {
        /// <summary>
        /// Returns a float vector for <paramref name="text"/> using text-embedding-3-small.
        /// Returns null when the OpenAI key is unavailable or the call fails.
        /// </summary>
        Task<float[]?> GetEmbeddingAsync(string text, CancellationToken ct = default);
    }

    /// <summary>
    /// Semantic (vector-based) long-term memory for a user.
    /// Implements an in-process RAG pipeline:
    ///   1. Store meaningful content with its embedding.
    ///   2. Retrieve the most relevant past context for a new query using cosine similarity.
    /// </summary>
    public interface ISemanticMemoryService
    {
        /// <summary>
        /// Stores <paramref name="content"/> as a memory entry (fire-and-forget safe — errors are swallowed).
        /// Only called for "important" content (non-trivial AI responses, saved notes).
        /// </summary>
        Task StoreAsync(string userId, string topic, string content, CancellationToken ct = default);

        /// <summary>
        /// Retrieves the top-<paramref name="topK"/> relevant memory snippets for <paramref name="query"/>.
        /// Returns a formatted context string ready to inject into the system prompt, or null if nothing found.
        /// </summary>
        Task<string?> RetrieveContextAsync(string userId, string query, int topK = 3, CancellationToken ct = default);
    }
}
