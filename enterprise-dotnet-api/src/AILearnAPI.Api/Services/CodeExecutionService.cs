using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AILearnAPI.Api.Services;

// ── DTOs ──────────────────────────────────────────────────────────────────────

public record CodeExecuteRequest(string Language, string Code);

public record CodeExecuteResponse(
    string Stdout,
    string Stderr,
    string CompileOutput,
    string ExecutionTime,
    string Status,
    bool Success
);

// ── Service interface ─────────────────────────────────────────────────────────

public interface ICodeExecutionService
{
    Task<CodeExecuteResponse> ExecuteAsync(CodeExecuteRequest request, CancellationToken ct = default);
}

// ── Implementation ────────────────────────────────────────────────────────────

public class CodeExecutionService : ICodeExecutionService
{
    // Judge0 Community Edition language IDs (same for self-hosted and RapidAPI)
    private static readonly Dictionary<string, int> LanguageIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["javascript"] = 63,   // Node.js 12
        ["typescript"] = 74,   // TypeScript 3.7
        ["python"]     = 71,   // Python 3.8
        ["csharp"]     = 51,   // C# Mono 6.6
        ["java"]       = 62,   // Java OpenJDK 13
        ["cpp"]        = 54,   // C++ GCC 9.2
        ["go"]         = 60,   // Go 1.13
        ["rust"]       = 73,   // Rust 1.40
    };

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _http;
    private readonly IConfiguration _cfg;
    private readonly ILogger<CodeExecutionService> _log;

    public CodeExecutionService(
        IHttpClientFactory httpFactory,
        IConfiguration cfg,
        ILogger<CodeExecutionService> log)
    {
        _http = httpFactory.CreateClient("Judge0");
        _cfg  = cfg;
        _log  = log;
    }

    // ── Public entrypoint ────────────────────────────────────────────────────

    public async Task<CodeExecuteResponse> ExecuteAsync(CodeExecuteRequest req, CancellationToken ct = default)
    {
        if (!LanguageIds.TryGetValue(req.Language, out var langId))
            return Fail($"Unsupported language: '{req.Language}'. Supported: javascript, typescript, python, csharp, java, cpp, go, rust");

        // Decide mode: "self-hosted" (default) or "rapidapi"
        var mode = (_cfg["Judge0:Mode"] ?? "self-hosted").Trim().ToLowerInvariant();

        return mode == "rapidapi"
            ? await ExecuteViaRapidApiAsync(req.Code, langId, ct)
            : await ExecuteViaSelfHostedAsync(req.Code, langId, ct);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODE 1 — Self-hosted Judge0  (no API key needed, synchronous wait=true)
    // Judge0 runs on the VPS: docker compose up -d  at port 2358
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<CodeExecuteResponse> ExecuteViaSelfHostedAsync(
        string code, int langId, CancellationToken ct)
    {
        var baseUrl = (_cfg["Judge0:SelfHostedUrl"] ?? "http://localhost:2358").TrimEnd('/');

        var payload = new
        {
            language_id           = langId,
            source_code           = code,
            stdin                 = "",
            cpu_time_limit        = 10,       // seconds
            cpu_extra_time        = 2,
            wall_time_limit       = 20,
            memory_limit          = 262144,   // 256 MB in KB
            max_file_size         = 1024,
            max_stdout            = 65536,
        };

        var content = new StringContent(
            JsonSerializer.Serialize(payload, JsonOpts),
            Encoding.UTF8,
            "application/json");

        _log.LogInformation("Judge0 self-hosted execute: langId={LangId} host={Host}", langId, baseUrl);

        HttpResponseMessage resp;
        try
        {
            // wait=true → Judge0 blocks until execution finishes and returns the full result directly
            resp = await _http.PostAsync(
                $"{baseUrl}/submissions?base64_encoded=false&wait=true", content, ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Judge0 self-hosted request failed for {Host}", baseUrl);
            return Fail($"Cannot connect to self-hosted Judge0 at {baseUrl}. " +
                        "Ensure Judge0 is running on the server: cd /opt/judge0 && docker compose up -d");
        }

        if (!resp.IsSuccessStatusCode)
        {
            var errBody = await resp.Content.ReadAsStringAsync(ct);
            _log.LogWarning("Judge0 self-hosted {Status}: {Body}", resp.StatusCode, errBody);
            return Fail($"Judge0 returned {(int)resp.StatusCode}: {errBody.Truncate(300)}");
        }

        var json   = await resp.Content.ReadAsStringAsync(ct);
        var result = JsonSerializer.Deserialize<Judge0Result>(json, JsonOpts);
        return result is null ? Fail("Empty response from Judge0.") : BuildResponse(result);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODE 2 — RapidAPI hosted Judge0  (needs X-RapidAPI-Key, async + poll)
    // ═══════════════════════════════════════════════════════════════════════

    private async Task<CodeExecuteResponse> ExecuteViaRapidApiAsync(
        string code, int langId, CancellationToken ct)
    {
        var baseUrl = (_cfg["Judge0:BaseUrl"] ?? "https://judge0-ce.p.rapidapi.com").TrimEnd('/');
        var apiKey  = _cfg["Judge0:RapidApiKey"] ?? "";
        var apiHost = _cfg["Judge0:RapidApiHost"] ?? "judge0-ce.p.rapidapi.com";

        var payload = new { language_id = langId, source_code = code, stdin = "" };
        var content = new StringContent(
            JsonSerializer.Serialize(payload, JsonOpts), Encoding.UTF8, "application/json");
        content.Headers.Add("X-RapidAPI-Key",  apiKey);
        content.Headers.Add("X-RapidAPI-Host", apiHost);

        HttpResponseMessage submitResp;
        try
        {
            submitResp = await _http.PostAsync(
                $"{baseUrl}/submissions?base64_encoded=false&wait=false", content, ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Judge0 RapidAPI submit failed");
            return Fail("Could not reach Judge0 via RapidAPI. Check your internet connection and API key.");
        }

        if (!submitResp.IsSuccessStatusCode)
            return Fail($"Judge0 RapidAPI submission failed ({(int)submitResp.StatusCode}). " +
                        "Verify your key at Judge0:RapidApiKey in appsettings.");

        var submitJson = await submitResp.Content.ReadAsStringAsync(ct);
        var token      = JsonSerializer.Deserialize<Judge0TokenResponse>(submitJson, JsonOpts)?.Token;
        if (string.IsNullOrWhiteSpace(token)) return Fail("No execution token returned by Judge0.");

        var maxAttempts = int.TryParse(_cfg["Judge0:MaxPollAttempts"],   out var m) ? m : 20;
        var pollDelayMs = int.TryParse(_cfg["Judge0:WaitBetweenPollMs"], out var p) ? p : 500;

        for (var i = 0; i < maxAttempts; i++)
        {
            await Task.Delay(pollDelayMs, ct);
            var pollReq = new HttpRequestMessage(HttpMethod.Get,
                $"{baseUrl}/submissions/{token}?base64_encoded=false");
            pollReq.Headers.Add("X-RapidAPI-Key",  apiKey);
            pollReq.Headers.Add("X-RapidAPI-Host", apiHost);

            try
            {
                var pollResp = await _http.SendAsync(pollReq, ct);
                if (!pollResp.IsSuccessStatusCode) continue;
                var pollJson = await pollResp.Content.ReadAsStringAsync(ct);
                var result   = JsonSerializer.Deserialize<Judge0Result>(pollJson, JsonOpts);
                if (result?.Status?.Id is null or 1 or 2) continue; // In Queue / Processing
                return BuildResponse(result);
            }
            catch { continue; }
        }

        return Fail("Execution timed out. Your code may have an infinite loop or exceeded the time limit.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CodeExecuteResponse BuildResponse(Judge0Result r)
    {
        var stdout   = r.Stdout         ?? "";
        var stderr   = r.Stderr         ?? "";
        var compile  = r.CompileOutput  ?? "";
        var time     = r.Time is not null ? $"{r.Time}s" : "—";
        var desc     = r.Status?.Description ?? "Unknown";
        var statusId = r.Status?.Id ?? 0;
        var success  = statusId == 3; // Accepted

        if (!string.IsNullOrWhiteSpace(compile) && string.IsNullOrWhiteSpace(stderr) && !success)
            stderr = compile;

        return new CodeExecuteResponse(stdout, stderr, compile, time, desc, success);
    }

    private static CodeExecuteResponse Fail(string msg) =>
        new("", msg, "", "—", "Error", false);

    // ── Judge0 JSON shapes ────────────────────────────────────────────────────

    private class Judge0TokenResponse
    {
        [JsonPropertyName("token")] public string? Token { get; init; }
    }

    private class Judge0Result
    {
        [JsonPropertyName("stdout")]         public string?       Stdout        { get; init; }
        [JsonPropertyName("stderr")]         public string?       Stderr        { get; init; }
        [JsonPropertyName("compile_output")] public string?       CompileOutput { get; init; }
        [JsonPropertyName("time")]           public string?       Time          { get; init; }
        [JsonPropertyName("status")]         public Judge0Status? Status        { get; init; }
    }

    private class Judge0Status
    {
        [JsonPropertyName("id")]          public int?    Id          { get; init; }
        [JsonPropertyName("description")] public string? Description { get; init; }
    }
}

// ── String helper ─────────────────────────────────────────────────────────────

internal static class StringExtensions
{
    internal static string Truncate(this string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}
