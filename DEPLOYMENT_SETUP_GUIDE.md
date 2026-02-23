# 🛠️ Deployment Setup Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [One-Time Server Setup](#one-time-server-setup)
3. [GitHub Repository Setup](#github-repository-setup)
4. [Firebase Setup](#firebase-setup)
5. [VPS Server Configuration](#vps-server-configuration)
6. [GitHub Actions Setup](#github-actions-setup)
7. [Testing & Verification](#testing--verification)

---

## ✅ Prerequisites

### Required
- [x] GitHub account with repo access
- [x] VPS Server (76.13.244.113)
- [x] Domain: learnwithai.tech (pointing to your VPS)
- [x] Firebase account (existing)
- [x] SSH access to VPS as root

### Software (install on VPS)
- Ubuntu 20.04+ (or similar)
- Nginx
- Node.js 18+
- .NET 8.0 SDK
- MongoDB
- Certbot (Let's Encrypt)

---

## 🔐 ONE-TIME SERVER SETUP

### Step 1: Initial SSH Connection

```bash
# Connect to your VPS
ssh root@76.13.244.113
```

### Step 2: Create Deployment User

```bash
# Create non-root user for deployments
adduser deployuser
usermod -aG sudo deployuser

# Switch to deployuser
su - deployuser
```

### Step 3: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

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
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 for process management (optional)
sudo npm install -g pm2

# Verify installations
node --version
dotnet --version
nginx -v
mongosh --version
```

### Step 4: Create Application Directories

```bash
# Create directory structure
sudo mkdir -p /var/www/learnwithai.tech/frontend
sudo mkdir -p /var/www/learnwithai.tech/backend
sudo mkdir -p /var/log/ailearnapi

# Set ownership
sudo chown -R deployuser:deployuser /var/www/learnwithai.tech
sudo chown -R deployuser:deployuser /var/log/ailearnapi
```

### Step 5: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000  # Backend API
sudo ufw enable

# Check status
sudo ufw status
```

### Step 6: Setup SSH Key for GitHub Actions

```bash
# Generate SSH key pair (on your VPS)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Add public key to authorized_keys
cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (copy this for GitHub Secrets)
cat ~/.ssh/github_deploy_key

# IMPORTANT: Copy the entire output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

**⚠️ SAVE THE PRIVATE KEY** - you'll add it to GitHub Secrets later.

---

## 🔧 VPS SERVER CONFIGURATION

### Create Systemd Service for .NET API

```bash
sudo nano /etc/systemd/system/ailearnapi.service
```

Paste this configuration:

```ini
[Unit]
Description=AI Learn API - ASP.NET Core Application
After=network.target

[Service]
Type=notify
User=deployuser
WorkingDirectory=/var/www/learnwithai.tech/backend
ExecStart=/usr/bin/dotnet /var/www/learnwithai.tech/backend/AILearnAPI.Api.dll
Restart=always
RestartSec=10
SyslogIdentifier=ailearnapi
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
Environment="ConnectionStrings__MongoDB=mongodb://localhost:27017/AILearnDB"

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ailearnapi
# Don't start yet (no files deployed)
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/learnwithai.tech
```

Paste this configuration:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Upstream backend
upstream api_backend {
    server localhost:5000;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name learnwithai.tech www.learnwithai.tech;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/learnwithai.tech;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name learnwithai.tech www.learnwithai.tech;
    
    # SSL Configuration (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/learnwithai.tech/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/learnwithai.tech/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logs
    access_log /var/log/nginx/learnwithai.tech_access.log;
    error_log /var/log/nginx/learnwithai.tech_error.log;
    
    # Backend API
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Swagger UI (optional - remove in production)
    location /swagger {
        limit_req zone=api_limit burst=10 nodelay;
        proxy_pass http://api_backend/swagger;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend (Angular)
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        root /var/www/learnwithai.tech/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/learnwithai.tech /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Don't restart yet (SSL not configured)
```

### Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d learnwithai.tech -d www.learnwithai.tech

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Certbot will automatically update Nginx config

# Test auto-renewal
sudo certbot renew --dry-run

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔥 FIREBASE SETUP

### Step 1: Get Firebase Token

```bash
# On your local machine (not VPS)
npm install -g firebase-tools

# Login and get CI token
firebase login:ci

# Copy the token that appears
# Example: 1//0gHx_aBcD-EfGhIjKlMnOpQrStUvWxYz...
```

**⚠️ SAVE THIS TOKEN** - you'll add it to GitHub Secrets.

### Step 2: Verify Firebase Config

Check that `angular-starter/.firebaserc` exists:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

---

## 🐙 GITHUB REPOSITORY SETUP

### Step 1: Add GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets:

| Secret Name | Value | Where to get it |
|------------|-------|----------------|
| `FIREBASE_TOKEN` | Token from `firebase login:ci` | Firebase CLI |
| `VPS_SSH_PRIVATE_KEY` | Private key from `~/.ssh/github_deploy_key` | VPS (Step 6 above) |
| `VPS_HOST` | `76.13.244.113` | Your VPS IP |
| `VPS_USERNAME` | `deployuser` | User created on VPS |
| `MONGODB_CONNECTION_STRING` | `mongodb://localhost:27017/AILearnDB` | MongoDB connection |

### Step 2: Create GitHub Actions Workflows

Create workflow files in your repository.

---

## 📝 GITHUB ACTIONS WORKFLOWS

### Workflow 1: Deploy Portfolio to Firebase

Create `.github/workflows/deploy-portfolio.yml`:

```yaml
name: Deploy Portfolio to Firebase

on:
  push:
    branches:
      - main
    paths:
      - 'portfolio-ui/**'
      - '.github/workflows/deploy-portfolio.yml'

jobs:
  deploy:
    name: Deploy to Firebase Hosting
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: portfolio-ui/package-lock.json
      
      - name: Install dependencies
        working-directory: ./portfolio-ui
        run: npm ci
      
      - name: Build Angular app
        working-directory: ./portfolio-ui
        run: npm run build -- --configuration production
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_TOKEN }}'
          projectId: your-firebase-project-id
          channelId: live
          entryPoint: ./portfolio-ui
```

### Workflow 2: Deploy AI Learn App to VPS

Create `.github/workflows/deploy-ailearn.yml`:

```yaml
name: Deploy AI Learn App to VPS

on:
  push:
    branches:
      - main
    paths:
      - 'angular-starter/**'
      - 'enterprise-dotnet-api/**'
      - '.github/workflows/deploy-ailearn.yml'

jobs:
  build-and-deploy:
    name: Build and Deploy to VPS
    runs-on: ubuntu-latest
    
    steps:
      # ===== CHECKOUT CODE =====
      - name: Checkout code
        uses: actions/checkout@v3
      
      # ===== BUILD FRONTEND =====
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: angular-starter/package-lock.json
      
      - name: Install frontend dependencies
        working-directory: ./angular-starter
        run: npm ci
      
      - name: Build Angular frontend
        working-directory: ./angular-starter
        run: npm run build -- --configuration production
      
      # ===== BUILD BACKEND =====
      - name: Setup .NET SDK
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      
      - name: Restore .NET dependencies
        working-directory: ./enterprise-dotnet-api
        run: dotnet restore
      
      - name: Build .NET API
        working-directory: ./enterprise-dotnet-api
        run: dotnet build --configuration Release --no-restore
      
      - name: Publish .NET API
        working-directory: ./enterprise-dotnet-api
        run: dotnet publish src/AILearnAPI.Api/AILearnAPI.Api.csproj -c Release -o ./publish
      
      # ===== DEPLOY TO VPS =====
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts
      
      - name: Deploy Frontend to VPS
        run: |
          rsync -avz --delete \
            -e "ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" \
            ./angular-starter/dist/angular-starter/ \
            ${{ secrets.VPS_USERNAME }}@${{ secrets.VPS_HOST }}:/var/www/learnwithai.tech/frontend/
      
      - name: Deploy Backend to VPS
        run: |
          rsync -avz --delete \
            -e "ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" \
            ./enterprise-dotnet-api/publish/ \
            ${{ secrets.VPS_USERNAME }}@${{ secrets.VPS_HOST }}:/var/www/learnwithai.tech/backend/
      
      - name: Restart services on VPS
        run: |
          ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no \
            ${{ secrets.VPS_USERNAME }}@${{ secrets.VPS_HOST }} << 'EOF'
            sudo systemctl restart ailearnapi
            sudo systemctl reload nginx
            echo "✅ Deployment complete!"
            echo "🔍 Checking service status..."
            sudo systemctl status ailearnapi --no-pager
          EOF
      
      - name: Cleanup
        if: always()
        run: rm -f ~/.ssh/deploy_key
```

---

## ✅ TESTING & VERIFICATION

### Test Deployments

1. **Push a change to portfolio folder**:
   ```bash
   git add portfolio-ui/
   git commit -m "test: trigger firebase deployment"
   git push origin main
   ```
   
   - Check GitHub Actions tab
   - Verify deployment success
   - Visit Firebase hosting URL

2. **Push a change to AI Learn App**:
   ```bash
   git add angular-starter/
   git commit -m "test: trigger vps deployment"
   git push origin main
   ```
   
   - Check GitHub Actions tab
   - Verify deployment success
   - Visit https://learnwithai.tech

### Verify VPS Services

```bash
# SSH into VPS
ssh deployuser@76.13.244.113

# Check API service
sudo systemctl status ailearnapi

# Check Nginx
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod

# View API logs
sudo journalctl -u ailearnapi -f

# View Nginx logs
sudo tail -f /var/log/nginx/learnwithai.tech_access.log
```

### Test Health Endpoints

```bash
# Frontend
curl https://learnwithai.tech

# Backend API
curl https://learnwithai.tech/api/health

# Swagger UI
# Visit: https://learnwithai.tech/swagger
```

---

## 🔄 RECURRING WORKFLOW

After setup, deployments are **fully automated**:

1. Make code changes locally
2. Commit and push to `main` branch
3. GitHub Actions automatically:
   - Builds the project
   - Deploys to Firebase (portfolio) or VPS (AI Learn)
   - Restarts services
4. Changes go live in 2-5 minutes

**No manual intervention needed!** 🎉

---

## 🛟 TROUBLESHOOTING

### Deployment fails with SSH error
```bash
# Regenerate SSH key on VPS
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy_key -N ""
# Update GitHub secret VPS_SSH_PRIVATE_KEY with new private key
```

### API service won't start
```bash
# Check logs
sudo journalctl -u ailearnapi -n 50

# Check port availability
sudo netstat -tlnp | grep 5000

# Restart service
sudo systemctl restart ailearnapi
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/learnwithai.tech_error.log
```

### SSL certificate renewal fails
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Check renewal cron
sudo systemctl status certbot.timer
```

---

## 📚 Additional Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)
- [Systemd Service Guide](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

---

🎉 **Setup Complete!** Your automated deployment pipeline is ready.
