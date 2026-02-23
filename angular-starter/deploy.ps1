# Firebase Deployment Script
# Run this script to deploy both frontend and backend to Firebase

Write-Host "🚀 Starting Firebase Deployment..." -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "✓ Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor White
    exit 1
}
Write-Host "✓ Firebase CLI installed: $firebaseVersion" -ForegroundColor Green
Write-Host ""

# Build Angular app
Write-Host "📦 Building Angular application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed successfully" -ForegroundColor Green
Write-Host ""

# Deploy to Firebase
Write-Host "🌐 Deploying to Firebase..." -ForegroundColor Yellow
firebase deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is now live at:" -ForegroundColor Cyan
Write-Host "https://your-project.web.app" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "firebase functions:log" -ForegroundColor White
