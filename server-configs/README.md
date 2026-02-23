# Server Configuration Files

This folder contains all server configuration files for deploying AI Learn App to your VPS.

## 📁 Structure

```
server-configs/
├── nginx/
│   └── learnwithai.tech.conf         # Nginx reverse proxy config
├── systemd/
│   └── ailearnapi.service            # Systemd service for .NET API
├── ssl/
│   └── setup-ssl.sh                  # SSL certificate setup helper
├── initial-setup.sh                  # Complete VPS initial setup script
└── deploy-helper.sh                  # Interactive deployment helper
```

## 🚀 Quick Usage

### Initial Server Setup (Run Once)

```bash
# On your VPS as root
wget https://raw.githubusercontent.com/yourusername/repo/main/server-configs/initial-setup.sh
chmod +x initial-setup.sh
sudo ./initial-setup.sh
```

This installs everything needed:
- Node.js 18
- .NET 8.0 SDK
- Nginx
- MongoDB
- Certbot (SSL)
- Creates deployment user
- Generates SSH keys
- Sets up firewall

### Manual Setup

#### 1. Nginx Configuration

```bash
# Copy config
sudo cp nginx/learnwithai.tech.conf /etc/nginx/sites-available/

# Enable site
sudo ln -s /etc/nginx/sites-available/learnwithai.tech.conf /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 2. Systemd Service

```bash
# Copy service file
sudo cp systemd/ailearnapi.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable ailearnapi

# Start service (after first deployment)
sudo systemctl start ailearnapi
```

#### 3. SSL Certificate

```bash
# Run setup script
sudo bash ssl/setup-ssl.sh
```

Or manually:
```bash
sudo certbot --nginx -d learnwithai.tech -d www.learnwithai.tech
```

## 🔧 Configuration Details

### Nginx (learnwithai.tech.conf)

**Features:**
- HTTP to HTTPS redirect
- Rate limiting (API: 10 req/s, General: 30 req/s)
- Reverse proxy to .NET API (port 5000)
- Static file serving for Angular frontend
- Gzip compression
- Security headers
- Caching policy
- CORS configuration

**Routes:**
- `/` → Angular frontend
- `/api` → .NET backend
- `/swagger` → API documentation

**Logs:**
- Access: `/var/log/nginx/learnwithai.tech_access.log`
- Error: `/var/log/nginx/learnwithai.tech_error.log`

### Systemd Service (ailearnapi.service)

**Features:**
- Auto-restart on failure
- Runs as non-root user
- Production environment
- Journal logging
- Resource limits

**Commands:**
```bash
# Start service
sudo systemctl start ailearnapi

# Stop service
sudo systemctl stop ailearnapi

# Restart service
sudo systemctl restart ailearnapi

# View status
sudo systemctl status ailearnapi

# View logs
sudo journalctl -u ailearnapi -f
```

### SSL Setup (setup-ssl.sh)

**Features:**
- Automatic Let's Encrypt certificate
- HTTPS redirect
- HSTS enabled
- OCSP stapling
- Auto-renewal configured

**Certificate location:**
- Certificate: `/etc/letsencrypt/live/learnwithai.tech/fullchain.pem`
- Private key: `/etc/letsencrypt/live/learnwithai.tech/privkey.pem`

**Renewal:**
- Automatic via systemd timer
- Check: `sudo systemctl status certbot.timer`
- Manual: `sudo certbot renew`

## 🛠️ Helper Script (deploy-helper.sh)

Interactive menu for common tasks:

```bash
bash deploy-helper.sh
```

**Options:**
1. SSH into server
2. Check API status
3. Check Nginx status
4. View API logs
5. View Nginx logs
6. Restart API service
7. Restart Nginx
8. Test API health
9. Check SSL certificate

## 📊 Monitoring

### Check Service Status

```bash
# All services
sudo systemctl status ailearnapi nginx mongod

# Individual
sudo systemctl status ailearnapi
```

### View Logs

```bash
# API logs (real-time)
sudo journalctl -u ailearnapi -f

# Nginx access logs
sudo tail -f /var/log/nginx/learnwithai.tech_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/learnwithai.tech_error.log

# Last 100 API logs
sudo journalctl -u ailearnapi -n 100
```

### Test Endpoints

```bash
# Frontend
curl https://learnwithai.tech

# Backend health
curl https://learnwithai.tech/api/health

# API endpoint
curl https://learnwithai.tech/api/your-endpoint
```

## 🔐 Security

### Firewall Rules

```bash
# Check status
sudo ufw status

# View rules
sudo ufw status numbered
```

**Allowed ports:**
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 5000 (API - internal only)

### SSL/TLS

- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled
- OCSP stapling
- Auto-renewal every 60 days

### Best Practices

1. ✅ Non-root service user
2. ✅ SSH key authentication
3. ✅ Firewall enabled
4. ✅ Rate limiting
5. ✅ Security headers
6. ✅ HTTPS enforced
7. ✅ Auto-updates (certbot)

## 🆘 Troubleshooting

### API Not Starting

```bash
# Check logs
sudo journalctl -u ailearnapi -n 50

# Check port
sudo netstat -tlnp | grep 5000

# Verify files exist
ls -la /var/www/learnwithai.tech/backend/

# Check permissions
sudo chown -R deployuser:deployuser /var/www/learnwithai.tech
```

### Nginx 502 Bad Gateway

```bash
# Check if API is running
curl http://localhost:5000/api/health

# Restart API
sudo systemctl restart ailearnapi

# Check Nginx error log
sudo tail -f /var/log/nginx/learnwithai.tech_error.log
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Test renewal
sudo certbot renew --dry-run
```

### Permission Denied

```bash
# Fix ownership
sudo chown -R deployuser:deployuser /var/www/learnwithai.tech
sudo chown -R deployuser:deployuser /var/log/ailearnapi

# Fix permissions
sudo chmod 755 /var/www/learnwithai.tech
sudo chmod -R 755 /var/www/learnwithai.tech/frontend
sudo chmod -R 755 /var/www/learnwithai.tech/backend
```

## 📝 Customization

### Change Domain

1. Update `learnwithai.tech.conf`: Replace all instances of `learnwithai.tech`
2. Update `ailearnapi.service`: No changes needed
3. Update `deploy-helper.sh`: Update `DOMAIN` variable
4. Re-run SSL setup with new domain

### Change Ports

**Nginx:**
- Edit `learnwithai.tech.conf`
- Update `upstream api_backend` server address
- Restart Nginx

**API:**
- Edit `ailearnapi.service`
- Update `ASPNETCORE_URLS` environment variable
- Restart service

### Rate Limiting

Edit `learnwithai.tech.conf`:

```nginx
# Adjust these values
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```

## 🔄 Updates

### Update .NET App

GitHub Actions handles this automatically. Manual:

```bash
# Build locally
cd enterprise-dotnet-api
dotnet publish -c Release -o ./publish

# Upload to server
rsync -avz ./publish/ deployuser@76.13.244.113:/var/www/learnwithai.tech/backend/

# Restart service
ssh deployuser@76.13.244.113 "sudo systemctl restart ailearnapi"
```

### Update Nginx Config

```bash
# Edit config
sudo nano /etc/nginx/sites-available/learnwithai.tech.conf

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Update Systemd Service

```bash
# Edit service
sudo nano /etc/systemd/system/ailearnapi.service

# Reload daemon
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart ailearnapi
```

---

For complete deployment guide, see [DEPLOYMENT_SETUP_GUIDE.md](../DEPLOYMENT_SETUP_GUIDE.md)
