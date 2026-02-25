using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Api.Models;

/// <summary>
/// Entity representing AI topic prompt templates stored in MongoDB
/// </summary>
public class AiTopicPrompt
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("topicName")]
    [BsonRequired]
    public string TopicName { get; set; } = string.Empty;

    [BsonElement("examCode")]
    [BsonRequired]
    public string ExamCode { get; set; } = string.Empty;

    [BsonElement("promptTemplate")]
    [BsonRequired]
    public string PromptTemplate { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
