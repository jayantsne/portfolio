using System.Text;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;

namespace AILearnAPI.Api.Services;

/// <summary>
/// Executes C# code snippets securely using Roslyn CSharpScript.
/// - Captures Console.WriteLine output per invocation.
/// - Blacklists dangerous APIs (file system, network, reflection, process).
/// - Enforces a 10-second wall-clock timeout.
/// - Limits concurrent executions to 3 to prevent CPU exhaustion.
/// </summary>
public class PlaygroundExecutionService
{
    // Cap concurrent Roslyn invocations — each JIT-compilation is heavy.
    private static readonly SemaphoreSlim _concurrencySlot = new(3, 3);

    // ── Blocked namespace / API patterns ────────────────────────────────────
    private static readonly string[] Blocked =
    [
        "System.IO",
        "System.Net",
        "System.Reflection",
        "System.Diagnostics.Process",
        "System.Runtime.InteropServices",
        "Environment.Exit",
        "AppDomain",
        "Marshal",
        "unsafe ",
        "GC.Collect",
        "Assembly.Load",
        "Type.GetType",
        "Activator.CreateInstance",
        "System.Security",
    ];

    // ── Roslyn script options (imports + safe references) ───────────────────
    // Load ALL assemblies already in the current AppDomain so Console, Thread,
    // Math, etc. are all resolvable — no need to enumerate them by hand.
    private static readonly ScriptOptions _options = ScriptOptions.Default
        .WithLanguageVersion(Microsoft.CodeAnalysis.CSharp.LanguageVersion.Latest)
        .WithImports(
            "System",
            "System.Linq",
            "System.Collections.Generic",
            "System.Collections",
            "System.Text",
            "System.Text.RegularExpressions",
            "System.Globalization",
            "System.Threading",
            "System.Threading.Tasks",
            "System.Math")
        .WithReferences(
            AppDomain.CurrentDomain.GetAssemblies()
                .Where(a => !a.IsDynamic && !string.IsNullOrWhiteSpace(a.Location))
                .ToArray());

    private readonly ILogger<PlaygroundExecutionService> _log;

    public PlaygroundExecutionService(ILogger<PlaygroundExecutionService> log)
        => _log = log;

    // ── Public API ───────────────────────────────────────────────────────────

    public record Result(string Stdout, string Stderr, string ExecutionTime, string Status, bool Success);

    public async Task<Result> ExecuteAsync(string code, CancellationToken ct = default)
    {
        // 1. Validate size ─────────────────────────────────────────────────
        if (code.Length > 8 * 1024)
            return Fail("Code exceeds the 8 KB size limit.");

        // 2. Security scan ─────────────────────────────────────────────────
        foreach (var pattern in Blocked)
        {
            if (code.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                return Fail($"Restricted operation '{pattern}' is not allowed in the playground.");
        }

        // 3. Acquire slot (rate-limits concurrent heavy JIT compilation) ───
        await _concurrencySlot.WaitAsync(ct);

        var stdoutBuilder = new StringBuilder();
        var oldOut        = Console.Out;
        var oldErr        = Console.Error;
        var writer        = new StringWriter(stdoutBuilder);

        try
        {
            Console.SetOut(writer);
            Console.SetError(writer);

            using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
            linked.CancelAfter(TimeSpan.FromSeconds(10));

            var start = DateTime.UtcNow;

            // If the code looks like a class-based program (has a static Main),
            // append a call so Roslyn actually executes it — scripts don't
            // auto-invoke Main() the way dotnet run does.
            var runnableCode = InjectMainCall(code);

            await CSharpScript.RunAsync(runnableCode, _options, cancellationToken: linked.Token);
            var elapsed = (DateTime.UtcNow - start).TotalMilliseconds;

            var output = stdoutBuilder.ToString();
            if (output.Length > 64 * 1024)
                output = output[..(64 * 1024)] + "\n[Output truncated at 64KB]";

            _log.LogInformation("Roslyn executed in {Ms:F0}ms, output {Bytes} bytes",
                elapsed, output.Length);

            return new Result(output, "", $"{elapsed:F0}ms", "Accepted", true);
        }
        catch (CompilationErrorException ex)
        {
            var errors = string.Join("\n", ex.Diagnostics
                .Where(d => d.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Error)
                .Select(d => d.ToString()));
            return new Result("", errors, "—", "Compilation Error", false);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return Fail("Execution timed out after 10 seconds (infinite loop or heavy computation?).");
        }
        catch (Exception ex)
        {
            // Restore Console before logging so Serilog doesn't write into the captured stdout
            Console.SetOut(oldOut);
            Console.SetError(oldErr);
            _log.LogWarning(ex, "Roslyn runtime exception");
            return new Result(
                stdoutBuilder.ToString(),
                $"Runtime error ({ex.GetType().Name}): {ex.Message}",
                "—", "Runtime Error", false);
        }
        finally
        {
            Console.SetOut(oldOut);
            Console.SetError(oldErr);
            writer.Dispose();
            _concurrencySlot.Release();
        }
    }

    /// <summary>
    /// When the user writes a class-based program with a static Main() (the classic
    /// beginner pattern), Roslyn scripting defines the class but never calls Main().
    /// This helper appends the invocation so the code actually runs.
    /// Uses reflection so private/internal Main() methods are accessible.
    /// </summary>
    private static string InjectMainCall(string code)
    {
        // Detect: has "static void Main" or "static async Task Main" and a class definition
        var hasClass = System.Text.RegularExpressions.Regex.IsMatch(code, @"\bclass\s+\w+");
        var hasMain  = System.Text.RegularExpressions.Regex.IsMatch(code,
            @"static\s+(void|async\s+Task|int)\s+Main\s*\(");

        if (!hasClass || !hasMain) return code; // top-level script — no change needed

        // Determine the class name that owns Main (default "Program")
        var classMatch = System.Text.RegularExpressions.Regex.Match(code,
            @"class\s+(\w+)[\s\S]*?static\s+(void|async\s+Task|int)\s+Main");
        var className = classMatch.Success ? classMatch.Groups[1].Value : "Program";

        // Use reflection so we can call private/internal Main() — standard in real .NET
        // This injected suffix is added after the security scan so it is trusted.
        var isAsync = System.Text.RegularExpressions.Regex.IsMatch(code,
            @"static\s+async\s+Task\s+Main");
        // Detect whether Main accepts string[] args or is parameterless
        var mainHasArgs = System.Text.RegularExpressions.Regex.IsMatch(code,
            @"static\s+(async\s+Task|void|int)\s+Main\s*\(\s*string\s*\[\s*\]");
        var invokeArgs = mainHasArgs ? "new object[]{new string[0]}" : "null";
        var flags = "System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic";
        var call = isAsync
            ? $"\nvar __m = typeof({className}).GetMethod(\"Main\", {flags}); if (__m != null) await (System.Threading.Tasks.Task)__m.Invoke(null, {invokeArgs});"
            : $"\ntypeof({className}).GetMethod(\"Main\", {flags})?.Invoke(null, {invokeArgs});";

        return code + call;
    }

    private static Result Fail(string msg) =>
        new("", msg, "—", "Error", false);
}
