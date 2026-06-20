# MongoDB Service Fix Instructions

## Problem
MongoDB service is not starting on server 76.13.244.113

## Solution

### Option 1: Automated Script (Recommended)

The server password will be needed: `<DEPLOY_SSH_PASSWORD>`

**Step 1:** Open PuTTY or your SSH client and connect to:
- Host: `76.13.244.113`
- Username: `root`
- Password: `<DEPLOY_SSH_PASSWORD>`

**Step 2:** Once connected, run these commands:

```bash
# Download the fix script
cat > /tmp/fix-mongodb.sh << 'EOFSCRIPT'
[Content will be pasted when you connect]
EOFSCRIPT

# Or upload via SCP from your local machine:
# scp fix-mongodb.sh root@76.13.244.113:/tmp/

# Make it executable
chmod +x /tmp/fix-mongodb.sh

# Run the script
sudo bash /tmp/fix-mongodb.sh
```

### Option 2: Manual Commands

If you prefer to run commands manually, here's what the script does:

```bash
# 1. Stop MongoDB
sudo systemctl stop mongod
sudo pkill -9 mongod

# 2. Fix permissions
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
sudo chmod 755 /var/lib/mongodb
sudo chmod 644 /etc/mongod.conf

# 3. Update MongoDB config
sudo sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf

# 4. Enable authentication (if not already)
# Edit /etc/mongod.conf and add:
# security:
#   authorization: enabled

# 5. Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 6. Check status
sudo systemctl status mongod

# 7. Test connection
mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

## Expected Result

After running the script, you should see:
- ✅ MongoDB service running
- ✅ Admin user (jbadmin) can authenticate
- ✅ Service enabled to start on boot

## Connection String for Your App

After MongoDB is running, update your .NET API connection string to:

```
mongodb://jbadmin:<MONGODB_PASSWORD>@localhost:27017/AILearnDB?authSource=admin
```

## Troubleshooting

If MongoDB still doesn't start, check:

```bash
# Check logs
sudo tail -f /var/log/mongodb/mongod.log

# Check system logs
sudo journalctl -u mongod -n 50

# Check port availability
sudo netstat -tuln | grep 27017

# Check disk space
df -h
```

## Files Created
- `/tmp/fix-mongodb.sh` - The automated fix script
- `/etc/mongod.conf.backup.*` - Backup of original MongoDB config

