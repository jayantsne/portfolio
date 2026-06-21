using AILearnAPI.Shared.DTOs.FlowGenerator;

namespace AILearnAPI.Application.Interfaces;

public interface IFlowGeneratorService
{
    Task<FlowDiagramResponse> GenerateAsync(
        GenerateFlowRequest request,
        CancellationToken cancellationToken);

    Task<ExplainFlowStepResponse> ExplainStepAsync(
        ExplainFlowStepRequest request,
        CancellationToken cancellationToken);
}
