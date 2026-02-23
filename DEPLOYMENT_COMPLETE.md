# 🚀 Automated Deployment System - Complete Setup

✅ **Created 11 configuration files for fully automated deployment!**

## 📦 What's Been Created

### 📄 Documentation (4 files)
1. **DEPLOYMENT_ARCHITECTURE.md** - Complete system architecture  
2. **DEPLOYMENT_SETUP_GUIDE.md** - Step-by-step implementation guide  
3. **QUICK_START.md** - 30-minute quick setup guide  
4. **server-configs/README.md** - Server configuration documentation  

### ⚙️ GitHub Actions (2 workflows)
5. **.github/workflows/deploy-ailearn.yml** - VPS deployment workflow  
6. **.github/workflows/deploy-portfolio.yml** - Firebase deployment workflow  

### 🔧 Server Configs (5 files)
7. **server-configs/nginx/learnwithai.tech.conf** - Nginx reverse proxy  
8. **server-configs/systemd/ailearnapi.service** - Systemd service  
9. **server-configs/ssl/setup-ssl.sh** - SSL certificate installer  
10. **server-configs/initial-setup.sh** - Complete VPS setup script  
11. **server-configs/deploy-helper.sh** - Interactive deployment helper  

---

## 🎯 Quick Overview

### Architecture

```
GitHub Push → GitHub Actions → Deploy
                |
                ├─ Portfolio UI → Firebase Hosting
                └─ AI Learn App → VPS (learnwithai.tech)
                                  ├─ / → Frontend (Angular)
                                  └─ /api → Backend (.NET 8)
```

### Features

✅ **Zero manual deployment** - Everything automated after setup  
✅ **No passwords in code** - All auth via tokens/SSH keys  
✅ **SSL/HTTPS automatic** - Let's Encrypt with auto-renewal  
✅ **Separate environments** - Portfolio on Firebase, AI Learn on VPS  
✅ **Health monitoring** - Built-in health check endpoints  
✅ **Production-ready** - Rate limiting, security headers, logging  

---

## ⚡ 30-Minute Quick Start

### Step 1: VPS Setup (10 min)

```bash
# SSH into your VPS
ssh root@76.13.244.113

# Run setup script
wget https://raw.githubusercontent.com/yourusername/repo/main/server-configs/initial-setup.sh
chmod +x initial-setup.sh
sudo ./initial-setup.sh

# This installs: Node.js, .NET 8, Nginx, MongoDB, Certbot
# Creates: deployuser, directories, SSH keys, firewall rules
```

### Step 2: Copy Configs (5 min)

```bash
# Copy Nginx config
sudo cp server-configs/nginx/learnwithai.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t

# Copy systemd service
sudo cp server-configs/systemd/ailearnapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ailearnapi
```

### Step 3: Setup SSL (5 min)

```bash
# Get SSL certificate
sudo bash server-configs/ssl/setup-ssl.sh

# Or manually:
sudo certbot --nginx -d learnwithai.tech -d www.learnwithai.tech
```

### Step 4: GitHub Secrets (5 min)

Go to GitHub → Settings → Secrets → Actions

Add these 5 secrets:

| Secret Name | How to Get |
|-------------|-----------|
| `FIREBASE_TOKEN` | Run: `firebase login:ci` on your local machine |
| `VPS_SSH_PRIVATE_KEY` | VPS: `cat ~/.ssh/github_deploy` (from setup script) |
| `VPS_HOST` | `76.13.244.113` |
| `VPS_USERNAME` | `deployuser` |
| `MONGODB_CONNECTION_STRING` | `mongodb://localhost:27017/AILearnDB` |

### Step 5: Test Deploy (5 min)

```bash
# Make a change
echo "// test" >> angular-starter/src/main.ts

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push origin main

# Check GitHub Actions tab - deployment starts automatically!
```

---

## 📚 Detailed Guides

### For Complete Setup
👉 Read [DEPLOYMENT_SETUP_GUIDE.md](./DEPLOYMENT_SETUP_GUIDE.md)

### For Architecture Details
👉 Read [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)

### For Server Management
👉 Read [server-configs/README.md](./server-configs/README.md)

---

## 🔄 Daily Workflow

After setup, deployments are fully automated:

```bash
# 1. Make changes
vim angular-starter/src/app/app.component.ts

# 2. Commit & push
git add .
git commit -m "feat: new feature"
git push origin main

# 3. Relax ☕
# GitHub Actions automatically:
#   - Builds your code
#   - Deploys to server
#   - Restarts services
#   - Goes live in 3-5 minutes
```

**No manual steps needed!**

---

## 🛠️ Server Management

### Interactive Helper

```bash
bash server-configs/deploy-helper.sh
```

