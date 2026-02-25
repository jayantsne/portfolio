using AILearnAPI.Api.Models.DTOs;
using AILearnAPI.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace AILearnAPI.Api.Controllers;

/// <summary>
/// AI Understanding API for Azure exam topic explanations
/// </summary>
[ApiController]
[Route("api/ai")]
[Produces("application/json")]
[SwaggerTag("Generate AI-powered explanations for Azure certification exam topics")]
public class AiUnderstandController : ControllerBase
{
    private readonly IAiUnderstandService _aiUnderstandService;
    private readonly ILogger<AiUnderstandController> _logger;

    public AiUnderstandController(
        IAiUnderstandService aiUnderstandService,
        ILogger<AiUnderstandController> logger)
    {
        _aiUnderstandService = aiUnderstandService;
        _logger = logger;
    }

    /// <summary>
    /// Generate comprehensive AI explanation for an exam topic
    /// </summary>
    /// <param name="request">Understanding request with topic name and exam code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Structured AI-generated explanation with examples and practice questions</returns>
    /// <response code="200">Explanation generated successfully</response>
    /// <response code="400">Invalid request parameters</response>
    /// <response code="408">Request timeout - AI took too long to respond</response>
    /// <response code="500">Internal server error</response>
    /// <response code="503">Service unavailable - Cannot connect to AI service</response>
    [HttpPost("understand")]
    [ProducesResponseType(typeof(UnderstandResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status408RequestTimeout)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    [SwaggerOperation(
        Summary = "Understand exam topic with AI",
        Description = "Generates a comprehensive, structured explanation for Azure exam topics. " +
                      "Includes simple explanations, real-world examples, exam tips, common mistakes, " +
                      "and practice questions. Uses pre-defined prompts from database optimized for exam preparation. " +
                      "Typical response time: 5-10 seconds depending on topic complexity.",
        OperationId = "GetAiUnderstanding",
        Tags = new[] { "AI Understanding" }
    )]
    [SwaggerResponse(200, "AI explanation generated successfully", typeof(UnderstandResponseDto))]
    [SwaggerResponse(400, "Invalid request - check topic name and exam code", typeof(ErrorResponseDto))]
    [SwaggerResponse(408, "Request timeout - AI service took too long", typeof(ErrorResponseDto))]
    public async Task<ActionResult<UnderstandResponseDto>> UnderstandTopic(
        [FromBody, SwaggerRequestBody("Understanding request with topic and exam code", Required = true)] 
        UnderstandRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ErrorResponseDto
                {
                    Error = "Invalid request",
                    Details = string.Join(", ", ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage))
                });
            }

            _logger.LogInformation(
                "Received understand request for topic: '{TopicName}', exam: '{ExamCode}'",
                request.TopicName, request.ExamCode);

            var response = await _aiUnderstandService.GenerateUnderstandingAsync(request, cancellationToken);

            return Ok(response);
        }
        catch (TimeoutException ex)
        {
            _logger.LogError(ex, "Timeout processing understand request");
            return StatusCode(StatusCodes.Status408RequestTimeout, new ErrorResponseDto
            {
                Error = "Request timeout",
                Details = "The AI service took too long to respond. Please try again."
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Service error processing understand request");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto
            {
                Error = "Service unavailable",
                Details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error processing understand request");
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseDto
            {
                Error = "Internal server error",
                Details = "An unexpected error occurred while processing your request."
            });
        }
    }

    /// <summary>
    /// Quick understanding - GET endpoint for simple queries
    /// </summary>
    /// <param name="topicName">The topic name (URL encoded)</param>
    /// <param name="examCode">Exam code (default: AI-102)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>AI-generated explanation</returns>
    [HttpGet("understand")]
    [ProducesResponseType(typeof(UnderstandResponseDto), StatusCodes.Status200OK)]
    [SwaggerOperation(
        Summary = "Quick topic understanding (GET)",
        Description = "Simplified GET endpoint for quick AI explanations. " +
                      "Use query parameters for topic and exam code.",
        OperationId = "GetAiUnderstandingQuick"
    )]
    public async Task<ActionResult<UnderstandResponseDto>> UnderstandTopicQuick(
        [FromQuery, SwaggerParameter("Topic name", Required = true)] string topicName,
        [FromQuery, SwaggerParameter("Exam code (default: AI-102)")] string examCode = "AI-102",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(topicName))
        {
            return BadRequest(new ErrorResponseDto
            {
                Error = "Invalid request",
                Details = "Topic name is required"
            });
        }

        var request = new UnderstandRequestDto
        {
            TopicName = topicName,
            ExamCode = examCode
        };

        // Delegate to POST method logic
        return await UnderstandTopic(request, cancellationToken);
    }
}
