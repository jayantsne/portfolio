using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class UserProgress : BaseEntity
    {
        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("bookmarks")]
        public List<int> Bookmarks { get; set; } = new List<int>();

        [BsonElement("progress")]
        public Dictionary<string, int> Progress { get; set; } = new Dictionary<string, int>();

        [BsonElement("totalTime")]
        public int TotalTime { get; set; } = 0;

        [BsonElement("lastVisit")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime LastVisit { get; set; } = DateTime.UtcNow;

        [BsonElement("visitDates")]
        public List<string> VisitDates { get; set; } = new List<string>();
    }
}
