namespace AILearnAPI.Shared.DTOs.Deployment
{
    /// <summary>Summary of a single deployment log entry returned to the frontend.</summary>
    public class DeploymentLogDto
    {
        public string   id                   { get; set; } = string.Empty;
        public string   target               { get; set; } = string.Empty;
        public string   triggeredByUsername  { get; set; } = string.Empty;
        public string   sourceIp             { get; set; } = string.Empty;
        public DateTime startedAt            { get; set; }
        public DateTime? completedAt         { get; set; }
        public int?     exitCode             { get; set; }
        public string   status               { get; set; } = string.Empty;
        public string   output               { get; set; } = string.Empty;
        public string?  error                { get; set; }
    }

    /// <summary>Request body to trigger a deployment.</summary>
    public class DeployRequestDto
    {
        /// <summary>"backend" or "frontend"</summary>
        public string target { get; set; } = string.Empty;
    }

    /// <summary>Immediate response when a deployment is queued.</summary>
    public class DeployResponseDto
    {
        public string  logId   { get; set; } = string.Empty;
        public string  message { get; set; } = string.Empty;
        public string  status  { get; set; } = string.Empty;
    }
}
