using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace AILearnAPI.Api.Controllers;

/// <summary>
/// Learning content generation API for Azure exam preparation
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
[SwaggerTag("Generate structured learning content for Azure certifications using AI")]
public class LearnController : ControllerBase
{
    private readonly ILearningService _learningService;
    private readonly ILogger<LearnController> _logger;

    public LearnController(ILearningService learningService, ILogger<LearnController> logger)
    {
        _learningService = learningService;
        _logger = logger;
    }

    /// <summary>
    /// Generate comprehensive Azure exam learning content
    /// </summary>
    /// <param name="request">Learning request with topic and customization options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Structured learning content with explanations, examples, and practice questions</returns>
    /// <response code="200">Content generated successfully</response>
    /// <response code="400">Invalid request parameters</response>
    /// <response code="401">Missing or invalid API key</response>
    /// <response code="408">Request timeout - AI model took too long to respond</response>
    /// <response code="500">Internal server error</response>
    /// <response code="503">Service unavailable - Unable to connect to AI service</response>
    [HttpPost("learn")]
    [ProducesResponseType(typeof(LearnResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status408RequestTimeout)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    [SwaggerOperation(
        Summary = "Generate learning content",
        Description = "Generates structured learning content for Azure exam preparation. " +
                      "Returns comprehensive explanations, key points, code examples, and practice questions. " +
                      "Requires X-API-Key header for authentication. Typical response time: 3-5 seconds.",
        OperationId = "GenerateLearningContent",
        Tags = new[] { "Learn" }
    )]
    [SwaggerResponse(200, "Learning content generated successfully", typeof(LearnResponseDto))]
    [SwaggerResponse(400, "Invalid request - check topic length and parameters", typeof(ErrorResponseDto))]
    [SwaggerResponse(401, "Unauthorized - missing or invalid API key", typeof(ErrorResponseDto))]
    public async Task<ActionResult<LearnResponseDto>> GenerateLearningContent(
        [FromBody, SwaggerRequestBody("Learning content request", Required = true)] LearnRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ErrorResponseDto
            {
                Error = "Invalid request",
                Details = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage))
            });
        }

        _logger.LogInformation("Received learn request for topic: {Topic}", request.Topic);

        var response = await _learningService.GenerateLearningContentAsync(request, cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Quick learning content generation with default settings
    /// </summary>
    /// <param name="topic">The Azure topic to learn (URL encoded)</param>
    /// <param name="examCode">Azure exam code (default: AZ-102)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Structured learning content with default settings (includes examples and questions)</returns>
    /// <response code="200">Content generated successfully</response>
    /// <response code="401">Missing or invalid API key</response>
    [HttpGet("learn/{topic}")]
    [ProducesResponseType(typeof(LearnResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    [SwaggerOperation(
        Summary = "Quick learn with defaults",
        Description = "Simplified endpoint for generating learning content with default settings. " +
                      "Automatically includes 3 examples and 5 practice questions. " +
                      "Use URL encoding for topics with spaces (e.g., 'Azure%20Virtual%20Machines').",
        OperationId = "QuickLearn",
        Tags = new[] { "Learn" }
    )]
    [SwaggerResponse(200, "Learning content generated with default settings", typeof(LearnResponseDto))]
    public async Task<ActionResult<LearnResponseDto>> QuickLearn(
        [FromRoute, SwaggerParameter("Azure topic (URL encoded)", Required = true)] string topic,
        [FromQuery, SwaggerParameter("Azure exam code", Required = false)] string examCode = "AZ-102",
        CancellationToken cancellationToken = default)
    {
        var request = new LearnRequestDto
        {
            Topic = topic,
            ExamCode = examCode,
            IncludeExamples = true,
            IncludePracticeQuestions = true
        };

        var response = await _learningService.GenerateLearningContentAsync(request, cancellationToken);

        return Ok(response);
    }
}