**Menu options:**
1. SSH into server
2. Check API status
3. Check Nginx status
4. View API logs
5. View Nginx logs
6. Restart API service
7. Restart Nginx
8. Test API health
9. Check SSL certificate

### Quick Commands

```bash
# Check all services
ssh deployuser@76.13.244.113 "sudo systemctl status ailearnapi nginx mongod"

# View API logs
ssh deployuser@76.13.244.113 "sudo journalctl -u ailearnapi -f"

# Test health
curl https://learnwithai.tech/api/health

# View Nginx logs
ssh deployuser@76.13.244.113 "sudo tail -f /var/log/nginx/learnwithai.tech_access.log"
```

---

## 🔐 Security Features

✅ Non-root deployment user  
✅ SSH key-based authentication (no passwords)  
✅ Firewall configured (UFW)  
✅ SSL/TLS with HSTS  
✅ Rate limiting (10 req/s for API, 30 req/s general)  
✅ Security headers (XSS, CSRF protection)  
✅ Secrets encrypted in GitHub  
✅ CORS properly configured  

---

## 📊 Monitoring & Health Checks

### Endpoints

- **Frontend**: https://learnwithai.tech
- **Backend Health**: https://learnwithai.tech/api/health
- **API Docs**: https://learnwithai.tech/swagger

### Logs Location (VPS)

- **API Logs**: `sudo journalctl -u ailearnapi`
- **Nginx Access**: `/var/log/nginx/learnwithai.tech_access.log`
- **Nginx Error**: `/var/log/nginx/learnwithai.tech_error.log`

### GitHub Actions

- View all deployments: Repository → Actions tab
- See build logs, timing, success/failure status

---

## 🆘 Troubleshooting

### Deployment Fails

**Check GitHub Actions logs:**
- Go to repository → Actions
- Click on failed workflow
- Expand each step to see error

**Common issues:**
1. **SSH key error** → Regenerate key, update GitHub secret
2. **Build fails** → Check build errors in Actions log
3. **502 error** → API not running, check systemd service

### Fix Commands

```bash
# SSH into server
ssh deployuser@76.13.244.113

# Check API
sudo systemctl status ailearnapi
sudo journalctl -u ailearnapi -n 50

# Restart API
sudo systemctl restart ailearnapi

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# View recent logs
sudo journalctl -u ailearnapi -n 100
sudo tail -f /var/log/nginx/learnwithai.tech_error.log
```

---

## 🎯 What You Get

| Feature | Status |
|---------|--------|
| Automated CI/CD | ✅ GitHub Actions |
| Zero manual deploy | ✅ Push to deploy |
| SSL/HTTPS | ✅ Auto-renewed every 60 days |
| Separate environments | ✅ Firebase + VPS |
| Health checks | ✅ /api/health endpoint |
| Monitoring | ✅ Logs + systemd |
| Security | ✅ Firewall + HTTPS + Rate limiting |
| Reverse proxy | ✅ Nginx production config |
| Process management | ✅ Systemd auto-restart |
| Documentation | ✅ Complete guides |

---

## 📝 Next Steps

### 1. Immediate (Required)

- [ ] Run `initial-setup.sh` on VPS
- [ ] Add GitHub Secrets (5 secrets)
- [ ] Update `.github/workflows/deploy-portfolio.yml` with your Firebase project ID
- [ ] Test first deployment

### 2. Optional (Recommended)

- [ ] Setup monitoring (Datadog, NewRelic, or custom)
- [ ] Configure email alerts for deployment failures
- [ ] Setup database backups (MongoDB)
- [ ] Add staging environment
- [ ] Configure CDN (Cloudflare) for frontend

### 3. Customization

- [ ] Adjust rate limits in Nginx config
- [ ] Customize error pages
- [ ] Add custom domain to Firebase (if needed)
- [ ] Setup log rotation
- [ ] Configure MongoDB authentication

---

## 📞 Support

### Resources

- **Architecture**: [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)
- **Setup Guide**: [DEPLOYMENT_SETUP_GUIDE.md](./DEPLOYMENT_SETUP_GUIDE.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Server Configs**: [server-configs/README.md](./server-configs/README.md)

### External Docs

- [GitHub Actions](https://docs.github.com/en/actions)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [.NET Deployment](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/)

---

## 🎉 Summary

You now have a **production-ready, fully automated deployment system!**

**Time investment:**
- Setup: 30 minutes (one-time)
- Each deployment: 0 minutes (automatic)

**Result:**
- Push code → Automatically deployed in 3-5 minutes
- HTTPS enabled
- No passwords in code
- Professional monitoring
- Scalable architecture

**Happy deploying! 🚀**
