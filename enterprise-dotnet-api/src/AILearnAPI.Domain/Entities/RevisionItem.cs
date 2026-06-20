using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// Tracks spaced-repetition state for a single note per user.
    /// One document per (userId, noteId) pair — enforced in RevisionRepository.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class RevisionItem : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("noteId")]
        public string NoteId { get; set; } = string.Empty;

        /// <summary>
        /// UTC date-time when this note should next be reviewed.
        /// Defaults to now so an enroll triggers an immediate-review slot.
        /// </summary>
        [BsonElement("nextReviewDate")]
        public DateTime NextReviewDate { get; set; } = DateTime.UtcNow;

        [BsonElement("lastReviewedDate")]
        public DateTime? LastReviewedDate { get; set; }

        /// <summary>new | easy | medium | hard</summary>
        [BsonElement("difficulty")]
        public string Difficulty { get; set; } = "new";

        [BsonElement("reviewCount")]
        public int ReviewCount { get; set; } = 0;

        /// <summary>
        /// Current interval in days (SM-2 style).
        /// Starts at 1, grows on Easy reviews.
        /// </summary>
        [BsonElement("intervalDays")]
        public int IntervalDays { get; set; } = 1;

        /// <summary>
        /// SM-2 ease factor — multiplier applied on Easy reviews.
        /// Range clamped to [1.3, 3.0].
        /// </summary>
        [BsonElement("easeFactor")]
        public float EaseFactor { get; set; } = 2.5f;
    }
}
