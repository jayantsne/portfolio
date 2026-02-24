# 🚀 Automated Deployment Setup Guide

## Overview

This guide will help you set up **automatic deployment** for your AI Learn App. Once configured, simply commit and push your code to GitHub, and it will automatically build and deploy to your VPS!

## ✨ What You'll Get

After setup, every time you push to the `main` branch:

✅ **Automatic build** of your Angular app  
✅ **Automatic deployment** to http://76.13.244.113  
✅ **Automatic nginx reload**  
✅ **Build status notifications** in GitHub

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Run the Setup Script

Open PowerShell in this directory and run:

```powershell
.\setup-github-deploy.ps1
```

This script will:
- Get or create an SSH key on your VPS
- Copy it to your clipboard
- Show you exactly what to do next

### Step 2: Add the Secret to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name:** `VPS_SSH_PRIVATE_KEY`
   - **Value:** Paste the SSH key from the setup script
5. Click **Add secret**

### Step 3: Test the Deployment

```bash
git add .
git commit -m "Test automated deployment"
git push origin main
```

Then:
- Go to your GitHub repository
- Click the **Actions** tab
- Watch your deployment happen automatically! 🎉

---

## 📋 What Happens on Each Push?

```
Push to GitHub
    ↓
GitHub Actions Triggered
    ↓
1. Checkout Code
2. Install Node.js
3. Install Dependencies (npm ci)
4. Build Angular App (npm run build)
5. Create Deployment Archive
6. Upload to VPS
7. Extract and Deploy Files
8. Set Permissions
9. Reload Nginx
    ↓
Your App is LIVE! ✅
```

---

## 🔧 Manual Setup (If Script Doesn't Work)

### 1. Create SSH Key on VPS

```bash
# SSH into your VPS
ssh root@76.13.244.113

# Create SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""

# Add to authorized keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key
cat ~/.ssh/github_deploy
```

Copy the entire private key output (including the BEGIN and END lines).

### 2. Add to GitHub Secrets

1. Go to: `https://github.com/YOUR-USERNAME/jayant-angular-ui/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `VPS_SSH_PRIVATE_KEY`
4. Value: Paste the entire private key
5. Click **Add secret**

### 3. Commit and Push

```bash
git add .
git commit -m "Enable auto-deployment"
git push origin main
```

---

## 🎮 Using the Automated Deployment

### Normal Development Workflow

```bash
# 1. Make your changes
code angular-starter/src/app/...

# 2. Test locally
cd angular-starter
npm start

# 3. Commit and push
git add .
git commit -m "Updated AI learn page"
git push origin main

# 4. ✨ Deployment happens automatically!
```

### Monitor Deployment

- Go to: `https://github.com/YOUR-USERNAME/jayant-angular-ui/actions`
- Click on your latest commit
- Watch the deployment progress in real-time
- See success/failure status

### Manual Trigger

You can also trigger deployment manually without pushing code:

1. Go to **Actions** tab in GitHub
2. Click **Deploy AI Learn App to VPS**
3. Click **Run workflow**
4. Select **main** branch
5. Click **Run workflow**

---

## 🛠️ Troubleshooting

### Deployment Failed?

1. **Check GitHub Actions logs:**
   - Go to Actions tab
   - Click on the failed workflow
   - Expand each step to see error details

2. **Common Issues:**

   **SSH Key Not Working:**
   - Make sure you copied the entire key (BEGIN and END lines)
   - Verify secret name is exactly: `VPS_SSH_PRIVATE_KEY`
   - Regenerate key using the setup script

   **Build Errors:**
   - Pull latest changes: `git pull`
   - Test build locally: `cd angular-starter && npm run build`

   **VPS Not Accessible:**
   - Check if VPS is online: `ping 76.13.244.113`
   - Verify SSH access: `ssh root@76.13.244.113`

### Check Deployment Status

```powershell
# Run this locally to verify deployment
.\check-deployment.ps1
```

### View Live Site

After successful deployment:
- http://76.13.244.113
- http://learnwithai.tech

---

## 📊 Workflow Configuration

The deployment workflow is defined in:
```
.github/workflows/deploy-frontend-only.yml
```

### Workflow Triggers

Automatic deployment runs when:
- ✅ You push to `main` branch
- ✅ Files in `angular-starter/` change
- ✅ Manual trigger from GitHub Actions

### Workflow Steps

1. **Build** (3-5 minutes)
   - Install dependencies
   - Run production build
   - Create deployment archive

2. **Deploy** (1-2 minutes)
   - Upload to VPS
   - Extract files
   - Set permissions
   - Reload nginx

**Total time:** ~5-7 minutes per deployment

---

## 🎯 Best Practices

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-component

# Make changes and test
npm start

# Commit to feature branch
git add .
git commit -m "Add new component"
git push origin feature/new-component

# Create Pull Request on GitHub
# After review, merge to main
# Deployment happens automatically!
```

### Quick Hotfix

```bash
# For urgent fixes directly to main:
git checkout main
git pull
# Make fix
git add .
git commit -m "fix: urgent bug fix"
git push origin main
# Auto-deploys in ~5 minutes
```

---

## 🔐 Security Notes

- SSH private key is stored securely in GitHub Secrets
- GitHub encrypts secrets at rest
- Secrets are not visible in logs
- Only accessible to GitHub Actions runners

---

## ✅ Verification Checklist

After setup, verify:

- [ ] GitHub Secret `VPS_SSH_PRIVATE_KEY` is added
- [ ] Pushed a test commit to main branch
- [ ] GitHub Actions workflow ran successfully
- [ ] Site is accessible at http://76.13.244.113
- [ ] nginx is serving the new files

---

## 📞 Need Help?

1. Check the GitHub Actions logs for detailed errors
2. Run `.\check-deployment.ps1` to verify VPS status
3. Review the workflow file: `.github/workflows/deploy-frontend-only.yml`

---

## 🎉 Success!

You now have fully automated deployments! Just:

```bash
git add .
git commit -m "Your changes"
git push
```

And your app deploys automatically! 🚀
