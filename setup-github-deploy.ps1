#!/usr/bin/env pwsh
# Setup Script for GitHub Actions Auto-Deployment

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  GitHub Actions Deployment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH key exists on VPS
Write-Host "[Step 1] Checking VPS SSH Configuration..." -ForegroundColor Yellow
Write-Host ""
Write-Host "We need to get the SSH private key from your VPS to configure GitHub Actions." -ForegroundColor Gray
Write-Host ""

$VPS_HOST = "76.13.244.113"
$VPS_USER = "root"
$SSH_KEY_PATH = "~/.ssh/github_deploy"

Write-Host "VPS Details:" -ForegroundColor Cyan
Write-Host "  Host: $VPS_HOST" -ForegroundColor White
Write-Host "  User: $VPS_USER" -ForegroundColor White
Write-Host ""

Write-Host "[Step 2] Retrieving SSH Private Key from VPS..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please enter your VPS password when prompted." -ForegroundColor Gray
Write-Host ""

# Get the private key
$privateKey = ssh ${VPS_USER}@${VPS_HOST} "cat ~/.ssh/github_deploy 2>/dev/null || echo 'KEY_NOT_FOUND'"

if ($privateKey -eq 'KEY_NOT_FOUND' -or [string]::IsNullOrEmpty($privateKey)) {
    Write-Host ""
    Write-Host "SSH key not found on VPS. Let's create one!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating SSH key on VPS..." -ForegroundColor Yellow
    
    ssh ${VPS_USER}@${VPS_HOST} @"
        if [ ! -f ~/.ssh/github_deploy ]; then
            ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/github_deploy -N ''
            echo 'SSH key created successfully!'
            cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
            chmod 600 ~/.ssh/authorized_keys
            echo 'Public key added to authorized_keys'
        fi
        echo '--- Private Key ---'
        cat ~/.ssh/github_deploy
        echo '--- End of Private Key ---'
"@ | Out-Host
    
    Write-Host ""
    Write-Host "Retrieving the newly created key..." -ForegroundColor Yellow
    $privateKey = ssh ${VPS_USER}@${VPS_HOST} "cat ~/.ssh/github_deploy"
}

Write-Host ""
Write-Host "[Step 3] GitHub Secrets Configuration" -ForegroundColor Yellow
Write-Host ""

# Save to clipboard if possible
try {
    $privateKey | Set-Clipboard
    Write-Host "\u2713 SSH Private Key copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host "Could not copy to clipboard. Will display the key below." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  NEXT STEPS - Add to GitHub Secrets" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Go to your GitHub repository:" -ForegroundColor Cyan
Write-Host "   https://github.com/YOUR-USERNAME/YOUR-REPO/settings/secrets/actions" -ForegroundColor White
Write-Host ""
Write-Host "2. Click 'New repository secret'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Add this secret:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Name: " -NoNewline -ForegroundColor White
Write-Host "VPS_SSH_PRIVATE_KEY" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Value: (The SSH private key below)" -ForegroundColor White
Write-Host ""

if (![string]::IsNullOrEmpty($privateKey)) {
    Write-Host "=========================================" -ForegroundColor Magenta
    Write-Host "SSH PRIVATE KEY (copy this to GitHub):" -ForegroundColor Magenta
    Write-Host "=========================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host $privateKey -ForegroundColor Gray
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Magenta
    Write-Host ""
}

Write-Host "4. After adding the secret, commit any change and push:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m 'Test auto-deployment'" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "5. Check the 'Actions' tab in GitHub to see the deployment progress!" -ForegroundColor Cyan
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "\u2713 Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Once configured, every push to main branch will automatically:" -ForegroundColor Yellow
Write-Host "  \u2713 Build your Angular app" -ForegroundColor Gray
Write-Host "  \u2713 Deploy to http://76.13.244.113" -ForegroundColor Gray
Write-Host "  \u2713 Reload nginx automatically" -ForegroundColor Gray
Write-Host ""
