using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.FlowGenerator;
using Microsoft.AspNetCore.Mvc;

namespace AILearnAPI.Api.Controllers;

[ApiController]
[Route("api/flow-generator")]
public sealed class FlowGeneratorController : ControllerBase
{
    private readonly IFlowGeneratorService _flowGenerator;
    private readonly ILogger<FlowGeneratorController> _logger;

    public FlowGeneratorController(
        IFlowGeneratorService flowGenerator,
        ILogger<FlowGeneratorController> logger)
    {
        _flowGenerator = flowGenerator;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<ActionResult<FlowDiagramResponse>> Generate(
        [FromBody] GenerateFlowRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Concept))
            return BadRequest(new { error = "Concept is required." });

        try
        {
            var result = await _flowGenerator.GenerateAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Flow generation requested without configured OpenAI key");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "AI provider is not configured." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Flow generation failed");
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "Could not generate a valid flow. Please try again." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected flow generation error");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Flow generation failed." });
        }
    }

    [HttpPost("explain-step")]
    public async Task<ActionResult<ExplainFlowStepResponse>> ExplainStep(
        [FromBody] ExplainFlowStepRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Concept) || string.IsNullOrWhiteSpace(request.StepLabel))
            return BadRequest(new { error = "Concept and step label are required." });

        try
        {
            var result = await _flowGenerator.ExplainStepAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Step explanation requested without configured OpenAI key");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "AI provider is not configured." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Step explanation failed");
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "Could not explain this step. Please try again." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected step explanation error");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Step explanation failed." });
        }
    }
}
