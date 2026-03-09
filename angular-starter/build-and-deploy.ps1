Write-Host "🏗️ Building Angular app for production..." -ForegroundColor Cyan

# Build for production
cd angular-starter
npm run build -- --configuration production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build complete!" -ForegroundColor Green

# Deploy to server
Write-Host "`n📤 Deploying to server..." -ForegroundColor Cyan

$password = "1ZC7Lts7,saeb)Y0H4@n"
$server = "76.13.244.113"

# SCP the dist folder to server
Write-Host "Uploading files to server..." -ForegroundColor Yellow
scp -r dist/angular-starter/* root@${server}:/var/www/learnwithai.tech/frontend/

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Website: https://learnwithai.tech/ai-learn/questions" -ForegroundColor Cyan
Write-Host "📊 API: https://learnwithai.tech/api/questions" -ForegroundColor Cyan
