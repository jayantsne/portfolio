# PowerShell version - copy/paste this directly into your SSH session

Write-Host "======================================================================"
Write-Host "FIXING OLLAMA SERVICE ON SERVER" -ForegroundColor Yellow
Write-Host "======================================================================"
Write-Host ""

# Instructions for manual execution
Write-Host "COPY AND PASTE THESE COMMANDS INTO YOUR  SERVER SSH SESSION:" -ForegroundColor Cyan
Write-Host ""
Write-Host '# 1. Restart Ollama service'
Write-Host 'systemctl restart ollama'
Write-Host 'sleep 3'
Write-Host ''
Write-Host '# 2. Check status'  
Write-Host 'systemctl status ollama --no-pager'
Write-Host ''
Write-Host '# 3. Preload model into memory (IMPORTANT - this fixes the timeout!)'
Write-Host 'curl -X POST http://localhost:11434/api/generate \'
Write-Host '  -H "Content-Type: application/json" \'
Write-Host '  -d "{\"model\":\"qwen2.5:7b-instruct-q4_K_M\",\"prompt\":\"Hello\",\"stream\":false}" \'
Write-Host '  --max-time 120'
Write-Host ''
Write-Host '# 4. Test it'
Write-Host 'curl -sk -X POST https://learnwithai.tech/api/ai/ollama \'
Write-Host '  -H "Content-Type: application/json" \'
Write-Host '  -d "{\"question\":\"What are Promises?\"}" \'
Write-Host '  --max-time 60'
Write-Host ""
Write-Host "======================================================================"
Write-Host ""

# Try to connect and run automatically
Write-Host "Attempting to connect and run automatically..." -ForegroundColor Cyan
Write-Host ""

$commands = @'
systemctl restart ollama
sleep 3
echo "Preloading model..."
curl -s -X POST http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '{"model":"qwen2.5:7b-instruct-q4_K_M","prompt":"Hello","stream":false}' --max-time 120
echo ""
echo "Testing API..."
curl -sk -X POST https://learnwithai.tech/api/ai/ollama -H 'Content-Type: application/json' -d '{"question":"Test"}' --max-time 60
'@

try {
    ssh root@76.13.244.113 $commands
    Write-Host ""
    Write-Host "✅ Ollama service fixed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Please run the commands above manually in your SSH session" -ForegroundColor Yellow
}
