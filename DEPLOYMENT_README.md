# ⚡ Quick Reference - Deployment Files

## 🚨 START HERE

**First time setup?** → Read **[FIRST_TIME_SETUP.md](./FIRST_TIME_SETUP.md)**

## 📁 File Guide

| File | Purpose | When to Use |
|------|---------|------------|
| **[FIRST_TIME_SETUP.md](./FIRST_TIME_SETUP.md)** | ⭐ **START HERE** - Step-by-step first setup | Setting up for the first time |
| [QUICK_START.md](./QUICK_START.md) | Quick 30-min setup summary | Quick reference |
| [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) | System architecture & flow diagrams | Understanding the system |
| [DEPLOYMENT_SETUP_GUIDE.md](./DEPLOYMENT_SETUP_GUIDE.md) | Detailed technical guide | In-depth setup info |
| [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md) | Complete overview & summary | Overview of entire system |

## 📂 Folders

| Folder | Contents | Purpose |
|--------|----------|---------|
| `.github/workflows/` | GitHub Actions workflows | Automatic deployments |
| `server-configs/` | VPS configuration files | Server setup scripts |
| `angular-starter/` | AI Learn App frontend | Angular application |
| `enterprise-dotnet-api/` | AI Learn App backend | .NET API |

## 🚀 Quick Commands

### Initial Setup (First Time Only)

```powershell
# 1. Get Firebase token
firebase login:ci

# 2. Add to GitHub Secrets as FIREBASE_TOKEN

# 3. Upload server configs and setup VPS (see FIRST_TIME_SETUP.md)
```

### Daily Development

```powershell
# Make changes to your code
vim angular-starter/src/app/app.component.ts

# Commit and push
git add .
git commit -m "feat: your change description"
git push origin main

# ✨ Deployment happens automatically!
```

### Check Deployment Status

```powershell
# Open in browser:
# https://github.com/YOUR-USERNAME/jayant-angular-ui/actions

# Or use GitHub CLI:
gh run list
```

### VPS Management

```bash
# SSH into server
ssh deployuser@76.13.244.113

# Check services
sudo systemctl status ailearnapi nginx mongod

# View logs
sudo journalctl -u ailearnapi -f
```

## 🔗 Live URLs

After setup, your apps will be at:

- **Firebase (Portfolio):** https://myportfolioadmin-d45bd.web.app
- **VPS Frontend:** https://learnwithai.tech
- **VPS API:** https://learnwithai.tech/api/health
- **Swagger Docs:** https://learnwithai.tech/swagger

## 🆘 Common Issues

### Deployment fails
→ Check GitHub Actions logs: https://github.com/YOUR-USERNAME/repo/actions

### 502 Bad Gateway
→ Check if API is running: `sudo systemctl status ailearnapi`

### SSL errors
→ Renew certificate: `sudo certbot renew`

## 🎯 Current Setup Status

Your Firebase project: **myportfolioadmin**  
Your VPS: **76.13.244.113**  
Your domain: **learnwithai.tech**

## 📌 Next Steps

1. ✅ Read [FIRST_TIME_SETUP.md](./FIRST_TIME_SETUP.md)
2. ⏳ Complete Firebase setup (15 min)
3. ⏳ Complete VPS setup (45 min)
4. ⏳ Test deployments
5. 🎉 Start developing!

---

**Need detailed help?** Open [FIRST_TIME_SETUP.md](./FIRST_TIME_SETUP.md)
