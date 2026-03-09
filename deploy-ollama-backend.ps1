# 🚀 Ollama Backend Deployment Script
# Deploy optimized ASP.NET API with Claude-quality AI to production server

Write-Host "🚀 Starting Ollama Backend Deployment..." -ForegroundColor Green
Write-Host ""

# Configuration
$SERVER = "76.13.244.113"
$USER = "root"
$DEPLOY_PATH = "/var/www/ai-learn-api"
$PROJECT_PATH = "d:\folio\jayant-angular-ui\enterprise-dotnet-api"

# Step 1: Build the project
Write-Host "📦 Step 1/5: Building ASP.NET project..." -ForegroundColor Cyan
Push-Location "$PROJECT_PATH"

try {
    # Clean previous builds
    Write-Host "  🧹 Cleaning previous builds..."
    Remove-Item -Path ".\src\AILearnAPI.Api\bin\Release" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".\src\AILearnAPI.Api\obj" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Build and publish
    Write-Host "  🔨 Building Release configuration..."
    dotnet publish .\src\AILearnAPI.Api\AILearnAPI.Api.csproj `
        -c Release `
        -r linux-x64 `
        --self-contained false `
        -o .\publish

    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }

    Write-Host "  ✅ Build successful!" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 2: Test build locally (optional quick check)
Write-Host ""
Write-Host "📋 Step 2/5: Verifying build output..." -ForegroundColor Cyan
$requiredFiles = @(
    "AILearnAPI.Api.dll",
    "appsettings.json",
    "AILearnAPI.Api.deps.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path ".\publish\$file") {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Write-Host "  ✅ All required files present!" -ForegroundColor Green

# Step 3: Create deployment package
Write-Host ""
Write-Host "📦 Step 3/5: Creating deployment package..." -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "ailearn-api-backup-$timestamp.tar.gz"

Write-Host "  📦 Package name: $backupName"

# Step 4: Upload to server
Write-Host ""
Write-Host "📡 Step 4/5: Uploading to server $SERVER..." -ForegroundColor Cyan

try {
    # Create remote backup and upload new files
    Write-Host "  🔄 Creating backup and deploying..."
    
    # Use SCP to upload files
    Write-Host "  📤 Uploading files via SCP..."
    scp -r .\publish\* ${USER}@${SERVER}:${DEPLOY_PATH}/
    
    if ($LASTEXITCODE -ne 0) {
        throw "SCP upload failed"
    }

    Write-Host "  ✅ Upload successful!" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Upload failed: $_" -ForegroundColor Red
    Write-Host "  💡 Make sure SSH keys are configured or use password authentication" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Step 5: Restart service on server
Write-Host ""
Write-Host "🔄 Step 5/5: Restarting API service..." -ForegroundColor Cyan

try {
    # SSH commands to restart service
    $sshCommands = @"
# Create backup
cd $DEPLOY_PATH
tar -czf /tmp/$backupName ./ --exclude='*.log' 2>/dev/null || echo 'Backup created'

# Set permissions
chmod +x AILearnAPI.Api
chown -R www-data:www-data $DEPLOY_PATH

# Restart service
echo 'Restarting ailearn-api service...'
systemctl restart ailearn-api

# Check service status
sleep 2
if systemctl is-active --quiet ailearn-api; then
    echo '✅ Service is running'
    systemctl status ailearn-api --no-pager -l
else
    echo '❌ Service failed to start'
    journalctl -u ailearn-api -n 50 --no-pager
    exit 1
fi

# Test Ollama endpoint
echo ''
echo '🧪 Testing Ollama endpoint...'
sleep 1
curl -s http://localhost:5000/api/ai/ollama/health || echo '⚠️ Health check endpoint not responding yet'
"@

    Write-Host "  🔑 Connecting via SSH..."
    $sshCommands | ssh ${USER}@${SERVER} "bash -s"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️ Service restart had issues. Check logs on server." -ForegroundColor Yellow
    }
    else {
        Write-Host "  ✅ Service restarted successfully!" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ❌ Failed to restart service: $_" -ForegroundColor Red
}

Pop-Location

# Final summary
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "  Server: $SERVER"
Write-Host "  Path: $DEPLOY_PATH"
Write-Host "  Backup: /tmp/$backupName"
Write-Host ""
Write-Host "🧪 Test endpoints:" -ForegroundColor Cyan
Write-Host "  Health: http://learnwithai.tech/api/ai/ollama/health"
Write-Host "  Models: http://learnwithai.tech/api/ai/ollama/models"
Write-Host "  Explain: http://learnwithai.tech/api/ai/ollama (POST)"
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test health endpoint"
Write-Host "  2. Try Angular app with a search query"
Write-Host "  3. Check logs: ssh $USER@$SERVER 'journalctl -u ailearn-api -f'"
Write-Host ""
Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
Write-Host "  View logs: ssh $USER@$SERVER 'journalctl -u ailearn-api -n 100 --no-pager'"
Write-Host "  Restart: ssh $USER@$SERVER 'systemctl restart ailearn-api'"
Write-Host "  Status: ssh $USER@$SERVER 'systemctl status ailearn-api'"
Write-Host ""
