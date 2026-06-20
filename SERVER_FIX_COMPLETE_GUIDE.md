# Complete Server Fix Instructions

## What's Been Updated

✅ **systemd service file** updated with MongoDB authentication:
- File: `server-configs/systemd/ailearnapi.service`
- New connection string: `mongodb://jbadmin:PwC$$Grow88!Track@localhost:27017/AILearnDB?authSource=admin`

## Step-by-Step Fix Process

### Step 1: Fix MongoDB Service

Connect to your server:
```powershell
ssh root@76.13.244.113
```
Password: `<DEPLOY_SSH_PASSWORD>`

Then run this command:
```bash
systemctl stop mongod && pkill -9 mongod 2>/dev/null && chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb && chmod 755 /var/lib/mongodb && chmod 644 /etc/mongod.conf && cp /etc/mongod.conf /etc/mongod.conf.backup && sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf && (grep -q "authorization: enabled" /etc/mongod.conf || (grep -q "^security:" /etc/mongod.conf && sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf || echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf)) && systemctl start mongod && systemctl enable mongod && sleep 3 && systemctl status mongod
```

Verify MongoDB is running:
```bash
mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

### Step 2: Upload Updated Service File

From your local machine (PowerShell):
```powershell
scp server-configs/systemd/ailearnapi.service root@76.13.244.113:/tmp/
```

### Step 3: Deploy Updated Configuration

On the server:
```bash
sudo cp /tmp/ailearnapi.service /etc/systemd/system/ailearnapi.service
sudo chmod 644 /etc/systemd/system/ailearnapi.service
sudo systemctl daemon-reload
sudo systemctl restart ailearnapi
sudo systemctl status ailearnapi
```

### Step 4: Verify Everything Works

Check all services:
```bash
sudo systemctl status mongod ailearnapi nginx
```

Check API logs:
```bash
sudo journalctl -u ailearnapi -n 50
```

Test the website:
```bash
curl https://learnwithai.tech
```

## Quick Commands Reference

### MongoDB Commands
```bash
# Check status
sudo systemctl status mongod

# View logs
sudo tail -f /var/log/mongodb/mongod.log

# Connect to MongoDB
mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin
```

### API Service Commands
```bash
# Check status
sudo systemctl status ailearnapi

# View logs
sudo journalctl -u ailearnapi -f

# Restart
sudo systemctl restart ailearnapi
```

### Nginx Commands
```bash
# Check status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/learnwithai.tech_error.log
```

## Connection Details

**MongoDB:**
- Host: localhost:27017
- Database: AILearnDB
- Admin User: jbadmin
- Admin Password: <MONGODB_PASSWORD>
- Connection String: `mongodb://jbadmin:<MONGODB_PASSWORD>@localhost:27017/AILearnDB?authSource=admin`

**API:**
- URL: http://localhost:5000
- Public URL: https://learnwithai.tech
- Service: /etc/systemd/system/ailearnapi.service

## Troubleshooting

### MongoDB won't start
```bash
# Check logs
sudo tail -100 /var/log/mongodb/mongod.log
sudo journalctl -u mongod -n 100

# Check disk space
df -h

# Check permissions
ls -lah /var/lib/mongodb
```

### API won't start
```bash
# Check .NET is installed
dotnet --version

# Check if DLL exists
ls -lah /var/www/learnwithai.tech/backend/AILearnAPI.Api.dll

# Check logs
sudo journalctl -u ailearnapi -n 100
```

### Authentication errors
```bash
# List MongoDB users
mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.getUsers()" admin
```

## Files Modified

- ✅ `server-configs/systemd/ailearnapi.service` - Updated MongoDB connection string
- ✅ `fix-mongodb.sh` - MongoDB fix script
- ✅ `deploy-api-config.sh` - API configuration deployment script
- ✅ `mongodb-fix-commands.txt` - Quick reference commands

