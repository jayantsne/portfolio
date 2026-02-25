using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AILearnAPI.Api.Models.DTOs;

/// <summary>
/// Request DTO for AI understanding feature
/// </summary>
public class UnderstandRequestDto
{
    /// <summary>
    /// The topic name to get AI explanation for (e.g., "Azure Cognitive Services")
    /// </summary>
    [Required(ErrorMessage = "TopicName is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "TopicName must be between 3 and 200 characters")]
    public string TopicName { get; set; } = string.Empty;

    /// <summary>
    /// The exam code (default: AI-102)
    /// </summary>
    [Required(ErrorMessage = "ExamCode is required")]
    [StringLength(50, ErrorMessage = "ExamCode must not exceed 50 characters")]
    public string ExamCode { get; set; } = "AI-102";
}

/// <summary>
/// Response DTO for AI understanding feature
/// </summary>
public class UnderstandResponseDto
{
    /// <summary>
    /// The topic that was explained
    /// </summary>
    public string TopicName { get; set; } = string.Empty;

    /// <summary>
    /// The exam code
    /// </summary>
    public string ExamCode { get; set; } = string.Empty;

    /// <summary>
    /// The AI-generated explanation (structured markdown)
    /// </summary>
    public string Explanation { get; set; } = string.Empty;

    /// <summary>
    /// Whether the prompt was found in database
    /// </summary>
    public bool PromptFound { get; set; }

    /// <summary>
    /// Processing time in milliseconds
    /// </summary>
    public long ProcessingTimeMs { get; set; }

    /// <summary>
    /// Number of tokens used (if available)
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? TokensUsed { get; set; }

    /// <summary>
    /// Timestamp of response generation
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
