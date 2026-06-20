using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Api.Services;

namespace AILearnAPI.Api.Controllers;

/// <summary>
/// Interactive AI Code Playground execution endpoint.
///
/// C#  → Roslyn CSharpScript (in-process, safe Sandbox)
/// JS / TS / Python / Java / Go / Rust → Judge0 sandbox
/// </summary>
[ApiController]
[Route("api/playground")]
[Produces("application/json")]
public class PlaygroundController : ControllerBase
{
    private readonly PlaygroundExecutionService _roslyn;
    private readonly ICodeExecutionService      _judge0;
    private readonly ILogger<PlaygroundController> _log;

    public PlaygroundController(
        PlaygroundExecutionService roslyn,
        ICodeExecutionService judge0,
        ILogger<PlaygroundController> log)
    {
        _roslyn = roslyn;
        _judge0 = judge0;
        _log    = log;
    }

    /// <summary>
    /// Execute code in the interactive playground.
    ///
    /// POST /api/playground/run
    ///
    /// C# uses Roslyn scripting (no Judge0 required).
    /// All other languages route to the Judge0 sandbox.
    /// </summary>
    [HttpPost("run")]
    public async Task<IActionResult> Run(
        [FromBody] PlaygroundRunDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { error = "code is required." });

        if (dto.Code.Length > 10 * 1024)
            return BadRequest(new { error = "Code exceeds the 10 KB size limit." });

        var language = (dto.Language ?? "csharp").ToLowerInvariant().Trim();

        _log.LogInformation("Playground run: lang={Language} size={Size}", language, dto.Code.Length);

        // ── C# → Roslyn (fast, reliable, no external dependency) ──────────
        if (language is "csharp" or "cs")
        {
            var r = await _roslyn.ExecuteAsync(dto.Code, ct);
            return Ok(new
            {
                stdout        = r.Stdout,
                stderr        = r.Stderr,
                compileOutput = "",
                executionTime = r.ExecutionTime,
                status        = r.Status,
                success       = r.Success,
                engine        = "roslyn",
            });
        }

        // ── All others → Judge0 sandbox ────────────────────────────────────
        var result = await _judge0.ExecuteAsync(
            new CodeExecuteRequest(language, dto.Code, dto.Stdin ?? ""), ct);

        return Ok(new
        {
            stdout        = result.Stdout,
            stderr        = result.Stderr,
            compileOutput = result.CompileOutput,
            executionTime = result.ExecutionTime,
            status        = result.Status,
            success       = result.Success,
            engine        = "judge0",
        });
    }

    /// <summary>
    /// GET /api/playground/health — lightweight status check.
    /// Returns which execution engines are available.
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health() => Ok(new
    {
        roslyn = true,
        judge0 = true,     // optimistic; actual connectivity checked on first run
        languages = new[] { "csharp", "javascript", "typescript", "python", "java", "cpp", "go", "rust" },
    });
}

public record PlaygroundRunDto(string? Language, string Code, string? Stdin = "");
