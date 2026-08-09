using System.Text.Json;
using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.FlowGenerator;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Application.Services;

public sealed class FlowGeneratorService : IFlowGeneratorService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly IFlowPromptBuilder _promptBuilder;
    private readonly IFlowAiProvider _aiProvider;
    private readonly IFlowResponseValidator _validator;
    private readonly ILogger<FlowGeneratorService> _logger;

    public FlowGeneratorService(
        IFlowPromptBuilder promptBuilder,
        IFlowAiProvider aiProvider,
        IFlowResponseValidator validator,
        ILogger<FlowGeneratorService> logger)
    {
        _promptBuilder = promptBuilder;
        _aiProvider = aiProvider;
        _validator = validator;
        _logger = logger;
    }

    public async Task<FlowDiagramResponse> GenerateAsync(
        GenerateFlowRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Concept))
            throw new ArgumentException("Concept is required.", nameof(request));

        request.Concept = request.Concept.Trim();
        request.Audience = Normalize(request.Audience, "Interview");
        request.FlowType = Normalize(request.FlowType, "Timeline");
        request.AnimationStyle = Normalize(request.AnimationStyle, "Clean");

        var prompt = _promptBuilder.BuildPrompt(request);
        var rawResponse = await _aiProvider.GenerateAsync(prompt, cancellationToken);
        var json = ExtractJson(rawResponse);

        FlowDiagramResponse? response;
        try
        {
            response = JsonSerializer.Deserialize<FlowDiagramResponse>(json, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Flow generator returned invalid JSON");
            throw new InvalidOperationException("Flow AI response was not valid JSON.", ex);
        }

        if (response == null)
            throw new InvalidOperationException("Flow AI response was empty.");

        NormalizeResponse(response);

        var errors = _validator.Validate(response);
        if (errors.Count > 0)
        {
            _logger.LogInformation("Flow visual plan needs one correction pass: {Errors}", string.Join("; ", errors));
            var correctionPrompt = $"""
                {prompt}

                Your previous visual plan was rejected for these structural reasons:
                {string.Join("; ", errors)}

                Regenerate the entire JSON response. Correct the visual structure itself; do not explain the errors.
                """;
            var correctedRaw = await _aiProvider.GenerateAsync(correctionPrompt, cancellationToken);
            var correctedJson = ExtractJson(correctedRaw);
            try
            {
                response = JsonSerializer.Deserialize<FlowDiagramResponse>(correctedJson, JsonOptions)
                    ?? throw new InvalidOperationException("Corrected flow AI response was empty.");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Corrected flow generator response was invalid JSON");
                throw new InvalidOperationException("Corrected flow AI response was not valid JSON.", ex);
            }

            NormalizeResponse(response);
            errors = _validator.Validate(response);
            if (errors.Count > 0)
            {
                _logger.LogWarning("Corrected flow AI response failed validation: {Errors}", string.Join("; ", errors));
                throw new InvalidOperationException("Flow AI could not produce a valid visual structure.");
            }
        }

        return response;
    }

    public async Task<ExplainFlowStepResponse> ExplainStepAsync(
        ExplainFlowStepRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Concept))
            throw new ArgumentException("Concept is required.", nameof(request));

        if (string.IsNullOrWhiteSpace(request.StepLabel))
            throw new ArgumentException("Step label is required.", nameof(request));

        request.Concept = request.Concept.Trim();
        request.StepLabel = request.StepLabel.Trim();
        request.StepDescription = Normalize(request.StepDescription, string.Empty);
        request.LearningMode = Normalize(request.LearningMode, "flow");
        request.Audience = Normalize(request.Audience, "Interview");
        request.CodeLanguage = Normalize(request.CodeLanguage, string.Empty);
        request.CodeLine = Normalize(request.CodeLine, string.Empty);

        var prompt = _promptBuilder.BuildStepExplanationPrompt(request);
        var rawResponse = await _aiProvider.GenerateAsync(prompt, cancellationToken);
        var json = ExtractJson(rawResponse);

        ExplainFlowStepResponse? response;
        try
        {
            response = JsonSerializer.Deserialize<ExplainFlowStepResponse>(json, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Step explanation returned invalid JSON");
            throw new InvalidOperationException("Step explanation response was not valid JSON.", ex);
        }

        if (response == null)
            throw new InvalidOperationException("Step explanation response was empty.");

        if (string.IsNullOrWhiteSpace(response.PlainEnglish)
            || string.IsNullOrWhiteSpace(response.HowItWorks)
            || string.IsNullOrWhiteSpace(response.InterviewAnswer))
        {
            throw new InvalidOperationException("Step explanation response was incomplete.");
        }

        return response;
    }

    private static string Normalize(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static void NormalizeResponse(FlowDiagramResponse response)
    {
        response.Visualization ??= new FlowVisualizationDto();
        response.Visualization.Type = Normalize(response.Visualization.Type, "journey").ToLowerInvariant();
        response.Visualization.Direction = Normalize(response.Visualization.Direction, "horizontal").ToLowerInvariant();
        response.Visualization.Phases ??= new List<string>();
        foreach (var step in response.Steps)
        {
            step.VisualItems ??= new List<string>();
            if (step.CodeLine is < 0)
                step.CodeLine = null;

            if (step.CodeLine.HasValue && response.Code.Count > 0 && step.CodeLine.Value >= response.Code.Count)
                step.CodeLine = null;
        }

        if (string.Equals(response.Visualization.Type, "tree", StringComparison.OrdinalIgnoreCase))
        {
            var byId = response.Steps.ToDictionary(step => step.Id, StringComparer.OrdinalIgnoreCase);
            foreach (var edge in response.Edges)
            {
                if (byId.TryGetValue(edge.Target, out var child) && string.IsNullOrWhiteSpace(child.ParentId))
                    child.ParentId = edge.Source;
            }

            var roots = response.Steps.Where(step => string.IsNullOrWhiteSpace(step.ParentId)).ToList();
            if (roots.Count == 1)
            {
                roots[0].Depth = 0;
                var queue = new Queue<FlowStepDto>();
                queue.Enqueue(roots[0]);
                while (queue.Count > 0)
                {
                    var parent = queue.Dequeue();
                    foreach (var child in response.Steps.Where(step => string.Equals(step.ParentId, parent.Id, StringComparison.OrdinalIgnoreCase)))
                    {
                        child.Depth ??= (parent.Depth ?? 0) + 1;
                        queue.Enqueue(child);
                    }
                }
            }
        }
    }

    private static string ExtractJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("Flow AI response was empty.");

        var text = raw.Trim();

        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = text.IndexOf('\n');
            if (firstNewLine >= 0)
                text = text[(firstNewLine + 1)..];

            var fence = text.LastIndexOf("```", StringComparison.Ordinal);
            if (fence >= 0)
                text = text[..fence];
        }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');

        if (start < 0 || end <= start)
            throw new InvalidOperationException("Flow AI response did not contain a JSON object.");

        return text[start..(end + 1)].Trim();
    }
}
