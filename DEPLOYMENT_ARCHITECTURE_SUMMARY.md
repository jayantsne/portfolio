# 🚀 Deployment Architecture

## Your 3 Separate Deployments

### 1. 📁 Portfolio (Firebase)
- **URL**: https://myportfolioadmin-d45bd.web.app
- **Content**: Portfolio website (MainPortfolioComponent)
- **Access**: http://localhost:4200/portfolio (when running locally)
- **Status**: ✅ LIVE
- **Features**:
  - Professional portfolio showcase
  - Project gallery
  - About section
  - Contact information

### 2. 🎓 AI Learn App Frontend (VPS)
- **URLs**: 
  - http://learnwithai.tech (Primary)
  - http://76.13.244.113 (Direct IP)
- **Content**: AI-powered learning platform
- **Default Route**: `/ai-qa` (AI Learn App home)
- **Status**: ✅ LIVE
- **Features**:
  - `/` → AI Learn App (default)
  - `/ai-qa` → AI Q&A Interface
  - `/questions` → Public questions browser
  - `/login` → Admin login
  - `/admin` → Interview questions management (protected)
  - `/auth-management` → User management (protected)
  - `/namespaces` → Database namespaces (protected)
  - `/portfolio` → Portfolio view (secondary)

### 3. 🔧 Backend API (VPS)
- **URL**: http://learnwithai.tech/api
- **Status**: ⏳ PENDING (Source code recovery needed)
- **Stack**: .NET 8.0 Web API
- **Database**: MongoDB Atlas
- **Configuration**: 
  - Port: 5000 (internal)
  - Proxied via Nginx at `/api/`
  - MongoDB: `mongodb+srv://jayantjain062:***@cluster0.mongodb.net/AILearnDB`

---

## 📊 Deployment Summary

| Deployment | Platform | URL | Status | Purpose |
|------------|----------|-----|--------|---------|
| Portfolio | Firebase | myportfolioadmin-d45bd.web.app | ✅ LIVE | Professional showcase |
| AI Learn Frontend | VPS | learnwithai.tech | ✅ LIVE | Learning platform |
| Backend API | VPS | learnwithai.tech/api | ⏳ PENDING | API services |

---

## 🔄 Deployment Commands

### Deploy AI Learn Frontend to VPS
```powershell
cd d:\folio\jayant-angular-ui\angular-starter
npm run build -- --configuration production
cd ..
.\deploy-scp.ps1
```

### Deploy Portfolio to Firebase
```powershell
cd d:\folio\jayant-angular-ui\angular-starter
npm run build -- --configuration production
firebase deploy --only hosting
```

### Deploy Backend (When recovered)
```powershell
cd d:\folio\jayant-angular-ui\enterprise-dotnet-api
dotnet publish -c Release
# Then deploy via GitHub Actions or manual SCP
```

---

## 🌐 DNS Configuration

**learnwithai.tech** DNS Records:
- ✅ A Record: `@` → `76.13.244.113`
- ✅ CNAME: `www` → `learnwithai.tech`
- ✅ Status: Propagated and LIVE

---

## 🔐 SSL/HTTPS Setup (Optional Next Step)

To enable HTTPS on learnwithai.tech:
```bash
ssh root@76.13.244.113
# Password: <DEPLOY_SSH_PASSWORD>
certbot --nginx -d learnwithai.tech -d www.learnwithai.tech --non-interactive --agree-tos -m your@email.com
```

---

## 📝 Environment Configuration

**Production (VPS)**:
- API URL: `http://learnwithai.tech/api`
- Default Route: AI Learn App (`/ai-qa`)

**Development (Local)**:
- API URL: `http://localhost:5000`
- Access all routes at `http://localhost:4200`

---

## 🎯 Next Steps

1. ✅ **AI Learn Frontend** - DEPLOYED
2. ✅ **Portfolio** - DEPLOYED
3. ⏳ **Recover Backend Source Code**
   - Check local backups
   - Restore from Visual Studio .vs folder
   - Or recreate API from scratch
4. 🔒 **Enable HTTPS** (run certbot command above)
5. 🤖 **Setup GitHub Actions** (already configured, will auto-deploy on push)

---

## 📞 Quick Links

- **AI Learn App**: http://learnwithai.tech
- **Portfolio**: https://myportfolioadmin-d45bd.web.app  
- **GitHub Repo**: https://github.com/jayantbhardwaj199/jayant-angular-ui
- **VPS IP**: 76.13.244.113

---

**Last Updated**: February 24, 2026  
**Deployment Status**: Frontend LIVE | Backend PENDING
