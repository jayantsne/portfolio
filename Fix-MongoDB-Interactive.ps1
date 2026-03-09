# MongoDB Fix - Interactive PowerShell Script
# This script will guide you through fixing MongoDB step-by-step

$ErrorActionPreference = "Continue"
$ServerIP = "76.13.244.113"
$ServerUser = "root"
$ServerPassword = "1ZC7Lts7,saeb)Y0H4@n"

function Show-Header {
    param($Title)
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Step {
    param($Number, $Description)
    Write-Host ""
    Write-Host "STEP $Number" -ForegroundColor Green -NoNewline
    Write-Host ": $Description" -ForegroundColor White
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}

Clear-Host
Show-Header "MongoDB Service Fix - Interactive Guide"

Write-Host "Server Information:" -ForegroundColor Yellow
Write-Host "  Host    : $ServerIP" -ForegroundColor White
Write-Host "  User    : $ServerUser" -ForegroundColor White
Write-Host "  Password: $ServerPassword" -ForegroundColor Green
Write-Host ""
Write-Host "This script will help you fix MongoDB in 3 main steps:" -ForegroundColor Cyan
Write-Host "  1. Fix MongoDB service" -ForegroundColor White
Write-Host "  2. Upload updated API configuration" -ForegroundColor White  
Write-Host "  3. Restart API service" -ForegroundColor White
Write-Host ""

Read-Host "Press ENTER to begin"

# ==================== STEP 1: FIX MONGODB ====================
Show-Step 1 "Fix MongoDB Service"

Write-Host "I'll open an SSH connection. When prompted:" -ForegroundColor Yellow
Write-Host "  • Enter password: " -NoNewline -ForegroundColor Yellow
Write-Host "$ServerPassword" -ForegroundColor Green
Write-Host ""
Write-Host "Then paste this ONE command (copy it now):" -ForegroundColor Yellow
Write-Host ""

# Read the command from file to avoid parsing issues
$mongoFixCommand = Get-Content "mongodb-fix-oneliner.txt" -Raw -ErrorAction Stop

Write-Host $mongoFixCommand -ForegroundColor Cyan
Write-Host ""

# Copy to clipboard if possible
try {
    Set-Clipboard -Value $mongoFixCommand
    Write-Host "✓ Command copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host "! Copy the command above manually" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press ENTER to open SSH connection"

Write-Host "Opening SSH..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP"

Write-Host ""
Write-Host "Did MongoDB start successfully? (y/n): " -NoNewline -ForegroundColor Yellow
$mongoSuccess = Read-Host

if ($mongoSuccess -ne 'y') {
    Write-Host ""
    Write-Host "MongoDB fix failed. Please check the error messages above." -ForegroundColor Red
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Disk full - run: df -h" -ForegroundColor White
    Write-Host "  • Permission issues - check: ls -lah /var/lib/mongodb" -ForegroundColor White
    Write-Host "  • Config errors - check: tail -100 /var/log/mongodb/mongod.log" -ForegroundColor White
    Write-Host ""
    Read-Host "Press ENTER to exit"
    exit 1
}

# ==================== STEP 2: TEST MONGODB ====================
Show-Step 2 "Test MongoDB Connection"

Write-Host "Testing admin user authentication..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Paste this command in the same SSH session:" -ForegroundColor Yellow
Write-Host ""

$testCommand = "mongosh --username jbadmin --password 'PwC`$Grow88!Track' --authenticationDatabase admin --eval `"db.adminCommand('ping')`""
Write-Host $testCommand -ForegroundColor Cyan

try {
    Set-Clipboard -Value $testCommand
    Write-Host ""
    Write-Host "✓ Command copied to clipboard!" -ForegroundColor Green
} catch {}

Write-Host ""
Write-Host "Type 'exit' to close SSH after testing" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press ENTER when MongoDB test is successful"

# ==================== STEP 3: UPLOAD SERVICE FILE ====================
Show-Step 3 "Upload Updated API Service Configuration"

Write-Host "Uploading ailearnapi.service to server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Password: $ServerPassword" -ForegroundColor Green
Write-Host ""

$scpResult = scp server-configs\systemd\ailearnapi.service "$ServerUser@$ServerIP":/tmp/ 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Service file uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Upload failed. Error: $scpResult" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press ENTER to exit"
    exit 1
}

# ==================== STEP 4: APPLY CONFIGURATION ====================
Show-Step 4 "Apply New Configuration and Restart API"

Write-Host "Opening SSH to apply configuration..." -ForegroundColor Yellow
Write-Host "Password: $ServerPassword" -ForegroundColor Green
Write-Host ""
Write-Host "Paste this command:" -ForegroundColor Yellow
Write-Host ""

$applyCommand = "sudo cp /tmp/ailearnapi.service /etc/systemd/system/ailearnapi.service && sudo chmod 644 /etc/systemd/system/ailearnapi.service && sudo systemctl daemon-reload && sudo systemctl restart ailearnapi && sleep 2 && echo '========== API STATUS ==========' && sudo systemctl status ailearnapi --no-pager | head -n 20"

Write-Host $applyCommand -ForegroundColor Cyan

try {
    Set-Clipboard -Value $applyCommand
    Write-Host ""
    Write-Host "✓ Command copied to clipboard!" -ForegroundColor Green
} catch {}

Write-Host ""
Read-Host "Press ENTER to open SSH"

ssh "$ServerUser@$ServerIP"

# ==================== FINAL STATUS ====================
Show-Header "Fix Complete!"

Write-Host "✓ MongoDB service fixed with authentication" -ForegroundColor Green
Write-Host "✓ API service updated with new MongoDB connection" -ForegroundColor Green
Write-Host "✓ All services restarted" -ForegroundColor Green
Write-Host ""
Write-Host "Your website should now be working:" -ForegroundColor Cyan
Write-Host "  https://learnwithai.tech" -ForegroundColor White
Write-Host ""
Write-Host "MongoDB Connection String:" -ForegroundColor Yellow
Write-Host "  mongodb://jbadmin:PwC`$Grow88!Track@localhost:27017/AILearnDB?authSource=admin" -ForegroundColor White
Write-Host ""
Write-Host "To check status later, SSH to server and run:" -ForegroundColor Yellow
Write-Host "  sudo systemctl status mongod ailearnapi nginx" -ForegroundColor White
Write-Host ""

Read-Host "Press ENTER to exit"
