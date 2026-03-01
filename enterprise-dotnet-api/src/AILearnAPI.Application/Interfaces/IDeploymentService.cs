using AILearnAPI.Shared.DTOs.Deployment;

namespace AILearnAPI.Application.Interfaces
{
    public interface IDeploymentService
    {
        /// <summary>
        /// Triggers a deployment for the given target ("backend" or "frontend").
        /// Executes the configured shell script, persists a DeploymentLog entry,
        /// and returns the log document so the API can track progress.
        /// </summary>
        Task<DeployResponseDto> TriggerDeployAsync(
            string target,
            string userId,
            string username,
            string sourceIp);

        /// <summary>Returns the last N deployment log entries (newest first).</summary>
        Task<List<DeploymentLogDto>> GetLogsAsync(int limit = 20);

        /// <summary>Returns a single deployment log by its MongoDB id.</summary>
        Task<DeploymentLogDto?> GetLogByIdAsync(string id);
    }
}
