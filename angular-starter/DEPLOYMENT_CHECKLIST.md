# ✅ Firebase Deployment Checklist

## Pre-Deployment Checklist

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Project selected (`firebase use myportfolioadmin`)
- [ ] Functions dependencies installed (`cd functions && npm install`)
- [ ] MongoDB Atlas IP whitelist set to 0.0.0.0/0
- [ ] Firebase project upgraded to Blaze plan (required for Cloud Functions)

## Deployment Checklist

- [ ] All code changes committed to git
- [ ] Angular app builds successfully (`npm run build`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Local testing completed
- [ ] Environment variables configured

## Deploy Now

```powershell
# Quick deploy
npm run deploy

# Or step by step
npm run build
firebase deploy
```

## Post-Deployment Checklist

- [ ] Visit Firebase Hosting URL (https://your-project.web.app)
- [ ] Test login page (/login)
- [ ] Try logging in with admin/admin123
- [ ] Check questions page (/questions)
- [ ] Verify API calls work (check browser console)
- [ ] Test CRUD operations (add/edit/delete questions)
- [ ] Check Firebase Console for function logs
- [ ] Verify MongoDB connection (check function logs)

## Verification Commands

```powershell
# Check if functions are deployed
firebase functions:list

# View function logs
firebase functions:log

# Check hosting
firebase hosting:sites:list
```

## What to Check in Browser

1. **Open DevTools (F12)**
2. **Console Tab**: Should show:
   - No errors
   - Successful API calls
   - Authentication logs

3. **Network Tab**: Check:
   - API requests to `/api/*` return 200 status
   - No CORS errors
   - Response data is correct

## Common Issues & Solutions

### Issue: "Billing account not configured"
**Solution**: Upgrade to Blaze plan in Firebase Console

### Issue: "MongoDB connection timeout"
**Solution**: 
- Check MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Verify connection string in functions/index.js

### Issue: "Function not found"
**Solution**:
- Deploy functions: `firebase deploy --only functions`
- Check firebase.json rewrite rules

### Issue: "CORS error"
**Solution**:
- Functions automatically set CORS to allow all origins
- Check browser console for specific CORS error

### Issue: "Build failed"
**Solution**:
- Delete node_modules: `Remove-Item -Recurse -Force node_modules`
- Reinstall: `npm install`
- Try building again: `npm run build`

## Rollback Plan

If deployment fails or causes issues:

```powershell
# Rollback to previous hosting version
firebase hosting:rollback

# Redeploy previous functions version
# (Note: Keep backups of working code)
```

## Monitoring

### View Logs
```powershell
# Real-time logs
firebase functions:log --follow

# Last 50 lines
firebase functions:log --limit 50
```

### Firebase Console
- Go to: https://console.firebase.google.com
- Select: myportfolioadmin project
- Check:
  - Functions > api function
  - Hosting > Deployment history
  - Usage > Monitor traffic

## Success Criteria

✅ Deployment successful when:
1. No error messages in deployment output
2. Hosting URL loads the Angular app
3. Login page works with admin/admin123
4. Questions page loads data from MongoDB
5. No console errors in browser
6. API calls return data successfully

## Next Steps After Successful Deployment

1. **Update DNS** (if using custom domain):
   - Add domain in Firebase Hosting settings
   - Update DNS records

2. **Enable Analytics**:
   - Go to Firebase Console > Analytics
   - Enable Google Analytics

3. **Set up Monitoring**:
   - Enable Error Reporting
   - Set up alerting

4. **Security**:
   - Update CORS to specific domain
   - Move MongoDB URI to environment config
   - Implement JWT tokens

5. **Performance**:
   - Enable caching
   - Add CDN
   - Optimize images

## Getting Help

If you encounter issues:

1. **Check Documentation**:
   - [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
   - [FIREBASE_DEPLOYMENT.md](./FIREBASE_DEPLOYMENT.md)
   - [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

2. **Check Logs**:
   - Browser console (F12)
   - Firebase function logs: `firebase functions:log`

3. **Firebase Status**:
   - https://status.firebase.google.com

4. **Firebase Support**:
   - https://firebase.google.com/support
