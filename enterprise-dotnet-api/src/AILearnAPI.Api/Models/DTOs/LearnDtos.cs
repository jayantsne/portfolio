using System.ComponentModel.DataAnnotations;
using Swashbuckle.AspNetCore.Annotations;

namespace AILearnAPI.Api.Models.DTOs;

/// <summary>
/// Request for generating Azure exam learning content
/// </summary>
[SwaggerSchema(Description = "Request for generating structured learning content for Azure certifications")]
public class LearnRequestDto
{
    /// <summary>
    /// The topic to learn about (e.g., "Azure Virtual Machines", "Azure Storage Accounts")
    /// </summary>
    [Required(ErrorMessage = "Topic is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Topic must be between 3 and 200 characters")]
    [SwaggerSchema(Description = "The Azure topic to generate learning content for")]
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// Azure exam code (default: AZ-102)
    /// </summary>
    [StringLength(20)]
    [SwaggerSchema(Description = "Azure certification exam code")]
    public string ExamCode { get; set; } = "AZ-102";

    /// <summary>
    /// Include code examples in the response
    /// </summary>
    [SwaggerSchema(Description = "Whether to include practical code examples")]
    public bool IncludeExamples { get; set; } = true;

    /// <summary>
    /// Include practice questions in the response
    /// </summary>
    [SwaggerSchema(Description = "Whether to include practice questions with answers")]
    public bool IncludePracticeQuestions { get; set; } = true;

    /// <summary>
    /// Maximum number of examples to generate (default: 3)
    /// </summary>
    [SwaggerSchema(Description = "Maximum number of code examples")]
    public int? MaxExamples { get; set; } = 3;

    /// <summary>
    /// Maximum number of practice questions to generate (default: 5)
    /// </summary>
    [SwaggerSchema(Description = "Maximum number of practice questions")]
    public int? MaxQuestions { get; set; } = 5;
}

/// <summary>
/// Structured learning content response
/// </summary>
[SwaggerSchema(Description = "Comprehensive learning content with explanations, examples, and practice questions")]
public class LearnResponseDto
{
    /// <summary>
    /// The topic that was learned
    /// </summary>
    [SwaggerSchema(Description = "The Azure topic covered")]
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// The exam code
    /// </summary>
    [SwaggerSchema(Description = "Azure certification exam code")]
    public string ExamCode { get; set; } = string.Empty;

    /// <summary>
    /// Detailed explanation of the topic
    /// </summary>
    [SwaggerSchema(Description = "Comprehensive explanation of the topic")]
    public string Explanation { get; set; } = string.Empty;

    /// <summary>
    /// Key points to remember
    /// </summary>
    [SwaggerSchema(Description = "Important key points for exam preparation")]
    public List<string> KeyPoints { get; set; } = new();

    /// <summary>
    /// Code examples with explanations
    /// </summary>
    [SwaggerSchema(Description = "Practical code examples")]
    public List<ExampleDto> Examples { get; set; } = new();

    /// <summary>
    /// Practice questions with answers
    /// </summary>
    [SwaggerSchema(Description = "Multiple-choice practice questions with explanations")]
    public List<PracticeQuestionDto> PracticeQuestions { get; set; } = new();

    /// <summary>
    /// Timestamp when content was generated
    /// </summary>
    [SwaggerSchema(Description = "UTC timestamp of content generation")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Number of tokens used by the AI model
    /// </summary>
    [SwaggerSchema(Description = "Total tokens consumed")]
    public int TokensUsed { get; set; }

    /// <summary>
    /// Time taken to generate content (in seconds)
    /// </summary>
    [SwaggerSchema(Description = "Generation time in seconds")]
    public double GenerationTimeSeconds { get; set; }
}

/// <summary>
/// Code example with description
/// </summary>
[SwaggerSchema(Description = "Practical code example with explanation")]
public class ExampleDto
{
    /// <summary>
    /// Example title
    /// </summary>
    [SwaggerSchema(Description = "Short title for the example")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Example description
    /// </summary>
    [SwaggerSchema(Description = "Detailed description of what the code does")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Code snippet
    /// </summary>
    [SwaggerSchema(Description = "Actual code sample")]
    public string Code { get; set; } = string.Empty;
}

/// <summary>
/// Practice question with multiple choice answers
/// </summary>
[SwaggerSchema(Description = "Multiple-choice practice question with correct answer and explanation")]
public class PracticeQuestionDto
{
    /// <summary>
    /// The question text
    /// </summary>
    [SwaggerSchema(Description = "The practice question")]
    public string Question { get; set; } = string.Empty;

    /// <summary>
    /// List of answer options
    /// </summary>
    [SwaggerSchema(Description = "Multiple choice options")]
    public List<string> Options { get; set; } = new();

    /// <summary>
    /// Index of the correct answer (0-based)
    /// </summary>
    [SwaggerSchema(Description = "Zero-based index of correct answer")]
    public int CorrectAnswerIndex { get; set; }

    /// <summary>
    /// Explanation of the correct answer
    /// </summary>
    [SwaggerSchema(Description = "Detailed explanation of why the answer is correct")]
    public string Explanation { get; set; } = string.Empty;
}

public class OllamaRequestDto
{
    public string Model { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string? System { get; set; }
    public bool Stream { get; set; } = false;
    public OllamaOptionsDto? Options { get; set; }
}

public class OllamaOptionsDto
{
    /// <summary>
    /// Temperature for response generation (0-10 scale in Ollama)
    /// Higher = more creative, Lower = more focused
    /// </summary>
    public int Temperature { get; set; } = 7; // Default 0.7 on 0-10 scale

    /// <summary>
    /// Maximum number of tokens to generate
    /// </summary>
    public int NumPredict { get; set; } = 2048;

    /// <summary>
    /// Top-K sampling: Consider top K tokens
    /// Typical: 40
    /// </summary>
    public int TopK { get; set; } = 40;

    /// <summary>
    /// Top-P (nucleus) sampling threshold
    /// Typical: 0.9
    /// </summary>
    public float TopP { get; set; } = 0.9f;

    /// <summary>
    /// Penalty for repeating tokens
    /// Higher = less repetition
    /// Typical: 1.1
    /// </summary>
    public float RepeatPenalty { get; set; } = 1.1f;
}

public class OllamaResponseDto
{
    public string Model { get; set; } = string.Empty;
    public DateTime Created_at { get; set; }
    public string Response { get; set; } = string.Empty;
    public bool Done { get; set; }
    public int Prompt_eval_count { get; set; }
    public int Eval_count { get; set; }
}

public class ErrorResponseDto
{
    public string Error { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
