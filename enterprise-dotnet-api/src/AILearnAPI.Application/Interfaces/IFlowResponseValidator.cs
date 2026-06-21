using AILearnAPI.Shared.DTOs.FlowGenerator;

namespace AILearnAPI.Application.Interfaces;

public interface IFlowResponseValidator
{
    IReadOnlyList<string> Validate(FlowDiagramResponse response);
}