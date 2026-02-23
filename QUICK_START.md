# 🚀 Quick Start - Automated Deployment

## 📝 Summary

This guide sets up **fully automated deployments** for:
1. **Portfolio UI** → Firebase Hosting
2. **AI Learn App** → VPS (learnwithai.tech)

**After setup:** Just push to GitHub, deployment happens automatically! No passwords needed.

---

## ⚡ Quick Setup (30 minutes)

### Step 1: VPS Initial Setup (One-time)

```bash
# SSH into your VPS
ssh root@76.13.244.113

# Run this comprehensive setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/repo/main/server-configs/initial-setup.sh | bash
```

Or manually:

```bash
# Create user
adduser deployuser
usermod -aG sudo deployuser

# Install software
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs nginx mongodb-org dotnet-sdk-8.0 certbot python3-certbot-nginx

# Create directories
mkdir -p /var/www/learnwithai.tech/{frontend,backend}
chown -R deployuser:deployuser /var/www/learnwithai.tech
```

### Step 2: Generate SSH Key

```bash
# On VPS as deployuser
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy private key (save for GitHub Secrets)
cat ~/.ssh/github_deploy
```

### Step 3: Setup Nginx & SSL

```bash
# Copy Nginx config from repo
sudo cp server-configs/nginx/learnwithai.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d learnwithai.tech -d www.learnwithai.tech

# Start services
sudo systemctl restart nginx
```

### Step 4: Setup Systemd Service

```bash
# Copy systemd service
sudo cp server-configs/systemd/ailearnapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ailearnapi
```

### Step 5: GitHub Secrets

Go to GitHub → Settings → Secrets → Actions → New secret

Add these 5 secrets:

| Secret | Value | Get From |
|--------|-------|----------|
| `FIREBASE_TOKEN` | `1//0gHx...` | Run: `firebase login:ci` |
| `VPS_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH...` | VPS: `cat ~/.ssh/github_deploy` |
| `VPS_HOST` | `76.13.244.113` | Your server IP |
| `VPS_USERNAME` | `deployuser` | SSH user |
| `MONGODB_CONNECTION_STRING` | `mongodb://localhost:27017/AILearnDB` | MongoDB URL |

### Step 6: Test Deployment

```bash
# Make a small change
echo "// test" >> angular-starter/src/main.ts

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/yourusername/repo/actions
```

---

## ✅ Verification

### Check if everything works:

```bash
# 1. Frontend
curl https://learnwithai.tech

# 2. Backend API
curl https://learnwithai.tech/api/health

# 3. Services on VPS
ssh deployuser@76.13.244.113
sudo systemctl status ailearnapi
sudo systemctl status nginx
```

---

## 🔄 Daily Usage

**That's it! Now deployments are automatic:**

```bash
# Make changes
vim angular-starter/src/app/app.component.ts

# Commit & push
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions deploys automatically in 3-5 minutes!
```

---

## 📊 Monitor Deployments

- **GitHub Actions**: https://github.com/yourusername/repo/actions
- **Check logs on VPS**:
  ```bash
  ssh deployuser@76.13.244.113
  sudo journalctl -u ailearnapi -f     # API logs
  sudo tail -f /var/log/nginx/learnwithai.tech_access.log  # Nginx logs
  ```

---

## 🔧 Helper Scripts

```bash
# SSH helper (interactive menu)
bash server-configs/deploy-helper.sh

# Check API health
curl https://learnwithai.tech/api/health

# View GitHub Actions logs
gh run list  # (requires GitHub CLI)
```

---

## 🆘 Troubleshooting

**Deployment fails with SSH error:**
```bash
# Regenerate SSH key on VPS
ssh-keygen -t ed25519 -C "github" -f ~/.ssh/github_deploy -N ""
# Update GitHub secret VPS_SSH_PRIVATE_KEY
```

**API won't start:**
```bash
ssh deployuser@76.13.244.113
sudo journalctl -u ailearnapi -n 100  # Check logs
sudo systemctl restart ailearnapi      # Restart
```

**502 Bad Gateway:**
```bash
# Check if API is running
curl http://localhost:5000/api/health
sudo systemctl status ailearnapi
```

---

## 📚 Full Documentation

- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) - Complete architecture overview
- [DEPLOYMENT_SETUP_GUIDE.md](./DEPLOYMENT_SETUP_GUIDE.md) - Detailed step-by-step guide
- [server-configs/](./server-configs/) - All configuration files

---

## 🎯 What You Get

✅ Push to GitHub → Auto-deploy (no manual steps)  
✅ Separate environments (Portfolio on Firebase, AI Learn on VPS)  
✅ SSL/HTTPS automatic (Let's Encrypt)  
✅ Zero passwords in code (all secrets encrypted)  
✅ Health monitoring endpoints  
✅ Professional production setup  

**Time to deploy after setup: 3-5 minutes (fully automated!)**
