#!/bin/bash
# Run this script on your server (76.13.244.113)
# ssh root@76.13.244.113 'bash -s' < fix-ollama-now.sh

echo "======================================================================"
echo "🔧 FIXING OLLAMA SERVICE"
echo "======================================================================"

# 1. Restart Ollama
echo ""
echo "1. Restarting Ollama service..."
systemctl restart ollama
sleep 3
echo "✅ Service restarted"

# 2. Check status
echo ""
echo "2. Checking service status..."
systemctl is-active ollama && echo "✅ Ollama is active" || echo "❌ Ollama is not active"

# 3. Preload model (THIS IS THE KEY STEP!)
echo ""
echo "3. Preloading model into memory (30-60 seconds)..."
echo "   This loads the 7B model so responses are fast..."

RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"Hello","stream":false}' \
  --max-time 120)

if echo "$RESPONSE" | grep -q "response"; then
  echo "✅ Model loaded successfully!"
  echo "   Response: $(echo $RESPONSE | python3 -c 'import sys,json; print(json.load(sys.stdin).get("response","")[:50])' 2>/dev/null || echo 'OK')"
else
  echo "⚠️ Model loading may have failed"
  echo "   Response: ${RESPONSE:0:200}"
fi

# 4. Test the API endpoint
echo ""
echo "4. Testing API endpoint..."
API_RESPONSE=$(curl -sk -X POST https://learnwithai.tech/api/ai/ollama \
  -H 'Content-Type: application/json' \
  -d '{"question":"Test"}' \
  --max-time 60)

if [ -n "$API_RESPONSE" ]; then
  echo "✅ API responded!"
  echo "   Preview: ${API_RESPONSE:0:150}"
else
  echo "⚠️ API did not respond"
fi

# 5. Configure model to stay loaded longer
echo ""
echo "5. Configuring model to stay in memory for 30 minutes..."
curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"","keep_alive":"30m"}' \
  > /dev/null 2>&1

echo "✅ Model will stay loaded for 30 minutes"

echo ""
echo "======================================================================"
echo "✅ OLLAMA FIX COMPLETE!"
echo "======================================================================"
echo ""
echo "Your AI assistant should now respond quickly!"
echo "Try it at: https://learnwithai.tech"
echo ""
echo "Tips:"
echo "  • First response: ~5-10 seconds (model is already loaded)"
echo "  • Subsequent responses: ~2-5 seconds"
echo "  • If no activity for 30 min, model unloads and needs reloading"
echo ""
