using Microsoft.AspNetCore.Mvc;
using AILearnAPI.Api.Services;

namespace AILearnAPI.Api.Controllers;

/// <summary>
/// Sandbox code execution via Judge0.
/// JavaScript may also be executed here; the Angular client decides
/// whether to use browser-eval or this endpoint.
/// </summary>
[ApiController]
[Route("api/code")]
[Produces("application/json")]
public class CodeExecutionController : ControllerBase
{
    private readonly ICodeExecutionService _executor;
    private readonly ILogger<CodeExecutionController> _logger;

    public CodeExecutionController(
        ICodeExecutionService executor,
        ILogger<CodeExecutionController> logger)
    {
        _executor = executor;
        _logger   = logger;
    }

    /// <summary>
    /// Execute code in a sandboxed environment.
    /// </summary>
    /// <remarks>
    /// POST /api/code/execute
    ///
    /// Supported languages: javascript, typescript, python, csharp, java, cpp, go, rust
    /// </remarks>
    [HttpPost("execute")]
    public async Task<IActionResult> Execute(
        [FromBody] ExecuteCodeDto dto,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Language) || string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { error = "language and code are required." });

        _logger.LogInformation("Code execute request: lang={Language} size={Size}",
            dto.Language, dto.Code.Length);

        var result = await _executor.ExecuteAsync(
            new CodeExecuteRequest(dto.Language.Trim().ToLowerInvariant(), dto.Code), ct);

        return Ok(new
        {
            stdout        = result.Stdout,
            stderr        = result.Stderr,
            compileOutput = result.CompileOutput,
            executionTime = result.ExecutionTime,
            status        = result.Status,
            success       = result.Success,
        });
    }

    /// <summary>
    /// Returns the list of supported languages and their display names.
    /// </summary>
    [HttpGet("languages")]
    public IActionResult GetLanguages() => Ok(new object[]
    {
        new { id = "javascript", label = "JavaScript", icon = "🟨" },
        new { id = "typescript", label = "TypeScript",  icon = "🔷" },
        new { id = "python",     label = "Python",      icon = "🐍" },
        new { id = "csharp",     label = "C#",           icon = "🔵" },
        new { id = "java",       label = "Java",         icon = "☕" },
        new { id = "cpp",        label = "C++",           icon = "⚙️" },
        new { id = "go",         label = "Go",           icon = "🐹" },
        new { id = "rust",       label = "Rust",         icon = "🦀" },
    });
}

public record ExecuteCodeDto(string Language, string Code);
