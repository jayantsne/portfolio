#!/bin/bash
# Ollama Speed Optimization Script
# Run on server: bash optimize-ollama.sh

set -e

echo "======================================================================"
echo "🚀 OLLAMA SPEED OPTIMIZATION"
echo "======================================================================"
echo ""

# Get CPU cores
CPU_CORES=$(nproc --all)
echo "CPU Cores detected: $CPU_CORES"
echo ""

# Step 1: Download faster 3B model
echo "1. Downloading faster 3B model (3x faster than 7B)..."
ollama pull qwen2.5:3b-instruct-q4_0
echo "✅ Model downloaded!"
echo ""

# Step 2: Configure Ollama for performance
echo "2. Optimizing Ollama service..."
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << EOF
[Service]
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_NUM_THREAD=$CPU_CORES"
EOF

systemctl daemon-reload
systemctl restart ollama
sleep 5
echo "✅ Ollama optimized!"
echo ""

# Step 3: Update backend config
echo "3. Updating backend to use 3B model..."
cd /var/www/ai-learn-api
cp appsettings.json appsettings.json.backup
sed -i 's/"Model": "qwen2.5:7b-instruct-q4_K_M"/"Model": "qwen2.5:3b-instruct-q4_0"/g' appsettings.json
sed -i 's/"MaxTokens": 2048/"MaxTokens": 1024/g' appsettings.json
echo "✅ Backend config updated!"
echo ""

# Step 4: Preload model
echo "4. Pre-loading 3B model (15-30 seconds)..."
curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"qwen2.5:3b-instruct-q4_0\",\"prompt\":\"Hello\",\"stream\":false,\"keep_alive\":\"30m\",\"options\":{\"num_thread\":$CPU_CORES,\"num_predict\":50}}" \
  --max-time 60 > /tmp/ollama-preload.json

if grep -q "response" /tmp/ollama-preload.json; then
  echo "✅ Model pre-loaded successfully!"
else
  echo "⚠️ Model loading in progress..."
fi
echo ""

# Step 5: Restart backend
echo "5. Restarting backend..."
systemctl restart ailearn-api
sleep 3
echo "✅ Backend restarted!"
echo ""

# Step 6: Test API
echo "6. Testing optimized API..."
START=$(date +%s)
curl -sk -X POST https://learnwithai.tech/api/ai/ollama \
  -H 'Content-Type: application/json' \
  -d '{"question":"Say hello"}' \
  --max-time 30 > /tmp/api-test.json
END=$(date +%s)
DURATION=$((END - START))

echo "⚡ Response time: ${DURATION} seconds"
if [ -s /tmp/api-test.json ]; then
  echo "✅ API is working!"
  head -c 200 /tmp/api-test.json
  echo ""
fi
echo ""

# Step 7: Setup auto-preload on startup
echo "7. Setting up auto-preload on restart..."
cat > /usr/local/bin/preload-ollama-model.sh << 'EOFSCRIPT'
#!/bin/bash
sleep 10
curl -s -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:3b-instruct-q4_0","prompt":"Ready","stream":false,"keep_alive":"30m","options":{"num_predict":10}}' \
  --max-time 60 > /dev/null 2>&1
logger "Ollama 3B model preloaded"
EOFSCRIPT

chmod +x /usr/local/bin/preload-ollama-model.sh

cat > /etc/systemd/system/ollama-preload.service << 'EOFSERVICE'
[Unit]
Description=Preload Ollama Model
After=ollama.service
Requires=ollama.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/preload-ollama-model.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOFSERVICE

systemctl daemon-reload
systemctl enable ollama-preload.service
echo "✅ Auto-preload configured!"
echo ""

echo "======================================================================"
echo "🎉 OPTIMIZATION COMPLETE!"
echo "======================================================================"
echo ""
echo "⚡ IMPROVEMENTS:"
echo "   • Switched from 7B → 3B model (3x faster)"
echo "   • Optimized CPU threading ($CPU_CORES cores)"
echo "   • Pre-loaded model into memory"
echo "   • Reduced token limits for speed"
echo "   • Auto-loads on server restart"
echo ""
echo "📊 EXPECTED PERFORMANCE:"
echo "   • First request: 5-15 seconds (was 60+)"
echo "   • Follow-up: 3-8 seconds"
echo "   • Model stays loaded: 30 minutes"
echo ""
echo "🎯 Test at: https://learnwithai.tech"
echo "======================================================================"
