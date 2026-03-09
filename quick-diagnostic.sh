#!/bin/bash
# Quick diagnostic - what's happening with Ollama?

echo "==================================================================="
echo "OLLAMA DIAGNOSTIC"
echo "==================================================================="
echo ""

echo "1. Ollama process status:"
ps aux | grep ollama | grep -v grep
echo ""

echo "2. Is Ollama responding to tags?"
curl -s http://localhost:11434/api/tags --max-time 5
echo ""

echo "3. Quick test (10 word response):"
curl -s http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"Say hi in 3 words","stream":false,"options":{"num_predict":10}}' \
  --max-time 30
echo ""

echo "4. Backend logs (last 20 lines):"
journalctl -u ailearn-api -n 20 --no-pager
echo ""

echo "5. Ollama logs:"
journalctl -u ollama -n 10 --no-pager
echo ""

echo "==================================================================="
