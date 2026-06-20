# 🚀 Ollama Server Configuration

## ✅ Current Setup (SECURE ARCHITECTURE)
- **Server**: 76.13.244.113 (learnwithai.tech)
- **Ollama Port**: 11434 (localhost only - NOT exposed to internet)
- **Access Method**: ASP.NET API proxy at `/api/ai/ollama`
- **Angular Config**: Routes through ASP.NET backend (secure!)

## 🔒 Security Architecture

```
Internet → Angular App → ASP.NET API → Ollama (localhost only)
```

**Benefits:**
- ✅ Ollama NOT exposed directly to browser
- ✅ ASP.NET API acts as secure proxy
- ✅ Can add authentication/rate limiting
- ✅ Server-side API key management
- ✅ CORS handled properly

## 📋 Server Setup (Already Done)

Ollama is running on the server at localhost:11434 (internal only).

### Verify Ollama is Running
```bash
ssh root@76.13.244.113
# Password: <DEPLOY_SSH_PASSWORD>

# Check Ollama status
systemctl status ollama
ollama list

# Test locally
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "What is Angular?",
  "stream": false
}'
```

## 🛠️ ASP.NET API Integration Required

See **[ASPNET_OLLAMA_INTEGRATION.md](./ASPNET_OLLAMA_INTEGRATION.md)** for complete implementation guide.

**Quick Steps:**
1. Add `OllamaService.cs` to Infrastructure layer
2. Add `OllamaController.cs` to API layer
3. Register services in `Program.cs`
4. Deploy to server
5. Test endpoint: `http://learnwithai.tech/api/ai/ollama`

## ❌ What NOT To Do

**DON'T expose Ollama directly:**
```bash
# ❌ BAD - Don't do this!
ufw allow 11434/tcp  # Exposes Ollama to internet
OLLAMA_HOST=0.0.0.0:11434  # Listens on all interfaces
```

**✅ CORRECT - Keep it localhost only:**
```bash
# Ollama should ONLY listen on localhost
netstat -tlnp | grep 11434
# Should show: 127.0.0.1:11434 (not 0.0.0.0:11434)
```

## 📝 Current Failover Chain

1. Backend API (Cloudflare Workers)
2. Groq API
3. OpenRouter API
4. Google Gemini API
5. HuggingFace API
6. Together.ai API
7. **Ollama (YOUR SERVER)** ← Final safety net!
