# Quick Ollama Status Check on Server
# Tests if Ollama is running and responding

$SERVER = "76.13.244.113"

Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "CHECKING OLLAMA SERVICE ON SERVER" -ForegroundColor Yellow
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Ollama service status
Write-Host "1. Checking Ollama systemd service..." -ForegroundColor Cyan
ssh root@$SERVER "systemctl status ollama --no-pager ; head -10"
Write-Host ""

# Test 2: Check if Ollama is listening on port 11434
Write-Host "2. Checking if port 11434 is listening..." -ForegroundColor Cyan
ssh root@$SERVER "ss -tlnp ; grep 11434"
Write-Host ""

# Test 3: Test Ollama API directly
Write-Host "3. Testing Ollama API - list models..." -ForegroundColor Cyan
ssh root@$SERVER "curl -s http://localhost:11434/api/tags"
Write-Host ""

# Test 4: Try a simple generation
Write-Host "4. Testing Ollama generation with short prompt..." -ForegroundColor Cyan
ssh root@$SERVER 'curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "{\"model\":\"qwen2.5:7b-instruct-q4_K_M\",\"prompt\":\"Say hello\",\"stream\":false}" --max-time 10'
Write-Host ""

# Test 5: Check backend logs for errors
Write-Host "5. Checking recent backend logs..." -ForegroundColor Cyan
ssh root@$SERVER "journalctl -u ailearn-api -n 30 --no-pager"
Write-Host ""

Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "DIAGNOSIS COMPLETE" -ForegroundColor Green
Write-Host ("="*70) -ForegroundColor Cyan
