import paramiko
import sys

hostname = '76.13.244.113'
username = 'root'
password = '1ZC7Lts7,saeb)Y0H4@n'
port = 22

def execute_command(client, command, description=""):
    """Execute a command and print results"""
    if description:
        print(f"\n🔧 {description}")
    stdin, stdout, stderr = client.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output.strip())
    if error and exit_code != 0:
        print(f"⚠️ {error.strip()}")
    
    return exit_code, output, error

def disable_api_key_for_readonly():
    try:
        print(f"🔌 Connecting to {hostname}...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(hostname, port=port, username=username, password=password, timeout=15)
        print(f"✅ Connected\n")
        
        print("="*60)
        print("Updating ApiKeyAuthenticationMiddleware.cs")
        print("="*60)
        
        # Create updated middleware that allows GET requests without API key
        middleware_code = '''using AILearnAPI.Api.Models;
using Microsoft.Extensions.Options;

namespace AILearnAPI.Api.Middleware;

public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthenticationMiddleware> _logger;
    private readonly string _apiKey;

    public ApiKeyAuthenticationMiddleware(
        RequestDelegate next,
        IOptions<ApiSettings> settings,
        ILogger<ApiKeyAuthenticationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _apiKey = settings.Value.ApiKey;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";
        var method = context.Request.Method.ToUpper();
        
        // Skip authentication for health check
        if (path.Contains("/health"))
        {
            await _next(context);
            return;
        }

        // Skip authentication for Swagger UI and Swagger JSON
        if (path.Contains("/swagger"))
        {
            await _next(context);
            return;
        }

        // Allow GET requests (read-only) without API key for public access
        if (method == "GET" && path.Contains("/api/"))
        {
            _logger.LogInformation("Public GET request to {Path} allowed", path);
            await _next(context);
            return;
        }

        // Require API key for POST, PUT, DELETE, PATCH (write operations)
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var extractedApiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "API Key is required for write operations" });
            return;
        }

        if (!string.Equals(extractedApiKey, _apiKey, StringComparison.Ordinal))
        {
            _logger.LogWarning("Invalid API key attempt from {IP}", context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API Key" });
            return;
        }

        await _next(context);
    }
}'''
        
        # Write the updated middleware
        update_cmd = f'''cat > /var/www/learnwithai.tech/backend/ApiKeyAuthenticationMiddleware.cs << 'EOFMIDDLEWARE'
{middleware_code}
EOFMIDDLEWARE'''
        
        execute_command(client, update_cmd, "Writing updated middleware")
        execute_command(client, "systemctl restart ailearnapi.service", "Restarting API")
        
        print("\n⏳ Waiting 5 seconds for API to restart...")
        import time
        time.sleep(5)
        
        print("\n" + "="*60)
        print("Testing API endpoints")
        print("="*60)
        
        # Test without API key (should work now)
        execute_command(client,
            "curl -s http://localhost:5000/api/questions | python3 -c 'import sys, json; d = json.load(sys.stdin); print(\"Total questions:\", d.get(\"total\", 0))'",
            "Questions endpoint (no API key)"
        )
        
        # Test public URL
        execute_command(client,
            "curl -s https://learnwithai.tech/api/questions | python3 -c 'import sys, json; d = json.load(sys.stdin); print(\"Public API Total:\", d.get(\"total\", 0))'",
            "Public endpoint test"
        )
        
        # Show sample questions
        execute_command(client,
            "curl -s https://learnwithai.tech/api/questions | python3 -m json.tool | head -60",
            "Sample response"
        )
        
        client.close()
        
        print("\n" + "="*60)
        print("✅ API KEY DISABLED FOR GET REQUESTS!")
        print("="*60)
        print("\n🌐 Public endpoint (no auth needed):")
        print("   GET https://learnwithai.tech/api/questions")
        print("\n🔒 Protected endpoints (API key required):")
        print("   POST/PUT/DELETE https://learnwithai.tech/api/questions/*")
        print("\n💡 Next: Update Angular component to use API")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    disable_api_key_for_readonly()
