# 🚀 Automated Deployment Architecture

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GITHUB REPOSITORY                        │
│                                                                   │
│  ┌──────────────────┐              ┌─────────────────────────┐  │
│  │  Portfolio UI    │              │   AI Learn App          │  │
│  │  (Angular)       │              │   Frontend + Backend    │  │
│  └──────────────────┘              └─────────────────────────┘  │
│           │                                     │                │
│           │ Push to main                        │ Push to main  │
│           ▼                                     ▼                │
│  ┌──────────────────┐              ┌─────────────────────────┐  │
│  │ GitHub Actions   │              │  GitHub Actions         │  │
│  │ Workflow 1       │              │  Workflow 2             │  │
│  └──────────────────┘              └─────────────────────────┘  │
└───────────│─────────────────────────────────────│────────────────┘
            │                                     │
            │                                     │
            ▼                                     ▼
   ┌────────────────┐                  ┌──────────────────────┐
   │                │                  │   YOUR VPS SERVER    │
   │   FIREBASE     │                  │   76.13.244.113      │
   │   HOSTING      │                  │                      │
   │                │                  │  ┌────────────────┐  │
   │  Portfolio UI  │                  │  │     Nginx      │  │
   │                │                  │  │  Reverse Proxy │  │
   └────────────────┘                  │  └────────────────┘  │
                                       │         │             │
         learnwithai.tech              │    ┌────┴─────┐      │
         ════════════════              │    │          │      │
                                       │    ▼          ▼      │
                                       │ Frontend    Backend  │
                                       │ (Angular)   (.NET 8) │
                                       │ Port 4200   Port 5000│
                                       │    │          │      │
                                       │    └──────────┘      │
                                       │         │            │
                                       │         ▼            │
                                       │    MongoDB          │
                                       │   Port 27017        │
                                       └──────────────────────┘

   HTTPS (SSL via Let's Encrypt)
   / → Angular Frontend
   /api → .NET Backend
```

## 🔐 Security Flow

1. **GitHub Actions** authenticates using:
   - Firebase Token (for Firebase deployment)
   - SSH Private Key (for VPS deployment)

2. **No passwords needed** - all auth is token/key based

3. **SSL/TLS** via Let's Encrypt auto-renewal

## 📁 Project Structure

```
jayant-angular-ui/
├── .github/
│   └── workflows/
│       ├── deploy-portfolio.yml          # Firebase deployment
│       └── deploy-ailearn.yml            # VPS deployment
├── portfolio-ui/                         # Firebase project
│   ├── .firebaserc
│   ├── firebase.json
│   └── dist/
├── angular-starter/                      # AI Learn Frontend
│   ├── src/
│   └── dist/
├── enterprise-dotnet-api/                # AI Learn Backend
│   └── src/AILearnAPI.Api/
├── server-configs/                       # Server configuration files
│   ├── nginx/
│   │   └── learnwithai.tech.conf
│   ├── systemd/
│   │   └── ailearnapi.service
│   └── ssl/
│       └── setup-ssl.sh
└── DEPLOYMENT_ARCHITECTURE.md            # This file
```

## 🔄 Deployment Flow

### Portfolio (Firebase)
```
1. Push code to main branch
2. GitHub Actions detects push in portfolio folder
3. Builds Angular app (ng build --prod)
4. Deploys to Firebase using token
5. Live at your Firebase domain
```

### AI Learn App (VPS)
```
1. Push code to main branch
2. GitHub Actions detects push in angular-starter or enterprise-dotnet-api
3. Builds Frontend and Backend
4. SSHs into VPS using private key
5. Transfers build artifacts
6. Restarts Nginx and API service
7. Live at https://learnwithai.tech
```

## 🎯 Traffic Routing

```
User Request → Nginx (Port 80/443)
                 |
                 ├─ / → Angular Frontend (Port 4200)
                 └─ /api → .NET Backend (Port 5000)
                              |
                              └─ MongoDB (Port 27017)
```

## 🔑 Required Secrets

Store these in GitHub Repository Secrets:

| Secret Name | Purpose | Type |
|------------|---------|------|
| `FIREBASE_TOKEN` | Deploy to Firebase | Token |
| `VPS_SSH_PRIVATE_KEY` | SSH into server | Private Key |
| `VPS_HOST` | Server IP/Domain | String |
| `VPS_USERNAME` | SSH Username | String |
| `MONGODB_CONNECTION_STRING` | Database connection | Connection String |

## 📊 Deployment Triggers

| Branch | Folder Changed | Action |
|--------|---------------|--------|
| `main` | `portfolio-ui/**` | Deploy to Firebase |
| `main` | `angular-starter/**` | Deploy Frontend to VPS |
| `main` | `enterprise-dotnet-api/**` | Deploy Backend to VPS |

## 🛡️ Security Best Practices

1. ✅ SSH Key-based authentication (no passwords)
2. ✅ Secrets stored in GitHub (encrypted)
3. ✅ SSL/TLS certificates auto-renewed
4. ✅ Firewall configured (UFW)
5. ✅ Non-root user for deployments
6. ✅ Systemd service for process management
7. ✅ Nginx rate limiting
8. ✅ CORS properly configured

## 📈 Monitoring & Logs

- **Nginx Logs**: `/var/log/nginx/learnwithai.tech_*.log`
- **API Logs**: `/var/log/ailearnapi/`
- **Systemd Status**: `systemctl status ailearnapi`
- **GitHub Actions**: Repository → Actions tab

## 🔧 Maintenance

### Auto-renewed:
- SSL certificates (via certbot)

### Manual (rare):
- Server OS updates: `apt update && apt upgrade`
- Node.js/npm updates
- .NET SDK updates

## 🚦 Health Check Endpoints

- **Frontend**: `https://learnwithai.tech`
- **Backend**: `https://learnwithai.tech/api/health`
- **API Docs**: `https://learnwithai.tech/api/swagger`

---

Next: Follow `DEPLOYMENT_SETUP_GUIDE.md` for step-by-step implementation.
