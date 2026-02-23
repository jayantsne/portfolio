# 🚀 FIRST TIME SETUP - Start Here!

## ✅ Pre-Setup Checklist

Before starting, make sure you have:
- [x] GitHub repository access
- [x] VPS server access (76.13.244.113)
- [x] Domain pointing to VPS (learnwithai.tech)
- [ ] Firebase CLI installed locally
- [ ] SSH access to VPS

---

## 📝 Step-by-Step Setup (Choose Your Path)

### 🎯 Option 1: Quick Setup (30 minutes)

**For Firebase Deployment Only (Recommended to start with)**

### 🎯 Option 2: Full Setup (60 minutes)

**For Both Firebase + VPS Deployment**

---

## 🔥 FIREBASE SETUP (15 minutes)

### Step 1: Install Firebase CLI

```powershell
# On your local machine (Windows)
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Step 2: Login and Get Token

```powershell
# Login to Firebase
firebase login

# Get CI token for GitHub Actions
firebase login:ci
```

**📋 COPY THE TOKEN** - It looks like: `1//0gHx_aBcD-EfGhIjKlMnOpQrStUvWxYz...`

### Step 3: Add Firebase Token to GitHub

1. Go to: https://github.com/YOUR-USERNAME/jayant-angular-ui/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `FIREBASE_TOKEN`
4. Value: Paste the token from Step 2
5. Click **"Add secret"**

### Step 4: Test Firebase Deployment

```powershell
# Make a small change to trigger deployment
cd angular-starter
echo "// deployment test" >> src/main.ts

# Commit and push
git add .
git commit -m "test: trigger firebase deployment"
git push origin main
```

### Step 5: Watch Deployment

1. Go to: https://github.com/YOUR-USERNAME/jayant-angular-ui/actions
2. Click on the running workflow
3. Watch the deployment progress
4. When done, visit: https://myportfolioadmin-d45bd.web.app

✅ **Firebase deployment is now automated!**

---

## 🖥️ VPS SETUP (45 minutes)

### Prerequisites

Make sure your domain `learnwithai.tech` points to `76.13.244.113`

```powershell
# Test DNS resolution
nslookup learnwithai.tech
# Should show: 76.13.244.113
```

---

### Step 1: Initial VPS Setup (15 min)

#### Option A: Automated Setup (Recommended)

```bash
# SSH into your VPS
ssh root@76.13.244.113

# Download and run setup script
cd /tmp
# Since you have the files locally, we'll upload them
```

**On your local machine:**

```powershell
# Upload the setup script to VPS
scp server-configs/initial-setup.sh root@76.13.244.113:/tmp/

# SSH into VPS and run it
ssh root@76.13.244.113
cd /tmp
chmod +x initial-setup.sh
sudo ./initial-setup.sh
```

#### Option B: Manual Setup

```bash
# SSH as root
ssh root@76.13.244.113

# Create deployment user
adduser deployuser
# Set password when prompted
usermod -aG sudo deployuser

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install .NET 8.0 SDK
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-8.0

# Install Nginx
sudo apt install -y nginx

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Create directories
sudo mkdir -p /var/www/learnwithai.tech/frontend
sudo mkdir -p /var/www/learnwithai.tech/backend
sudo mkdir -p /var/log/ailearnapi
sudo chown -R deployuser:deployuser /var/www/learnwithai.tech
sudo chown -R deployuser:deployuser /var/log/ailearnapi

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000
sudo ufw --force enable
```

---

### Step 2: Generate SSH Key for GitHub Actions (5 min)

```bash
# Switch to deployuser
su - deployuser

# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key - COPY THIS!
cat ~/.ssh/github_deploy
```

**📋 COPY THE ENTIRE OUTPUT** including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...your key here...
-----END OPENSSH PRIVATE KEY-----
```

---

### Step 3: Configure Nginx (10 min)

```bash
# Still as deployuser
exit  # Back to root

# Upload Nginx config from your local machine
```

**On your local Windows machine:**

```powershell
# Upload Nginx config
scp server-configs/nginx/learnwithai.tech.conf root@76.13.244.113:/tmp/

# Upload systemd service
scp server-configs/systemd/ailearnapi.service root@76.13.244.113:/tmp/

