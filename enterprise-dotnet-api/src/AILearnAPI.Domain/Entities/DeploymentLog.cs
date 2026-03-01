using MongoDB.Bson.Serialization.Attributes;

namespace AILearnAPI.Domain.Entities
{
    /// <summary>
    /// Audit log for every deployment action triggered via the admin panel.
    /// Stored in collection "deployment_logs".
    /// </summary>
    [BsonIgnoreExtraElements]
    public class DeploymentLog : BaseEntity
    {
        /// <summary>Which target was deployed: "backend" or "frontend".</summary>
        [BsonElement("target")]
        public string Target { get; set; } = string.Empty;

        /// <summary>userId of the ADMIN who triggered the deployment.</summary>
        [BsonElement("triggeredBy")]
        public string TriggeredBy { get; set; } = string.Empty;

        /// <summary>Username of the triggering admin (for display).</summary>
        [BsonElement("triggeredByUsername")]
        public string TriggeredByUsername { get; set; } = string.Empty;

        /// <summary>IP address the request originated from.</summary>
        [BsonElement("sourceIp")]
        public string SourceIp { get; set; } = string.Empty;

        /// <summary>UTC timestamp when deployment was initiated.</summary>
        [BsonElement("startedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        /// <summary>UTC timestamp when the script completed (null if still running).</summary>
        [BsonElement("completedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime? CompletedAt { get; set; }

        /// <summary>Exit code from the deployment script. 0 = success.</summary>
        [BsonElement("exitCode")]
        public int? ExitCode { get; set; }

        /// <summary>Deployment result: "running", "success", "failed".</summary>
        [BsonElement("status")]
        public string Status { get; set; } = "running";

        /// <summary>Combined stdout + stderr from the script.</summary>
        [BsonElement("output")]
        public string Output { get; set; } = string.Empty;

        /// <summary>Optional error message if script could not be started.</summary>
        [BsonElement("error")]
        public string? Error { get; set; }
    }
}
