using AILearnAPI.Application.Interfaces;
using AILearnAPI.Domain.Entities;
using AILearnAPI.Shared.DTOs.Deployment;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Diagnostics;

namespace AILearnAPI.Api.Services
{
    /// <summary>
    /// Executes deployment shell scripts and persists audit logs
    /// to the "deployment_logs" MongoDB collection.
    /// Placed in Api layer — requires MongoDB.Driver which is only
    /// referenced by the Api and Infrastructure projects.
    /// </summary>
    public class DeploymentService : IDeploymentService
    {
        private readonly IMongoCollection<DeploymentLog> _logs;
        private readonly IConfiguration _config;
        private readonly ILogger<DeploymentService> _logger;

        private static readonly HashSet<string> ValidTargets =
            new(StringComparer.OrdinalIgnoreCase) { "backend", "frontend" };

        public DeploymentService(
            IMongoDatabase database,
            IConfiguration config,
            ILogger<DeploymentService> logger)
        {
            _logs   = database.GetCollection<DeploymentLog>("deployment_logs");
            _config = config;
            _logger = logger;
        }

        // ── Public API ──────────────────────────────────────────────────────

        public async Task<DeployResponseDto> TriggerDeployAsync(
            string target, string userId, string username, string sourceIp)
        {
            if (!ValidTargets.Contains(target))
                throw new ArgumentException($"Invalid deployment target '{target}'. Use 'backend' or 'frontend'.");

            var scriptPath = GetScriptPath(target);

            // Persist initial "running" log
            var log = new DeploymentLog
            {
                Target              = target.ToLower(),
                TriggeredBy         = userId,
                TriggeredByUsername = username,
                SourceIp            = sourceIp,
                StartedAt           = DateTime.UtcNow,
                Status              = "running"
            };
            await _logs.InsertOneAsync(log);
            var logId = log.Id;

            _logger.LogInformation(
                "[Deploy] {Target} deployment triggered by {Username} ({UserId}) from {IP} — LogId: {LogId}",
                target, username, userId, sourceIp, logId);

            // Fire and forget — execute script in background
            _ = Task.Run(async () => await RunScriptAsync(logId, scriptPath, target));

            return new DeployResponseDto
            {
                logId   = logId,
                message = $"{target} deployment started.",
                status  = "running"
            };
        }

        public async Task<List<DeploymentLogDto>> GetLogsAsync(int limit = 20)
        {
            var rawLogs = await _logs
                .Find(_ => true)
                .SortByDescending(l => l.StartedAt)
                .Limit(limit)
                .ToListAsync();

            return rawLogs.Select(ToDto).ToList();
        }

        public async Task<DeploymentLogDto?> GetLogByIdAsync(string id)
        {
            if (!ObjectId.TryParse(id, out _)) return null;
            var log = await _logs.Find(l => l.Id == id).FirstOrDefaultAsync();
            return log is null ? null : ToDto(log);
        }

        // ── Internal ────────────────────────────────────────────────────────

        private string GetScriptPath(string target)
        {
            var key = target.ToLower() == "backend"
                ? "Deployment:BackendScript"
                : "Deployment:FrontendScript";

            var path = _config[key];

            if (string.IsNullOrWhiteSpace(path))
                throw new InvalidOperationException(
                    $"Deployment script path not configured. Add '{key}' to appsettings.json.");

            return path;
        }

        private async Task RunScriptAsync(string logId, string scriptPath, string target)
        {
            var output   = string.Empty;
            var exitCode = -1;
            string? errorMsg = null;

            try
            {
                if (!File.Exists(scriptPath))
                    throw new FileNotFoundException($"Deployment script not found: {scriptPath}");

                var isWindows = OperatingSystem.IsWindows();
                var processInfo = isWindows
                    ? new ProcessStartInfo("powershell.exe", $"-ExecutionPolicy Bypass -File \"{scriptPath}\"")
                    : new ProcessStartInfo("/bin/bash", $"\"{scriptPath}\"");

                processInfo.RedirectStandardOutput = true;
                processInfo.RedirectStandardError  = true;
                processInfo.UseShellExecute        = false;
                processInfo.CreateNoWindow         = true;
                processInfo.WorkingDirectory       = Path.GetDirectoryName(scriptPath) ?? "/";

                using var process = new Process { StartInfo = processInfo };
                process.Start();

                var stdoutTask = process.StandardOutput.ReadToEndAsync();
                var stderrTask = process.StandardError.ReadToEndAsync();

                // Timeout: 10 minutes
                var completed = await Task.Run(() => process.WaitForExit(600_000));
                if (!completed) process.Kill();

                var stdout = await stdoutTask;
                var stderr = await stderrTask;
                exitCode = completed ? process.ExitCode : -999;
                output   = string.Join('\n', new[] { stdout, stderr }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));

                if (!completed) errorMsg = "Deployment script timed out after 10 minutes.";

                _logger.LogInformation(
                    "[Deploy] {Target} completed. ExitCode={ExitCode} LogId={LogId}",
                    target, exitCode, logId);
            }
            catch (Exception ex)
            {
                errorMsg = ex.Message;
                output   = ex.ToString();
                _logger.LogError(ex, "[Deploy] {Target} script error — LogId={LogId}", target, logId);
            }

            var status = exitCode == 0 ? "success" : "failed";
            var update = Builders<DeploymentLog>.Update
                .Set(l => l.Status,      status)
                .Set(l => l.ExitCode,    exitCode)
                .Set(l => l.Output,      output)
                .Set(l => l.Error,       errorMsg)
                .Set(l => l.CompletedAt, DateTime.UtcNow);

            await _logs.UpdateOneAsync(l => l.Id == logId, update);
        }

        private static DeploymentLogDto ToDto(DeploymentLog l) => new()
        {
            id                  = l.Id,
            target              = l.Target,
            triggeredByUsername = l.TriggeredByUsername,
            sourceIp            = l.SourceIp,
            startedAt           = l.StartedAt,
            completedAt         = l.CompletedAt,
            exitCode            = l.ExitCode,
            status              = l.Status,
            output              = l.Output,
            error               = l.Error
        };
    }
}