# SSH back to VPS
ssh root@76.13.244.113
```

**On VPS:**

```bash
# Copy Nginx config
sudo cp /tmp/learnwithai.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config (will show SSL error - that's OK for now)
sudo nginx -t

# Copy systemd service
sudo cp /tmp/ailearnapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ailearnapi
```

---

### Step 4: Setup SSL Certificate (10 min)

```bash
# On VPS as root
sudo certbot --nginx -d learnwithai.tech -d www.learnwithai.tech

# Follow prompts:
# 1. Enter your email: your-email@example.com
# 2. Agree to terms: Y
# 3. Share email: N or Y (your choice)
# 4. Redirect HTTP to HTTPS: 2 (Yes, redirect)
```

**Certbot will automatically:**
- Get SSL certificate
- Update Nginx config
- Setup auto-renewal

```bash
# Test SSL
sudo certbot renew --dry-run

# Restart Nginx
sudo systemctl restart nginx
```

---

### Step 5: Add GitHub Secrets for VPS (10 min)

Go to: https://github.com/YOUR-USERNAME/jayant-angular-ui/settings/secrets/actions

Add these 4 new secrets:

| Secret Name | Value | Where to get it |
|------------|-------|----------------|
| `VPS_SSH_PRIVATE_KEY` | Private key from Step 2 | VPS: `cat ~/.ssh/github_deploy` |
| `VPS_HOST` | `76.13.244.113` | Your VPS IP |
| `VPS_USERNAME` | `deployuser` | SSH user created in Step 1 |
| `MONGODB_CONNECTION_STRING` | `mongodb://localhost:27017/AILearnDB` | MongoDB URL |

---

## 🧪 TEST YOUR SETUP

### Test 1: Firebase Deployment

```powershell
# Make a change
cd angular-starter
echo "// test firebase" >> src/app/app.component.ts

git add .
git commit -m "test: firebase deployment"
git push origin main
```

✅ Check: https://github.com/YOUR-USERNAME/jayant-angular-ui/actions
✅ Visit: https://myportfolioadmin-d45bd.web.app

### Test 2: VPS Deployment

```powershell
# Make a change
echo "// test vps" >> enterprise-dotnet-api/src/AILearnAPI.Api/Program.cs

git add .
git commit -m "test: vps deployment"
git push origin main
```

✅ Check: https://github.com/YOUR-USERNAME/jayant-angular-ui/actions
✅ Visit: https://learnwithai.tech
✅ Visit: https://learnwithai.tech/api/health

---

## 📊 VERIFICATION CHECKLIST

After both deployments, verify:

### Firebase (Portfolio/AI Learn UI)
- [ ] Visit https://myportfolioadmin-d45bd.web.app
- [ ] Page loads correctly
- [ ] No console errors

### VPS (learnwithai.tech)
- [ ] Visit https://learnwithai.tech
- [ ] Frontend loads (Angular app)
- [ ] Visit https://learnwithai.tech/api/health
- [ ] Returns: `{"status":"healthy"}` or similar
- [ ] Visit https://learnwithai.tech/swagger
- [ ] Swagger UI loads

### VPS Services
```bash
ssh deployuser@76.13.244.113

# Check API service
sudo systemctl status ailearnapi

# Check Nginx
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod
```

All should show: **Active: active (running)** in green

---

## 🎉 SUCCESS!

If all checks pass, your automated deployment is working!

### What happens now?

**Every time you push to main branch:**

1. GitHub Actions automatically detects changes
2. Builds your code
3. Deploys to Firebase or VPS (depending on which folder changed)
4. Restarts services
5. Goes live in 3-5 minutes

**No manual steps needed!** 🚀

---

## 🆘 TROUBLESHOOTING

### Firebase Deployment Fails

**Error: "Firebase token invalid"**
```powershell
# Get new token
firebase login:ci
# Update GitHub secret FIREBASE_TOKEN
```

**Error: "Project not found"**
- Check `.firebaserc` has correct project ID
- Run: `firebase projects:list` to see your projects

### VPS Deployment Fails

**Error: "Permission denied (publickey)"**
```bash
# Regenerate SSH key on VPS
ssh root@76.13.244.113
su - deployuser
ssh-keygen -t ed25519 -C "github" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy  # Copy this to GitHub secret
```

**Error: "Could not connect to server"**
- Check firewall: `sudo ufw status`
- Check SSH service: `sudo systemctl status ssh`

### API Not Starting

```bash
# Check logs
ssh deployuser@76.13.244.113
sudo journalctl -u ailearnapi -n 100

# Common issues:
# 1. MongoDB not running: sudo systemctl start mongod
# 2. Port in use: sudo netstat -tlnp | grep 5000
# 3. File permissions: sudo chown -R deployuser:deployuser /var/www/learnwithai.tech
```

### 502 Bad Gateway

```bash
# Check if API is actually running
curl http://localhost:5000/api/health

# If not running, check why
sudo systemctl status ailearnapi
sudo journalctl -u ailearnapi -n 50

# Restart API
sudo systemctl restart ailearnapi
```

---

## 📚 NEXT STEPS

### Immediate
1. Complete this first-time setup
2. Test both deployments
3. Verify all services are running

### Optional Enhancements
- [ ] Setup monitoring (Datadog, NewRelic)
- [ ] Configure database backups
- [ ] Add staging environment
- [ ] Setup log aggregation
- [ ] Configure alerts for failures

### Documentation
- [ ] Read [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)
- [ ] Read [DEPLOYMENT_SETUP_GUIDE.md](./DEPLOYMENT_SETUP_GUIDE.md)
- [ ] Bookmark [server-configs/README.md](./server-configs/README.md)

---

## 🔧 USEFUL COMMANDS

### Local Development
```powershell
# Start Angular dev server
cd angular-starter
npm start

# Start .NET API (if you have it locally)
cd enterprise-dotnet-api
dotnet run --urls "http://localhost:5000"
```

### VPS Management
```bash
# SSH into server
ssh deployuser@76.13.244.113

# Check all services
sudo systemctl status ailearnapi nginx mongod

# View logs
sudo journalctl -u ailearnapi -f  # Follow API logs
sudo tail -f /var/log/nginx/learnwithai.tech_access.log  # Nginx access
sudo tail -f /var/log/nginx/learnwithai.tech_error.log   # Nginx errors

# Restart services
sudo systemctl restart ailearnapi
sudo systemctl reload nginx

# Check SSL certificate
sudo certbot certificates
```

### GitHub Actions
```powershell
# View deployment history
# Go to: https://github.com/YOUR-USERNAME/jayant-angular-ui/actions

# Or use GitHub CLI
gh run list
gh run view <run-id>
```

---

## 🎯 CURRENT STATUS

Based on your setup:
- ✅ GitHub workflows created
- ✅ Firebase config detected (myportfolioadmin)
- ✅ Server configs ready
- ⏳ Need to add GitHub secrets
- ⏳ Need to setup VPS
- ⏳ Need to test deployments

**Start with Firebase setup (Steps 1-5 of Firebase section) - takes 15 minutes!**

---

Need help? Check the troubleshooting section or open an issue in your repo!
