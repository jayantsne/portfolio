using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// A semantic memory entry for a user — stores an embedding alongside the
    /// original text so the RAG pipeline can retrieve relevant past context.
    /// Stored in the "user_memories" collection.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class UserMemory : BaseEntity
    {
        /// <summary>Internal userId from the Auth collection.</summary>
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        /// <summary>Short label for the memory (question text or note topic).</summary>
        [BsonElement("topic")]
        public string Topic { get; set; } = string.Empty;

        /// <summary>The actual content stored as memory (AI answer, note body, etc.).</summary>
        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        /// <summary>OpenAI text-embedding-3-small vector (1536 dims).</summary>
        [BsonElement("embedding")]
        public float[] Embedding { get; set; } = Array.Empty<float>();
        // CreatedAt is inherited from BaseEntity (mapped to "createdAt") — no override needed.
    }
}
