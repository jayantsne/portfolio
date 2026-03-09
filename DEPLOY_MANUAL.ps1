#!/usr/bin/env pwsh
# 🚀 Manual Backend Deployment Guide
# Use this if automated deployment requires password setup

Write-Host "=" * 70 -ForegroundColor Green
Write-Host "🚀 MANUAL OLLAMA BACKEND DEPLOYMENT" -ForegroundColor Green  
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""

Write-Host "📦 Build Status: ✅ COMPLETE" -ForegroundColor Cyan
Write-Host "   Location: d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish\"
Write-Host "   Files: 59 ready for deployment"
Write-Host ""

Write-Host "📋 Option 1: Deploy via WinSCP (Recommended)" -ForegroundColor Cyan
Write-Host "━" * 70
Write-Host ""
Write-Host "1. Download WinSCP: https://winscp.net/eng/download.php"
Write-Host "2. Connect to server:"
Write-Host "   Host: 76.13.244.113"
Write-Host "   User: root"
Write-Host "   Password: 1ZC7Lts7,saeb)Y0H4@n"
Write-Host ""
Write-Host "3. Navigate to: /var/www/ai-learn-api/"
Write-Host ""
Write-Host "4. Upload all files from:"
Write-Host "   d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish\"
Write-Host ""
Write-Host "5. After upload, run in WinSCP terminal:"
Write-Host "   cd /var/www/ai-learn-api"
Write-Host "   chmod +x AILearnAPI.Api"
Write-Host "   chown -R www-data:www-data ."
Write-Host "   systemctl restart ailearn-api"
Write-Host "   systemctl status ailearn-api"
Write-Host ""

Write-Host "📋 Option 2: Deploy via PuTTY + PSCP" -ForegroundColor Cyan  
Write-Host "━" * 70
Write-Host ""
Write-Host "1. Open PowerShell and run:"
Write-Host ""
Write-Host "   # Navigate to publish folder"
Write-Host '   cd "d:\folio\jayant-angular-ui\enterprise-dotnet-api\publish"'
Write-Host ""
Write-Host "   # Upload files (will prompt for password)"
Write-Host '   pscp -r * root@76.13.244.113:/var/www/ai-learn-api/'
Write-Host ""
Write-Host "2. Connect via PuTTY:"
Write-Host "   Host: 76.13.244.113"  
Write-Host "   Login: root"
Write-Host "   Password: 1ZC7Lts7,saeb)Y0H4@n"
Write-Host ""
Write-Host "3. Run these commands:"
Write-Host "   cd /var/www/ai-learn-api"
Write-Host "   chmod +x AILearnAPI.Api"
Write-Host "   chown -R www-data:www-data ."
Write-Host "   systemctl restart ailearn-api"
Write-Host "   systemctl status ailearn-api"
Write-Host ""

Write-Host "📋 Option 3: Setup SSH Keys (Future deployments)" -ForegroundColor Cyan
Write-Host "━" * 70
Write-Host ""
Write-Host "Run on your PC:"
Write-Host '   ssh-keygen -t rsa -b 4096'
Write-Host '   (Press Enter for all prompts)'
Write-Host ""
Write-Host "Copy key to server:"
Write-Host '   type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@76.13.244.113 "cat >> ~/.ssh/authorized_keys"'
Write-Host ""
Write-Host "After this, automated deployment will work!"
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Green
Write-Host "🧪 TESTING AFTER DEPLOYMENT" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "After deployment completes, run:"
Write-Host '   .\test-ollama-api.ps1'
Write-Host ""
Write-Host "Or test manually:"
Write-Host '   curl http://learnwithai.tech/api/ai/ollama/health'
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Yellow
Write-Host "💡 QUICK TEST WITHOUT DEPLOYMENT" -ForegroundColor Yellow  
Write-Host "=" * 70 -ForegroundColor Yellow
Write-Host ""
Write-Host "Your Angular app is already running!"
Write-Host ""
Write-Host "Open: http://localhost:4203" -ForegroundColor Cyan
Write-Host "      http://localhost:4202" -ForegroundColor Cyan
Write-Host "      http://localhost:4201" -ForegroundColor Cyan
Write-Host "      http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
Write-Host "Try searching for: 'Angular Observables'" -ForegroundColor Green
Write-Host ""
Write-Host "ℹ️ It will use free API providers (Groq, Gemini, etc.)" -ForegroundColor Gray
Write-Host "   Once backend is deployed, it will also use Ollama!" -ForegroundColor Gray
Write-Host ""
