using AILearnAPI.Shared.DTOs.FlowGenerator;

namespace AILearnAPI.Application.Interfaces;

public interface IFlowPromptBuilder
{
    string BuildPrompt(GenerateFlowRequest request);
    string BuildStepExplanationPrompt(ExplainFlowStepRequest request);
}
