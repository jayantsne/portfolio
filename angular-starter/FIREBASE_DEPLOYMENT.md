# Firebase Deployment Guide

This guide explains how to deploy both your Angular frontend and Express backend to Firebase.

## Architecture

- **Frontend**: Angular app hosted on Firebase Hosting
- **Backend**: Express API running on Firebase Cloud Functions
- **Database**: MongoDB Atlas (cloud-hosted)

## Prerequisites

1. Node.js (v18 or later)
2. Firebase CLI installed globally: `npm install -g firebase-tools`
3. Firebase account with a project created

## Setup Steps

### 1. Login to Firebase

```powershell
firebase login
```

### 2. Initialize Firebase (if not already done)

```powershell
cd D:\folio\jayant-angular-ui\angular-starter
firebase use --add
```

Select your Firebase project when prompted.

### 3. Install Functions Dependencies

```powershell
cd functions
npm install
cd ..
```

### 4. Build Your Angular App

```powershell
npm run build
```

This creates the production build in `dist/angular-starter/` directory.

### 5. Test Locally (Optional)

Test your functions and hosting locally before deploying:

```powershell
firebase emulators:start
```

This will start:
- Hosting emulator on http://localhost:5000
- Functions emulator on http://localhost:5001

### 6. Deploy to Firebase

Deploy both hosting and functions:

```powershell
firebase deploy
```

Or deploy them separately:

```powershell
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

## Environment Configuration

### Development (Local)
- Frontend: http://localhost:4200
- Backend: http://localhost:3000/api
- MongoDB: MongoDB Atlas

### Production (Firebase)
- Frontend: https://your-project.web.app
- Backend: https://us-central1-your-project.cloudfunctions.net/api
- MongoDB: MongoDB Atlas

The app automatically uses the correct API URL based on the environment:
- **Development**: Uses `http://localhost:3000/api` (defined in `environment.ts`)
- **Production**: Uses `/api` which Firebase rewrites to Cloud Functions (defined in `environment.prod.ts`)

## Firebase Configuration Files

### firebase.json
Configures both hosting and functions:
- Routes `/api/**` requests to Cloud Functions
- Serves Angular app from `dist/angular-starter/`

### functions/index.js
Express backend exported as `api` Cloud Function

### functions/package.json
Dependencies for Cloud Functions

## API Endpoints

All API endpoints are available at `/api/*`:

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register
- POST `/api/auth/logout` - Logout
- GET `/api/auth/:userId` - Check auth status

### Questions
- GET `/api/questions` - Get all questions
- POST `/api/questions` - Add question
- PUT `/api/questions/:id` - Update question
- DELETE `/api/questions/:id` - Delete question
- POST `/api/questions/import` - Import questions

### User Progress
- GET `/api/user-progress/:userId` - Get progress
- PUT `/api/user-progress/:userId` - Update progress

### AI Q&A
- GET `/api/ai-qa/:userId` - Get AI Q&As
- POST `/api/ai-qa` - Add AI Q&A
- PUT `/api/ai-qa/:id` - Update AI Q&A
- DELETE `/api/ai-qa/:id` - Delete AI Q&A

### Health Check
- GET `/api/health` - Check API status

## Troubleshooting

### Build Errors
If build fails, check:
- All dependencies are installed: `npm install`
- Node version is compatible: `node --version`

### Function Deployment Errors
If functions fail to deploy:
- Check `functions/package.json` has correct Node version (18)
- Install dependencies in functions folder: `cd functions && npm install`
- Check Firebase billing is enabled (Cloud Functions require Blaze plan)

### API Connection Errors
If frontend can't connect to backend:
- Check firebase.json has correct rewrite rules
- Verify functions are deployed: `firebase functions:list`
- Check browser console for CORS errors

### MongoDB Connection
If database connection fails:
- Verify MongoDB Atlas connection string in `functions/index.js`
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for Firebase Functions)
- Verify database user credentials

## Viewing Logs

```powershell
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only api
```

## Updating Deployment

When you make changes:

```powershell
# 1. Build Angular app
npm run build

# 2. Deploy everything
firebase deploy

# Or deploy separately
firebase deploy --only hosting  # For frontend changes
firebase deploy --only functions # For backend changes
```

## Cost Considerations

Firebase pricing:
- **Hosting**: Free tier includes 10GB storage and 360MB/day transfer
- **Functions**: Free tier includes 2M invocations/month
- **MongoDB Atlas**: Free tier (M0) includes 512MB storage

For production, consider upgrading to Firebase Blaze plan for better limits.

## Security Notes

1. **MongoDB Connection String**: Currently hardcoded in `functions/index.js`. For better security, use Firebase environment config:
   ```powershell
   firebase functions:config:set mongodb.uri="your-connection-string"
   ```
   Then access it in code: `functions.config().mongodb.uri`

2. **CORS**: Currently allows all origins. For production, update CORS settings in `functions/index.js`

3. **Authentication**: Consider implementing JWT tokens for better security

## Quick Reference Commands

```powershell
# Login to Firebase
firebase login

# Select project
firebase use my-portfolio-prod

# Build Angular
npm run build

# Deploy all
firebase deploy

# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only
firebase deploy --only functions

# View logs
firebase functions:log

# Test locally
firebase emulators:start
```

## Support

For issues:
1. Check Firebase Console: https://console.firebase.google.com
2. View function logs: `firebase functions:log`
3. Check browser console for frontend errors
4. Verify MongoDB Atlas connection
