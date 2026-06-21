using AILearnAPI.Application.Interfaces;
using AILearnAPI.Shared.DTOs.FlowGenerator;

namespace AILearnAPI.Application.Services;

public sealed class FlowResponseValidator : IFlowResponseValidator
{
    public IReadOnlyList<string> Validate(FlowDiagramResponse response)
    {
        var errors = new List<string>();
        var isConceptMode = string.Equals(response.LearningMode, "concept", StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(response.Title))
            errors.Add("Title is required.");

        if (string.IsNullOrWhiteSpace(response.Summary))
            errors.Add("Summary is required.");

        if (response.Steps.Count < 3)
            errors.Add("At least 3 steps are required.");

        var stepIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var step in response.Steps)
        {
            if (string.IsNullOrWhiteSpace(step.Id))
            {
                errors.Add("Every step must have an id.");
                continue;
            }

            if (!stepIds.Add(step.Id))
                errors.Add($"Duplicate step id '{step.Id}'.");

            if (string.IsNullOrWhiteSpace(step.Label))
                errors.Add($"Step '{step.Id}' must have a label.");

            if (string.IsNullOrWhiteSpace(step.Description))
                errors.Add($"Step '{step.Id}' must have a description.");

            if (step.CodeLine is < 0)
                errors.Add($"Step '{step.Id}' has an invalid codeLine.");

            if (step.CodeLine.HasValue && response.Code.Count > 0 && step.CodeLine.Value >= response.Code.Count)
                errors.Add($"Step '{step.Id}' codeLine is outside the code array.");
        }

        foreach (var edge in response.Edges)
        {
            if (string.IsNullOrWhiteSpace(edge.Source) || string.IsNullOrWhiteSpace(edge.Target))
            {
                errors.Add("Every edge must have source and target.");
                continue;
            }

            if (!stepIds.Contains(edge.Source))
                errors.Add($"Edge source '{edge.Source}' does not match a step id.");

            if (!stepIds.Contains(edge.Target))
                errors.Add($"Edge target '{edge.Target}' does not match a step id.");
        }

        if (!isConceptMode && response.Steps.Count > 1 && response.Edges.Count == 0)
            errors.Add("At least one edge is required when the flow has multiple steps.");

        if (response.RevisionTips.Count == 0)
            errors.Add("At least one revision tip is required.");

        return errors;
    }
}
