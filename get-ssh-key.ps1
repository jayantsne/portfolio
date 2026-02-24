Import-Module Posh-SSH

$VPS_HOST = "76.13.244.113"
$VPS_USER = "root"
$PASSWORD = ConvertTo-SecureString "1ZC7Lts7,saeb)Y0H4@n" -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $PASSWORD)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Getting SSH Key for GitHub Actions" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    Write-Host "Connecting to VPS..." -ForegroundColor Yellow
    $session = New-SSHSession -ComputerName $VPS_HOST -Credential $Credential -AcceptKey
    
    Write-Host "Checking for SSH key..." -ForegroundColor Yellow
    $keyCheck = Invoke-SSHCommand -SessionId $session.SessionId -Command "test -f ~/.ssh/github_deploy && echo 'EXISTS' || echo 'MISSING'"
    
    if ($keyCheck.Output -match "MISSING") {
        Write-Host "Creating new SSH key..." -ForegroundColor Yellow
        Invoke-SSHCommand -SessionId $session.SessionId -Command @"
ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github_deploy -N ''
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"@ | Out-Null
        Write-Host "✓ SSH key created" -ForegroundColor Green
    } else {
        Write-Host "✓ SSH key found" -ForegroundColor Green
    }
    
    Write-Host "`nRetrieving private key..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat ~/.ssh/github_deploy"
    $privateKey = $result.Output
    
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
    
    # Copy to clipboard
    try {
        $privateKey | Set-Clipboard
        Write-Host "✓ Copied to clipboard!" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not copy to clipboard" -ForegroundColor Yellow
    }
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  SSH PRIVATE KEY" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host $privateKey -ForegroundColor Gray
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  NEXT STEPS" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "1. Copy the key above (it's also in your clipboard)" -ForegroundColor White
    Write-Host "`n2. Go to GitHub:" -ForegroundColor White
    Write-Host "   https://github.com/jayantbhardwaj199/MyPortfolio/settings/secrets/actions" -ForegroundColor Cyan
    Write-Host "`n3. Click: " -NoNewline -ForegroundColor White
    Write-Host "'New repository secret'" -ForegroundColor Yellow
    Write-Host "`n4. Enter:" -ForegroundColor White
    Write-Host "   Name:  " -NoNewline
    Write-Host "VPS_SSH_PRIVATE_KEY" -ForegroundColor Yellow
    Write-Host "   Value: " -NoNewline
    Write-Host "(paste the key above)" -ForegroundColor Yellow
    Write-Host "`n5. Click: " -NoNewline -ForegroundColor White
    Write-Host "'Add secret'" -ForegroundColor Yellow
    Write-Host "`n6. Then commit and push:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'Enable auto-deploy'" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host "`n✓ Done! Every push will now auto-deploy!`n" -ForegroundColor Green
    
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "- Check VPS is accessible: ping 76.13.244.113" -ForegroundColor Gray
    Write-Host "- Try SSH manually: ssh root@76.13.244.113" -ForegroundColor Gray
}
