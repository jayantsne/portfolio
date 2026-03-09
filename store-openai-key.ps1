# ─────────────────────────────────────────────────────────────────────────────
# store-openai-key.ps1
# One-time script: stores the OpenAI API key in MongoDB via the backend API.
# The key is AES-256-GCM encrypted before storage; it is never returned to
# any client. Run this once, then delete this file.
# ─────────────────────────────────────────────────────────────────────────────

param(
    [string]$ApiBase   = "http://localhost:5000",    # change if your backend runs elsewhere
    [string]$AdminUser = "admin"
)

Write-Host "`n=== OpenAI Key Setup ===" -ForegroundColor Cyan

# 1. Prompt for sensitive values (never stored in this script)
$AdminPass = Read-Host "Admin password" -AsSecureString
$OpenAIKey = Read-Host "OpenAI API key (sk-proj-...)" -AsSecureString

$plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPass))
$plainKey  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($OpenAIKey))

# 2. Log in as admin to get JWT
Write-Host "`n[1/2] Logging in as '$AdminUser'..." -ForegroundColor Yellow
try {
    $loginBody = @{ username = $AdminUser; password = $plainPass } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Method Post `
        -Uri "$ApiBase/api/admin/login" `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    if (-not $loginResp.token) {
        Write-Host "Login failed: $($loginResp.message)" -ForegroundColor Red
        exit 1
    }
    $jwt = $loginResp.token
    Write-Host "Login successful." -ForegroundColor Green
}
catch {
    Write-Host "Could not reach backend at $ApiBase — is it running?" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
finally {
    $plainPass = $null
}

# 3. Store the key via the LLM provider upsert endpoint
Write-Host "[2/2] Storing OpenAI key in MongoDB..." -ForegroundColor Yellow
try {
    $body = @{
        providerName = "openai"
        displayName  = "OpenAI GPT"
        apiKey       = $plainKey
        model        = "gpt-4o-mini"
        baseUrl      = "https://api.openai.com/v1"
        enabled      = $true
    } | ConvertTo-Json

    $headers = @{ Authorization = "Bearer $jwt" }

    $resp = Invoke-RestMethod -Method Post `
        -Uri "$ApiBase/api/llm-providers/admin" `
        -Body $body `
        -Headers $headers `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "`n✅ Done! Provider stored/updated:" -ForegroundColor Green
    Write-Host "   Name   : $($resp.providerName)"
    Write-Host "   Model  : $($resp.model)"
    Write-Host "   Enabled: $($resp.enabled)"
    Write-Host "   (API key is encrypted in MongoDB — never returned to clients)"
}
catch {
    Write-Host "Failed to store key: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    $plainKey = $null
    $jwt      = $null
}

Write-Host "`nYou can now delete this script." -ForegroundColor DarkGray
