# MongoDB Service Fix Script
# Server: 76.13.244.113
# Run this script to fix MongoDB service issues

$serverIP = "76.13.244.113"
$username = "root"
$password = "<DEPLOY_SSH_PASSWORD>"

Write-Host "🔧 MongoDB Service Fix Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Commands to run on server
$commands = @"
#!/bin/bash
echo "📊 Checking MongoDB service status..."
systemctl status mongod

echo ""
echo "📝 Checking MongoDB logs..."
tail -n 50 /var/log/mongodb/mongod.log

echo ""
echo "🔍 Checking if MongoDB port is in use..."
netstat -tuln | grep 27017

echo ""
echo "📁 Checking MongoDB data directory..."
ls -lah /var/lib/mongodb

echo ""
echo "🔐 Checking MongoDB config..."
cat /etc/mongod.conf | grep -A 5 "security:"

echo ""
echo "🔧 Fixing MongoDB service..."

# Stop MongoDB if running
systemctl stop mongod

# Check if port is still in use
if netstat -tuln | grep -q 27017; then
    echo "⚠️  Port 27017 still in use, killing process..."
    fuser -k 27017/tcp
fi

# Fix permissions
echo "🔐 Fixing permissions..."
chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb
chmod 755 /var/lib/mongodb
chmod 644 /etc/mongod.conf

# Enable auth in MongoDB config if not already enabled
if ! grep -q "^  authorization: enabled" /etc/mongod.conf; then
    echo "🔐 Enabling authentication in MongoDB config..."
    sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
fi

# Ensure bind IP allows connections
sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf

# Start MongoDB
echo "🚀 Starting MongoDB service..."
systemctl start mongod

# Check status
sleep 3
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB service started successfully!"
    systemctl status mongod
    
    echo ""
    echo "🔐 Testing admin user connection..."
    mongosh --username jbadmin --password '<MONGODB_PASSWORD>' --authenticationDatabase admin --eval "db.adminCommand('ping')"
    
else
    echo "❌ MongoDB service failed to start!"
    echo "📝 Recent logs:"
    tail -n 100 /var/log/mongodb/mongod.log
fi

# Enable MongoDB to start on boot
systemctl enable mongod

echo ""
echo "📊 Final status:"
systemctl status mongod --no-pager
"@

# Save commands to temp file
$tempScript = "/tmp/fix-mongodb-$(Get-Date -Format 'yyyyMMddHHmmss').sh"

Write-Host "📋 Preparing fix script..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🔌 Connecting to server: $serverIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  NOTE: You'll need to manually paste the password when prompted:" -ForegroundColor Red
Write-Host "   Password: $password" -ForegroundColor Green
Write-Host ""

# Create the script on server
Write-Host "Creating fix script on server..." -ForegroundColor Yellow
$commands | ssh "$username@$serverIP" "cat > $tempScript && chmod +x $tempScript"

Write-Host ""
Write-Host "🚀 Executing fix script..." -ForegroundColor Yellow
ssh "$username@$serverIP" "bash $tempScript"

Write-Host ""
Write-Host "✅ Script execution complete!" -ForegroundColor Green
