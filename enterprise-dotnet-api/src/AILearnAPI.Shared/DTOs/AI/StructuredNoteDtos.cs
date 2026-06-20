namespace AILearnAPI.Shared.DTOs.AI
{
    /// <summary>
    /// Structured AI lesson response — always returned from /api/ai/structured.
    /// Every field is populated by the AI; fallback values are injected server-side
    /// when the model returns invalid JSON.
    /// </summary>
    public class StructuredNoteDto
    {
        public string              Title    { get; set; } = string.Empty;
        public string              Summary  { get; set; } = string.Empty;
        public List<StructuredSection> Sections { get; set; } = new();
        public List<string>        Steps    { get; set; } = new();
        public StructuredVisual?   Visual   { get; set; }
    }

    public class StructuredSection
    {
        public string        Heading { get; set; } = string.Empty;
        public string        Content { get; set; } = string.Empty;
        public List<string>  Bullets { get; set; } = new();
        /// <summary>Code snippet or concrete example. Empty string if not applicable.</summary>
        public string        Example { get; set; } = string.Empty;
    }

    /// <summary>
    /// Visual data for the lesson's diagram / flow / comparison block.
    /// type="flow"       → data = ordered list of step labels, rendered as A → B → C
    /// type="comparison" → data = pipe-delimited rows ["Header1|Header2|Header3", "A|B|C"]
    /// type="diagram"    → data = lines of ASCII/text diagram, rendered in monospace
    /// </summary>
    public class StructuredVisual
    {
        /// <summary>flow | comparison | diagram</summary>
        public string       Type { get; set; } = "flow";
        public List<string> Data { get; set; } = new();
    }

    /// <summary>Request body for POST /api/ai/structured.</summary>
    public class StructuredNoteRequest
    {
        public string  Topic     { get; set; } = string.Empty;
        /// <summary>Hint for visual format: flow | comparison | diagram. Null = AI decides.</summary>
        public string? VisualHint { get; set; }
        public int     MaxTokens { get; set; } = 2000;
    }
}
