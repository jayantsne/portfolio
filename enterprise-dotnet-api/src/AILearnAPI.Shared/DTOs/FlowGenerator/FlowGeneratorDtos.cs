namespace AILearnAPI.Shared.DTOs.FlowGenerator;

public sealed class GenerateFlowRequest
{
    public string Concept { get; set; } = string.Empty;
    public string Audience { get; set; } = "Interview";
    public string FlowType { get; set; } = "Timeline";
    public string AnimationStyle { get; set; } = "Clean";
}

public sealed class ExplainFlowStepRequest
{
    public string Concept { get; set; } = string.Empty;
    public string LearningMode { get; set; } = "flow";
    public string StepLabel { get; set; } = string.Empty;
    public string StepDescription { get; set; } = string.Empty;
    public string Audience { get; set; } = "Interview";
    public string CodeLanguage { get; set; } = string.Empty;
    public string CodeLine { get; set; } = string.Empty;
}

public sealed class ExplainFlowStepResponse
{
    public string PlainEnglish { get; set; } = string.Empty;
    public string HowItWorks { get; set; } = string.Empty;
    public string RealExample { get; set; } = string.Empty;
    public string CommonMistake { get; set; } = string.Empty;
    public string InterviewAnswer { get; set; } = string.Empty;
}

public sealed class FlowDiagramResponse
{
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string LearningMode { get; set; } = "flow";
    public string MentalModel { get; set; } = string.Empty;
    public FlowVisualizationDto Visualization { get; set; } = new();
    public string CodeLanguage { get; set; } = string.Empty;
    public List<string> Code { get; set; } = new();
    public List<FlowStepDto> Steps { get; set; } = new();
    public List<FlowEdgeDto> Edges { get; set; } = new();
    public List<FlowRevisionTipDto> RevisionTips { get; set; } = new();
}

public sealed class FlowVisualizationDto
{
    public string Type { get; set; } = "journey";
    public string Rationale { get; set; } = string.Empty;
    public string PrimaryMetaphor { get; set; } = string.Empty;
    public string Direction { get; set; } = "horizontal";
    public string AnimationNarrative { get; set; } = string.Empty;
    public List<string> Phases { get; set; } = new();
}

public sealed class FlowStepDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string WhyItMatters { get; set; } = string.Empty;
    public string Trigger { get; set; } = string.Empty;
    public string Input { get; set; } = string.Empty;
    public string Output { get; set; } = string.Empty;
    public string InternalWork { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;
    public string AntiPattern { get; set; } = string.Empty;
    public string InterviewAnswer { get; set; } = string.Empty;
    public string NodeKind { get; set; } = "step";
    public string ParentId { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public int? Depth { get; set; }
    public List<string> VisualItems { get; set; } = new();
    public int? CodeLine { get; set; }
}

public sealed class FlowEdgeDto
{
    public string Source { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class FlowRevisionTipDto
{
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
}
