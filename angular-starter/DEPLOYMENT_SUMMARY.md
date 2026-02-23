# Firebase Deployment Setup - Summary

## What Was Done

### 1. Created Firebase Functions Backend
- **Location**: `functions/` folder
- **Files Created**:
  - `functions/package.json` - Dependencies for Cloud Functions
  - `functions/index.js` - Express backend exported as Firebase Function
  - `functions/.gitignore` - Ignore node_modules and logs

### 2. Updated Firebase Configuration
- **File**: `firebase.json`
- **Changes**:
  - Added functions configuration
  - Added rewrite rule to route `/api/**` to Cloud Functions
  - Kept hosting configuration for Angular app

### 3. Updated Environment Files
- **Files Modified**:
  - `src/environments/environment.ts` - Added `apiUrl: 'http://localhost:3000/api'` for local development
  - `src/environments/environment.prod.ts` - Added `apiUrl: '/api'` for production (uses Firebase Functions)

### 4. Updated MongoDB Service
- **File**: `src/app/shared/mongodb.service.ts`
- **Changes**:
  - Now uses `environment.apiUrl` instead of hardcoded URL
  - Automatically switches between local and production API

### 5. Added Deployment Scripts
- **File**: `package.json`
- **New Scripts**:
  - `npm run deploy` - Build and deploy everything
  - `npm run deploy:hosting` - Deploy only frontend
  - `npm run deploy:functions` - Deploy only backend
  - `npm run firebase:local` - Test locally with emulators

### 6. Created Documentation
- **Files**:
  - `FIREBASE_DEPLOYMENT.md` - Complete deployment guide
  - `deploy.ps1` - PowerShell deployment script

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Hosting                         │
│                  (Angular Frontend)                          │
│              https://your-project.web.app                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ /api/** requests
                     │ (Firebase Rewrite)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Firebase Cloud Functions                      │
│                  (Express Backend)                           │
│  https://region-project.cloudfunctions.net/api              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ MongoDB Connection
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB Atlas                              │
│              (Cloud Database)                                │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Development Mode (Local)
1. **Frontend**: Runs on `http://localhost:4200` (Angular CLI)
2. **Backend**: Runs on `http://localhost:3000` (Node.js/Express)
3. **API Calls**: Frontend makes requests to `http://localhost:3000/api`

### Production Mode (Firebase)
1. **Frontend**: Hosted on Firebase Hosting
2. **Backend**: Runs as Firebase Cloud Function
3. **API Calls**: Frontend makes requests to `/api` (relative URL)
4. **Firebase**: Automatically routes `/api/**` to Cloud Function

## Deployment Steps

### First Time Setup
```powershell
# 1. Login to Firebase
firebase login

# 2. Select your project
firebase use --add
# (Select: myportfolioadmin)

# 3. Install functions dependencies
cd functions
npm install
cd ..
```

### Every Deployment
```powershell
# Option 1: Use the deploy script
.\deploy.ps1

# Option 2: Use npm scripts
npm run deploy

# Option 3: Manual commands
npm run build
firebase deploy
```

### Deploy Only Frontend
```powershell
npm run deploy:hosting
```

### Deploy Only Backend
```powershell
npm run deploy:functions
```

## Testing Locally Before Deploy

```powershell
# Start Firebase emulators
npm run firebase:local

# This will start:
# - Hosting: http://localhost:5000
# - Functions: http://localhost:5001
```

## Important Notes

### 1. MongoDB Atlas Configuration
- Ensure MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
- Firebase Functions use dynamic IPs, so you can't whitelist specific IPs
- Connection string is in `functions/index.js` (line 16)

### 2. Firebase Billing
- Cloud Functions require Firebase **Blaze (Pay as you go)** plan
- Free tier includes:
  - 2M function invocations/month
  - 400K GB-seconds/month
  - 200K CPU-seconds/month
- Hosting is free for up to 10GB storage and 360MB/day transfer

### 3. CORS Configuration
- Currently allows all origins for development
- For production, update CORS in `functions/index.js`:
  ```javascript
  app.use(cors({ 
    origin: 'https://your-project.web.app',
    credentials: true 
  }));
  ```

### 4. Environment Variables
- Currently MongoDB URI is hardcoded
- For better security, use Firebase config:
  ```powershell
  firebase functions:config:set mongodb.uri="your-uri"
  ```

## Files Structure

```
angular-starter/
├── src/
│   ├── app/
│   │   └── shared/
│   │       └── mongodb.service.ts        [UPDATED]
│   └── environments/
│       ├── environment.ts                [UPDATED]
│       └── environment.prod.ts           [UPDATED]
├── functions/                            [NEW]
│   ├── index.js                          [NEW]
│   ├── package.json                      [NEW]
│   ├── .gitignore                        [NEW]
│   └── node_modules/                     [CREATED]
├── firebase.json                         [UPDATED]
├── .firebaserc                           [EXISTING]
├── package.json                          [UPDATED]
├── deploy.ps1                            [NEW]
└── FIREBASE_DEPLOYMENT.md                [NEW]
```

## Next Steps

1. **Deploy to Firebase**:
   ```powershell
   .\deploy.ps1
   ```

2. **Verify Deployment**:
   - Visit your Firebase Hosting URL
   - Test login with admin/admin123
   - Check browser console for any errors

3. **Monitor**:
   ```powershell
   firebase functions:log
   ```

4. **View in Firebase Console**:
   - Go to https://console.firebase.google.com
   - Select your project (myportfolioadmin)
   - Check Functions and Hosting sections

## Troubleshooting

### "Firebase requires Blaze plan"
- Upgrade to Blaze plan in Firebase Console
- Don't worry, you won't be charged unless you exceed free tier

### "MongoDB connection failed"
- Check MongoDB Atlas IP whitelist
- Verify connection string in `functions/index.js`

### "Function not found"
- Ensure functions are deployed: `firebase deploy --only functions`
- Check firebase.json has correct rewrite rules

### "Build failed"
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors: `npm run lint`

## Cost Estimate (Monthly)

Based on typical usage for a portfolio site:

**Firebase**:
- Hosting: $0 (within free tier)
- Functions: $0-5 (depends on traffic)

**MongoDB Atlas**:
- M0 Free Tier: $0

**Total**: $0-5/month for moderate traffic

## Support

For issues:
1. Check [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md) for detailed guide
2. View Firebase Console logs
3. Check browser console for frontend errors
4. Review function logs: `firebase functions:log`
