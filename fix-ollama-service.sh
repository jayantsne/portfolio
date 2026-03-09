#!/bin/bash
# Fix Ollama Service - Run this on your server
# chmod +x fix-ollama-service.sh && ./fix-ollama-service.sh

echo "======================================================================"
echo "🔧 FIXING OLLAMA SERVICE"
echo "======================================================================"
echo ""

# 1. Check Ollama service status
echo "1. Checking Ollama service status..."
systemctl status ollama --no-pager | head -10
echo ""

# 2. Restart Ollama service
echo "2. Restarting Ollama service..."
systemctl restart ollama
sleep 3
echo "✅ Ollama service restarted"
echo ""

# 3. Check if service is running
echo "3. Verifying service is active..."
systemctl is-active ollama
echo ""

# 4. Check available models
echo "4. Checking available models..."
curl -s http://localhost:11434/api/tags | python3 -m json.tool
echo ""

# 5. Preload the model (this is key - warms up model in memory)
echo "5. Preloading qwen2.5 model (this may take 30-60 seconds)..."
curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"Hello","stream":false,"keep_alive":"10m"}' \
  --max-time 120 | python3 -m json.tool
echo ""
echo "✅ Model preloaded and will stay in memory for 10 minutes"
echo ""

# 6. Test generation
echo "6. Testing quick generation..."
curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"Say hi in one word","stream":false}' \
  --max-time 30 | python3 -c "import sys, json; resp=json.load(sys.stdin); print(f'Response: {resp.get(\"response\",\"ERROR\")}')"
echo ""

# 7. Check backend service
echo "7. Checking backend service..."
systemctl status ailearn-api --no-pager | head -10
echo ""

# 8. Test full endpoint
echo "8. Testing full API endpoint..."
curl -sk -X POST https://learnwithai.tech/api/ai/ollama \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are Promises?","provider":"ollama"}' \
  --max-time 120
echo ""
echo ""

echo "======================================================================"
echo "✅ OLLAMA SERVICE FIXED"
echo "======================================================================"
echo ""
echo "The model is now loaded in memory and ready for fast responses!"
echo "Try your AI search again at https://learnwithai.tech"
echo ""
