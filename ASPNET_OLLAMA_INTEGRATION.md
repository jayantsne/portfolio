# 🔒 ASP.NET API - Ollama Integration Guide

## ✅ Frontend Configuration Complete
- Angular now routes all Ollama requests through ASP.NET API
- Endpoint: `http://learnwithai.tech/api/ai/ollama`
- Ollama server NOT exposed directly to browser (secure!)

## 📝 ASP.NET API Implementation Needed

### 1. Add Ollama Service (Infrastructure Layer)

**File**: `src/AILearnAPI.Infrastructure/Services/OllamaService.cs`

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AILearnAPI.Infrastructure.Services
{
    public class OllamaService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<OllamaService> _logger;
        private readonly string _ollamaBaseUrl;

        public OllamaService(HttpClient httpClient, IConfiguration configuration, ILogger<OllamaService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _ollamaBaseUrl = configuration["Ollama:BaseUrl"] ?? "http://localhost:11434";
        }

        public async Task<string> GenerateAsync(string prompt, string model = "llama2", CancellationToken cancellationToken = default)
        {
            try
            {
                var request = new
                {
                    model = model,
                    prompt = prompt,
                    stream = false,
                    options = new
                    {
                        temperature = 0.7,
                        num_predict = 2048
                    }
                };

                _logger.LogInformation("🏠 Calling Ollama with model: {Model}", model);

                var response = await _httpClient.PostAsJsonAsync(
                    $"{_ollamaBaseUrl}/api/generate",
                    request,
                    cancellationToken
                );

                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<OllamaResponse>(cancellationToken);
                
                _logger.LogInformation("✅ Ollama response received, length: {Length}", result?.Response?.Length ?? 0);
                
                return result?.Response ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Ollama generation failed");
                throw;
            }
        }

        public async Task<List<string>> GetModelsAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<OllamaModelsResponse>(
                    $"{_ollamaBaseUrl}/api/tags",
                    cancellationToken
                );

                return response?.Models?.Select(m => m.Name).ToList() ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get Ollama models");
                return new List<string> { "llama2" }; // Default fallback
            }
        }

        private class OllamaResponse
        {
            public string Response { get; set; }
            public string Model { get; set; }
            public bool Done { get; set; }
        }

        private class OllamaModelsResponse
        {
            public List<OllamaModel> Models { get; set; }
        }

        private class OllamaModel
        {
            public string Name { get; set; }
        }
    }
}
```

### 2. Add Ollama Controller (API Layer)

**File**: `src/AILearnAPI.Api/Controllers/OllamaController.cs`

```csharp
using AILearnAPI.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace AILearnAPI.Api.Controllers
{
    [ApiController]
    [Route("api/ai/ollama")]
    public class OllamaController : ControllerBase
    {
        private readonly OllamaService _ollamaService;
        private readonly ILogger<OllamaController> _logger;

        public OllamaController(OllamaService ollamaService, ILogger<OllamaController> logger)
        {
            _ollamaService = ollamaService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Generate([FromBody] OllamaRequest request)
        {
            try
            {
                _logger.LogInformation("🔍 Ollama request for model: {Model}", request.Model ?? "llama2");

                var response = await _ollamaService.GenerateAsync(
                    request.Question,
                    request.Model ?? "llama2",
                    HttpContext.RequestAborted
                );

                return Ok(new
                {
                    success = true,
                    explanation = response,
                    provider = "ollama",
                    model = request.Model ?? "llama2"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ollama generation failed");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Ollama generation failed",
                    message = ex.Message
                });
            }
        }

        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            try
            {
                var models = await _ollamaService.GetModelsAsync(HttpContext.RequestAborted);
                return Ok(new { models });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get models");
                return StatusCode(500, new { error = "Failed to get models" });
            }
        }

        public class OllamaRequest
        {
            public string Question { get; set; }
            public string Model { get; set; }
            public string Provider { get; set; }
            public double Temperature { get; set; } = 0.7;
            public int MaxTokens { get; set; } = 2048;
        }
    }
}
```

### 3. Register Services (Startup/Program.cs)

**File**: `src/AILearnAPI.Api/Program.cs` or `Startup.cs`

```csharp
// Add to ConfigureServices or builder.Services

// Ollama Service
builder.Services.AddHttpClient<OllamaService>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromMinutes(5); // Ollama can take time
    });

builder.Services.AddSingleton<OllamaService>();
```

### 4. Configuration (appsettings.json)

**File**: `src/AILearnAPI.Api/appsettings.json`

```json
{
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "DefaultModel": "llama2",
    "Timeout": 300000
  },
  "Logging": {
    "LogLevel": {
      "AILearnAPI.Infrastructure.Services.OllamaService": "Information"
    }
  }
}
```

### 5. Environment Configuration (Production)

**File**: `src/AILearnAPI.Api/appsettings.Production.json`

```json
{
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "DefaultModel": "llama2"
  }
}
```

## 🔒 Security Notes

1. **Ollama server listens only on localhost:11434** - not exposed to internet
2. **ASP.NET API is the only interface** - acts as secure proxy
3. **Rate limiting** - Consider adding rate limiting to Ollama endpoint
4. **Authentication** - Consider adding API key requirement

## 🧪 Testing

### Test Ollama Endpoint (Server-side)
```bash
ssh root@76.13.244.113

# Test Ollama directly on server
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "What is Angular?",
  "stream": false
}'
```

### Test ASP.NET API Endpoint (From Browser/Postman)
```bash
POST http://learnwithai.tech/api/ai/ollama

{
  "question": "What is Angular framework?",
  "model": "llama2",
  "provider": "ollama"
}

Expected Response:
{
  "success": true,
  "explanation": "Angular is a...",
  "provider": "ollama",
  "model": "llama2"
}
```

## 🚀 Deployment Steps

1. **Add code to ASP.NET project**
2. **Build and test locally**
3. **Deploy to server**:
   ```bash
   # Build
   dotnet publish -c Release -o ./publish
   
   # Copy to server
   scp -r ./publish/* root@76.13.244.113:/var/www/ai-learn-api/
   
   # Restart service
   ssh root@76.13.244.113
   systemctl restart ailearn-api
   ```

4. **Verify**:
   ```bash
   curl http://learnwithai.tech/api/ai/ollama/models
   ```

## ✅ Failover Chain (Current)

```
Angular App Request
    ↓
ASP.NET API (/api/ai/ollama)
    ↓
Ollama Server (localhost:11434)
    ↓
llama2/mistral/codellama models
```

## 🎯 Benefits

- ✅ Ollama NOT exposed to internet
- ✅ Single point of control (ASP.NET API)
- ✅ Easy to add authentication
- ✅ Can add caching layer
- ✅ Logging and monitoring
- ✅ Rate limiting possible
- ✅ CORS handled properly
