# 🚀 Quick Reference - Auto Deployment

## One-Time Setup (Do This Once)

```powershell
# 1. Run setup script
.\setup-github-deploy.ps1

# 2. Copy the SSH key it shows you

# 3. Add to GitHub:
#    Settings → Secrets → Actions → New secret
#    Name: VPS_SSH_PRIVATE_KEY
#    Value: Paste the SSH key

# 4. Test it
git add .
git commit -m "Test deployment"
git push origin main
```

## Daily Usage

```bash
# Just commit and push - deployment is automatic!
git add .
git commit -m "Your changes description"
git push origin main

# Check progress:
# → Go to GitHub → Actions tab
```

## What Triggers Deployment?

✅ Push to `main` branch  
✅ Changes in `angular-starter/` folder  
✅ Manual trigger from GitHub Actions

## Deployment Time

⏱️ **5-7 minutes**  
- Build: 3-5 min  
- Deploy: 1-2 min  

## Verify Deployment

```powershell
# Check if it worked
.\check-deployment.ps1

# Or visit
# http://76.13.244.113
# http://learnwithai.tech
```

## Troubleshooting

**Deployment failed?**
1. Check GitHub Actions logs
2. Verify secret is named exactly: `VPS_SSH_PRIVATE_KEY`
3. Re-run setup script if needed

**Need to manually deploy?**
```powershell
.\deploy-base64.ps1
```

## Files Changed

✅ `.github/workflows/deploy-frontend-only.yml` - Automated workflow  
✅ `setup-github-deploy.ps1` - One-time setup helper  
✅ `AUTO_DEPLOY_GUIDE.md` - Full documentation  

---

**That's it!** Every push now automatically deploys your app! 🎉
