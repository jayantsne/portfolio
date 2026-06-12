# 🚀 Quick API Setup Guide (5 Minutes!)

Your AI Learning Assistant needs at least 1 API key to work. Here are the fastest options:

## ⚡ Option 1: Groq (RECOMMENDED - Fastest & Free!)

**Why Groq?**
- ✅ **SUPER FAST**: 500 tokens/second (fastest AI inference)
- ✅ **FREE**: 14,400 requests/day per key  
- ✅ **NO CREDIT CARD**: Just sign up with Google
- ✅ **5 Minute Setup**: Instant API key

### Steps:
1. Go to https://console.groq.com/keys
2. Click "Sign in with Google" (no password needed!)
3. Click "Create API Key" → Name it "Learn App" → Copy the key
4. Open [`src/environments/environment.ts`](angular-starter/src/environments/environment.ts)
5. Replace this line:
   ```typescript
   // 'gsk_YOUR_ACTUAL_KEY_HERE',
   ```
   With your actual key:
   ```typescript
   'gsk_1X2y3Z4a5B6c7D8e9F0g1H2i3J4k5L6m7N8o9P0q1R2s3T',
   ```
6. Save file and reload the app!

**Result:** Instant Claude-quality AI explanations! 🎉

---

## 🎯 Option 2: OpenRouter (100+ AI Models)

**Why OpenRouter?**
- ✅ **FREE TIER**: Many free models (Llama, Mistral, etc.)
- ✅ **100+ MODELS**: Access to GPT-4, Claude, Llama, Gemini, etc.
- ✅ **$0.10 MINIMUM**: Super cheap paid models if you need more

### Steps:
1. Go to https://openrouter.ai/keys
2. Sign up (email or Google)
3. Click "Create Key" → Copy it
4. Open [`src/app/services/ai-learn.service.ts`](angular-starter/src/app/services/ai-learn.service.ts)
5. Find `OPENROUTER_API_KEYS` array (around line 90)
6. Replace a placeholder:
   ```typescript
   'YOUR_OPENROUTER_API_KEY',
   ```

---

## 🔄 Option 3: Ollama (Local AI - No API Keys!)

**Why Ollama?**
- ✅ **UNLIMITED**: No rate limits, runs on your server
- ✅ **PRIVATE**: All data stays on your machine
- ✅ **FREE**: 100% free forever

**Status:** Ollama server is running on `learnwithai.tech` (port 11434)  
**Issue:** ASP.NET API proxy not yet implemented

### To Enable:
1. Implement ASP.NET backend following [`ASPNET_OLLAMA_INTEGRATION.md`](ASPNET_OLLAMA_INTEGRATION.md)
2. Deploy to server
3. Ollama will automatically work as final fallback!

---

## 🌟 Option 4: Google Gemini (Generous Free Tier)

**Why Gemini?**
- ✅ **FREE**: 60 req/min, 1,500 req/day per key
- ✅ **SMART**: Google's latest AI (good quality)
- ✅ **EASY**: Instant key generation

### Steps:
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click "Create API key" → Select a project → Copy key
4. Open [`src/app/services/ai-learn.service.ts`](angular-starter/src/app/services/ai-learn.service.ts)
5. Find `GEMINI_API_KEYS` array (around line 25)
6. Replace first placeholder:
   ```typescript
   'YOUR_GOOGLE_API_KEY',
   ```
   With your key:
   ```typescript
   'YOUR_FIREBASE_API_KEY',
   ```

---

## ⚡ Quick Start Checklist

1. **Get Groq key** (5 minutes): https://console.groq.com/keys
2. **Add to environment.ts**: Paste key in `groqApiKeys` array
3. **Restart dev server**: `Ctrl+C` then `ng serve --port 4203`
4. **Test**: Search for "Angular Observables" in the app!

---

## 🔍 Current Configuration

Your app is currently configured to try providers in this order:

1. **Groq** ← Start here (fastest!)
2. Backend (Cloudflare Workers)
3. OpenRouter
4. Gemini
5. HuggingFace
6. Together.ai
7. Ollama (local server)

The system will automatically switch to the next provider if one fails!

---

## 🆘 Troubleshooting

### "All API providers exhausted"
- **Cause**: No valid API keys configured
- **Fix**: Add at least 1 Groq key (see Option 1 above)

### "Loading..." forever
- **Cause**: Backend API might be down
- **Fix**: Add a Groq key to bypass backend dependency

### Response shows "Learning Tips" instead of full explanation
- **Cause**: Backend API returned fallback response
- **Fix**: Add a direct provider key (Groq/Gemini/OpenRouter)

---

## 💡 Pro Tips

### Scale to Production
- **Add multiple keys**: Create 5-10 Groq accounts with different emails
- **Use gmail aliases**: `yourname+key1@gmail.com`, `yourname+key2@gmail.com`, etc.
- **Implement Ollama**: Unlimited requests, no costs!

### Best Setup for Development
```
Groq: 2-3 keys (fast iteration)
Gemini: 1-2 keys (backup)
Ollama: Implement ASP.NET proxy (unlimited fallback)
```

### Best Setup for Production
```
Groq: 10+ keys (14,400 × 10 = 144,000 req/day)
Ollama: Fully implemented (handles overflow)
Backend: Cloudflare Workers (caching layer)
```

---

## 🎯 Next Steps

1. **Immediate**: Add 1 Groq key (takes 3 minutes)
2. **Soon**: Implement Ollama backend (see [`ASPNET_OLLAMA_INTEGRATION.md`](ASPNET_OLLAMA_INTEGRATION.md))
3. **Production**: Add 10+ Groq keys for scale

**Get started now:** https://console.groq.com/keys 🚀
