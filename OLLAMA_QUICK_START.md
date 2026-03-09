# 🚀 QUICK START - Deploy Ollama Backend NOW!

## ⚡ 3-Step Deployment (5 Minutes)

### Step 1: Deploy to Server
```powershell
.\deploy-ollama-backend.ps1
```
**What it does:**
- ✅ Builds ASP.NET project
- ✅ Uploads to server (76.13.244.113)
- ✅ Restarts API service
- ✅ Runs health checks

**Expected output:**
```
🎉 DEPLOYMENT COMPLETE!
✅ Service restarted successfully!
```

---

### Step 2: Test Endpoints
```powershell
.\test-ollama-api.ps1
```
**Choose option 1** (Production)

**Expected results:**
- ✅ Test 1/4: Health Check - PASS
- ✅ Test 2/4: Get Available Models - PASS  
- ✅ Test 3/4: Simple Explanation - PASS
- ✅ Test 4/4: Full Claude-Quality Explanation - PASS

---

### Step 3: Test in Angular
```powershell
cd angular-starter
ng serve --port 4203
```

**Open:** http://localhost:4203  
**Search for:** "Angular Observables"

**Expected result:**  
Full Claude-style explanation with:
- ✅ Opening analogy
- ✅ Code examples
- ✅ Structured sections
- ✅ Follow-up questions

---

## 🎯 Success Checklist

After running all 3 steps, verify:

- [ ] Deployment script shows "DEPLOYMENT COMPLETE!"
- [ ] Test script shows 4/4 tests passing
- [ ] Angular app displays full explanations
- [ ] Response includes code blocks and sections
- [ ] No errors in browser console
- [ ] Response time < 60 seconds

---

## ⚠️ Troubleshooting

### Issue: Deployment fails
```powershell
# Check SSH access
ssh root@76.13.244.113 "echo 'SSH works!'"

# Manual deployment
cd d:\folio\jayant-angular-ui\enterprise-dotnet-api
dotnet publish .\src\AILearnAPI.Api\AILearnAPI.Api.csproj -c Release -r linux-x64 -o .\publish
scp -r .\publish\* root@76.13.244.113:/var/www/ai-learn-api/
ssh root@76.13.244.113 "systemctl restart ailearn-api"
```

### Issue: Tests fail with "Service unavailable"
```bash
# SSH to server
ssh root@76.13.244.113

# Check Ollama
systemctl status ollama
systemctl start ollama

# Check API
systemctl status ailearn-api
systemctl restart ailearn-api

# View logs
journalctl -u ailearn-api -n 50 --no-pager
```

### Issue: Angular shows "Loading..." forever
1. Open browser DevTools (F12) → Console
2. Check for errors
3. Verify API URL in Angular:
   - Should be: `http://learnwithai.tech/api/ai/ollama`
4. Test direct API call:
   ```bash
   curl http://learnwithai.tech/api/ai/ollama/health
   ```

---

## 📊 What Was Built

### Backend (ASP.NET):
- ✅ **AIController** - `/api/ai/ollama` endpoint
- ✅ **OllamaService** - Optimized for Claude-quality responses
- ✅ **Claude Prompt Template** - Built into controller
- ✅ **Error Handling** - Descriptive errors for all failure modes
- ✅ **Performance Tracking** - Token count, timing
- ✅ **Health Checks** - `/api/ai/ollama/health`
- ✅ **Models List** - `/api/ai/ollama/models`

### Frontend (Angular):
- ✅ **Already configured** to call `/api/ai/ollama`
- ✅ **Automatic failover** - Backend → Groq → ... → Ollama  
- ✅ **Response parsing** - Handles all format variations
- ✅ **Beautiful UI** - Modal with formatted explanations

### Configuration:
- ✅ **Timeout**: 300 seconds (5 minutes)
- ✅ **Max Tokens**: 2048
- ✅ **Temperature**: 0.7 (balanced)
- ✅ **Model**: qwen2.5:7b-instruct-q4_K_M
- ✅ **Optimization**: Top-K, Top-P, Repeat Penalty

---

## 🎓 Features

### Claude-Quality Responses Include:
- ✅ Opening analogy (20-30 words)
- ✅ Problem it solves
- ✅ Core explanation with mental models
- ✅ 3 code examples (basic → real-world → advanced)
- ✅ Common pitfalls with WHY explanations
- ✅ When to use / avoid (decision framework)
- ✅ Comparison tables
- ✅ Mental checkpoints
- ✅ Next steps
- ✅ 3 follow-up questions

### Performance:
- ⚡ **Simple question**: 5-15 seconds
- ⚡ **Full explanation**: 30-60 seconds
- 💰 **Cost**: $0 (unlimited usage)
- 🎯 **Quality**: Claude-level teaching

---

## 📖 API Endpoints

### POST /api/ai/ollama
Generate Claude-quality explanation.

**Example:**
```bash
curl -X POST http://learnwithai.tech/api/ai/ollama \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Angular?",
    "temperature": 0.7,
    "maxTokens": 2048
  }'
```

### GET /api/ai/ollama/health
Check if Ollama is running.

### GET /api/ai/ollama/models
List available models.

---

## 🔗 Documentation

- **[OLLAMA_BACKEND_COMPLETE.md](OLLAMA_BACKEND_COMPLETE.md)** - Full implementation details
- **[test-ollama-api.ps1](test-ollama-api.ps1)** - Test script
- **[deploy-ollama-backend.ps1](deploy-ollama-backend.ps1)** - Deployment script

---

## 🚀 Deploy Now!

Run these commands:

```powershell
# 1. Deploy
.\deploy-ollama-backend.ps1

# 2. Test
.\test-ollama-api.ps1

# 3. Verify in Angular
cd angular-starter
ng serve --port 4203
# Then open http://localhost:4203 and search!
```

**Total time:** 5-10 minutes  
**Result:** Claude-quality AI explanations! 🎉

---

Need help? Check [OLLAMA_BACKEND_COMPLETE.md](OLLAMA_BACKEND_COMPLETE.md) for detailed troubleshooting.
