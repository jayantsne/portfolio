# 🚀 Quick Deployment Reference

## One-Command Deployment
```powershell
npm run deploy
```

## Step-by-Step Deployment

### 1️⃣ First Time Only
```powershell
# Login to Firebase
firebase login

# Install functions dependencies
cd functions
npm install
cd ..
```

### 2️⃣ Every Time You Deploy
```powershell
# Build Angular
npm run build

# Deploy everything
firebase deploy
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Build + Deploy everything |
| `npm run deploy:hosting` | Deploy only frontend |
| `npm run deploy:functions` | Deploy only backend |
| `npm run firebase:local` | Test locally |
| `firebase functions:log` | View backend logs |
| `.\deploy.ps1` | Automated deployment script |

## Environment URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| **Local** | http://localhost:4200 | http://localhost:3000/api |
| **Production** | https://your-project.web.app | /api (auto-routed) |

## API Endpoints

All endpoints prefixed with `/api`:

- `POST /api/auth/login` - Login
- `GET /api/questions` - Get questions
- `GET /api/user-progress/:userId` - Get progress
- `GET /api/health` - Health check

## Troubleshooting

### ❌ Build Errors
```powershell
npm install
npm run build
```

### ❌ Deploy Errors
```powershell
# Check if logged in
firebase login

# Check project
firebase use myportfolioadmin

# Try again
firebase deploy
```

### ❌ Function Errors
```powershell
# View logs
firebase functions:log

# Redeploy functions
npm run deploy:functions
```

### ❌ API Not Working
1. Check firebase.json has rewrite rules
2. Verify functions deployed: `firebase functions:list`
3. Check browser console for errors

## Files Changed

✅ Created:
- `functions/index.js` - Backend code
- `functions/package.json` - Backend dependencies
- `FIREBASE_DEPLOYMENT.md` - Full guide
- `deploy.ps1` - Deployment script

✅ Updated:
- `firebase.json` - Added functions config
- `mongodb.service.ts` - Uses environment URLs
- `environment.ts` - Added local API URL
- `environment.prod.ts` - Added production API URL
- `package.json` - Added deploy scripts

## Need Help?

📖 Read: [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)
📋 Check: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
