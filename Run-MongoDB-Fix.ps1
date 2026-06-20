# MongoDB Fix - Simple Guide Script
# This will open the right files and connections for you

Clear-Host

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MongoDB Service Fix - Step by Step Guide" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: 76.13.244.113" -ForegroundColor White
Write-Host "User: root" -ForegroundColor White
Write-Host "Password: <DEPLOY_SSH_PASSWORD>" -ForegroundColor Green
Write-Host ""

# Step 1
Write-Host ""
Write-Host "STEP 1: Fix MongoDB" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "I'll copy the MongoDB fix command to your clipboard, then open SSH." -ForegroundColor White
Write-Host "Just paste it when you're connected!" -ForegroundColor White
Write-Host ""

$mongoCmd = Get-Content "mongodb-fix-oneliner.txt" -Raw
Set-Clipboard -Value $mongoCmd
Write-Host "[OK] MongoDB fix command copied to clipboard!" -ForegroundColor Green
Write-Host ""

Read-Host "Press ENTER to open SSH (then paste the command)"

# Open SSH for MongoDB fix
ssh root@76.13.244.113

Write-Host ""
Write-Host "Is MongoDB running? (check the output above)" -ForegroundColor Yellow
$result = Read-Host "Type 'yes' to continue or 'no' to exit"

if ($result -ne 'yes') {
    Write-Host "Exiting. Please fix MongoDB manually." -ForegroundColor Red
    exit 1
}

# Step 2
Write-Host ""
Write-Host "STEP 2: Upload API Configuration" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Uploading updated service file..." -ForegroundColor White

scp server-configs\systemd\ailearnapi.service root@76.13.244.113:/tmp/

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] File uploaded!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Upload failed!" -ForegroundColor Red
    exit 1
}

# Step 3
Write-Host ""
Write-Host "STEP 3: Apply Configuration" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$applyCmd = "sudo cp /tmp/ailearnapi.service /etc/systemd/system/ailearnapi.service; sudo chmod 644 /etc/systemd/system/ailearnapi.service; sudo systemctl daemon-reload; sudo systemctl restart ailearnapi; sleep 2; systemctl status ailearnapi --no-pager | head -n 20"

Set-Clipboard -Value $applyCmd
Write-Host "[OK] API restart command copied to clipboard!" -ForegroundColor Green
Write-Host ""

Read-Host "Press ENTER to open SSH (then paste the command)"

# Open SSH for API restart
ssh root@76.13.244.113

# Done
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  [OK] Complete!" -ForegroundColor Green  
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your website: https://learnwithai.tech" -ForegroundColor White
Write-Host ""
