#!/usr/bin/env pwsh
# 🧪 Ollama Backend API Test Script
# Test all endpoints and verify Claude-quality responses

Write-Host "🧪 Testing Ollama Backend API" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""

$API_BASE = "http://learnwithai.tech/api"
$LOCAL_API = "http://localhost:5000/api"

# Choose which API to test
Write-Host "Select API to test:" -ForegroundColor Cyan
Write-Host "  1. Production (learnwithai.tech)"
Write-Host "  2. Local (localhost:5000)"
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "2") {
    $API_BASE = $LOCAL_API
    Write-Host "Testing LOCAL API: $API_BASE" -ForegroundColor Yellow
}
else {
    Write-Host "Testing PRODUCTION API: $API_BASE" -ForegroundColor Yellow
}
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1/4: Health Check" -ForegroundColor Cyan
Write-Host "  Endpoint: GET $API_BASE/ai/ollama/health"
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/ai/ollama/health" -Method Get -TimeoutSec 10
    if ($response.healthy) {
        Write-Host "  ✅ PASS - Ollama is healthy" -ForegroundColor Green
        Write-Host "     Message: $($response.message)" -ForegroundColor Gray
    }
    else {
        Write-Host "  ⚠️ WARNING - Ollama not healthy" -ForegroundColor Yellow
        Write-Host "     Message: $($response.message)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ❌ FAIL - Health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Available Models
Write-Host "Test 2/4: Get Available Models" -ForegroundColor Cyan
Write-Host "  Endpoint: GET $API_BASE/ai/ollama/models"
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/ai/ollama/models" -Method Get -TimeoutSec 10
    if ($response.success -and $response.count -gt 0) {
        Write-Host "  ✅ PASS - Found $($response.count) model(s)" -ForegroundColor Green
        Write-Host "     Available models:" -ForegroundColor Gray
        foreach ($model in $response.models) {
            Write-Host "       • $model" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "  ⚠️ WARNING - No models found" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  ❌ FAIL - Models endpoint failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Simple Explanation
Write-Host "Test 3/4: Simple Explanation (Quick Test)" -ForegroundColor Cyan
Write-Host "  Endpoint: POST $API_BASE/ai/ollama"
Write-Host "  Question: 'What is a Promise in JavaScript?'"  -ForegroundColor Gray
try {
    $body = @{
        question = "What is a Promise in JavaScript?"
        model = "qwen2.5:7b-instruct-q4_K_M"
        temperature = 0.7
        maxTokens = 500
    } | ConvertTo-Json

    Write-Host "  ⏳ Generating (may take 10-30 seconds)..." -ForegroundColor Yellow
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    $response = Invoke-RestMethod -Uri "$API_BASE/ai/ollama" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 60

    $stopwatch.Stop()
    $elapsed = $stopwatch.ElapsedMilliseconds

    if ($response.success) {
        Write-Host "  ✅ PASS - Explanation generated in $elapsed ms" -ForegroundColor Green
        Write-Host "     Provider: $($response.provider)" -ForegroundColor Gray
        Write-Host "     Model: $($response.model)" -ForegroundColor Gray
        Write-Host "     Tokens: $($response.tokensUsed)" -ForegroundColor Gray
        Write-Host "     Response length: $($response.explanation.Length) chars" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  📝 First 200 characters:" -ForegroundColor Cyan
        $preview = $response.explanation.Substring(0, [Math]::Min(200, $response.explanation.Length))
        Write-Host "     $preview..." -ForegroundColor Gray
    }
    else {
        Write-Host "  ❌ FAIL - Response success=false" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ FAIL - Explanation failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Full Claude-Quality Explanation
Write-Host "Test 4/4: Full Claude-Quality Explanation" -ForegroundColor Cyan
Write-Host "  Endpoint: POST $API_BASE/ai/ollama"
Write-Host "  Question: 'Explain Angular Observables'"  -ForegroundColor Gray
try {
    $body = @{
        question = "Explain Angular Observables"
        model = "qwen2.5:7b-instruct-q4_K_M"
        temperature = 0.7
        maxTokens = 2048
    } | ConvertTo-Json

    Write-Host "  ⏳ Generating full explanation (may take 30-60 seconds)..." -ForegroundColor Yellow
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    $response = Invoke-RestMethod -Uri "$API_BASE/ai/ollama" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 120

    $stopwatch.Stop()
    $elapsed = $stopwatch.ElapsedMilliseconds

    if ($response.success) {
        Write-Host "  ✅ PASS - Full explanation generated in $elapsed ms" -ForegroundColor Green
        Write-Host "     Provider: $($response.provider)" -ForegroundColor Gray
        Write-Host "     Model: $($response.model)" -ForegroundColor Gray
        Write-Host "     Tokens: $($response.tokensUsed)" -ForegroundColor Gray
        Write-Host "     Response length: $($response.explanation.Length) chars" -ForegroundColor Gray
        Write-Host "     Time per token: $([Math]::Round($elapsed / $response.tokensUsed, 2)) ms" -ForegroundColor Gray
        Write-Host ""
        
        # Quality checks
        Write-Host "  🔍 Quality Checks:" -ForegroundColor Cyan
        $hasCodeBlocks = $response.explanation -match '```'
        $hasSections = $response.explanation -match '##'
        $hasEmojis = $response.explanation -match '[\u{1F300}-\u{1F6FF}]'
        $hasExamples = $response.explanation -match 'Example|example'
        $length = $response.explanation.Length
        
        if ($hasCodeBlocks) { Write-Host "     ✅ Contains code examples" -ForegroundColor Green }
        else { Write-Host "     ⚠️ No code blocks found" -ForegroundColor Yellow }
        
        if ($hasSections) { Write-Host "     ✅ Has structured sections" -ForegroundColor Green }
        else { Write-Host "     ⚠️ No section headers found" -ForegroundColor Yellow }
        
        if ($hasExamples) { Write-Host "     ✅ Contains examples" -ForegroundColor Green }
        else { Write-Host "     ⚠️ No examples mentioned" -ForegroundColor Yellow }
        
        if ($length -gt 1000) { Write-Host "     ✅ Comprehensive length ($length chars)" -ForegroundColor Green }
        elseif ($length -gt 500) { Write-Host "     ⚠️ Decent length ($length chars)" -ForegroundColor Yellow }
        else { Write-Host "     ❌ Too short ($length chars)" -ForegroundColor Red }
        
        Write-Host ""
        Write-Host "  📝 Full Response Preview:" -ForegroundColor Cyan
        Write-Host "  " + ("-" * 58)
        $lines = $response.explanation -split "`n" | Select-Object -First 20
        foreach ($line in $lines) {
            Write-Host "     $line" -ForegroundColor Gray
        }
        if ($response.explanation.Length -gt 1000) {
            Write-Host "     ..." -ForegroundColor Gray
            Write-Host "     (Response truncated - see full output in Angular app)" -ForegroundColor DarkGray
        }
        Write-Host "  " + ("-" * 58)
    }
    else {
        Write-Host "  ❌ FAIL - Response success=false" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ FAIL - Full explanation failed: $_" -ForegroundColor Red
    Write-Host "     Error details: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=" * 60
Write-Host "🏁 Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. If all tests passed, test in Angular app"
Write-Host "  2. Open http://localhost:4203 (if Angular is running)"
Write-Host "  3. Search for 'Angular Observables' or 'JavaScript Promises'"
Write-Host "  4. Verify Claude-style explanation appears"
Write-Host ""
Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
Write-Host "  If tests failed:"
Write-Host "   • Check Ollama is running: systemctl status ollama"
Write-Host "   • Check API logs: journalctl -u ailearn-api -n 50"
Write-Host "   • Verify port 11434 is accessible: curl http://localhost:11434/api/tags"
Write-Host "   • Check firewall: ufw status"
Write-Host ""
