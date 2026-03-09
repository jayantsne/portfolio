#!/bin/bash

# MongoDB Service Fix Script for learnwithai.tech server
# Admin user: jbadmin
# Admin password: PwC$Grow88!Track

echo "🔧 ===== MongoDB Service Fix Script ====="
echo ""

echo "📊 Step 1: Checking MongoDB service status..."
systemctl status mongod --no-pager
echo ""

echo "📝 Step 2: Checking MongoDB logs (last 30 lines)..."
tail -n 30 /var/log/mongodb/mongod.log
echo ""

echo "🔍 Step 3: Checking if MongoDB port is in use..."
netstat -tuln | grep 27017 || echo "Port 27017 is not in use"
echo ""

echo "📁 Step 4: Checking MongoDB data directory permissions..."
ls -lah /var/lib/mongodb | head -n 10
echo ""

echo "🛑 Step 5: Stopping MongoDB service..."
systemctl stop mongod
sleep 2

echo "🔪 Step 6: Killing any remaining MongoDB processes..."
if netstat -tuln | grep -q 27017; then
    echo "⚠️  Port 27017 still in use, killing process..."
    fuser -k 27017/tcp 2>/dev/null || echo "No process to kill"
fi

# Check for mongod processes
if pgrep mongod > /dev/null; then
    echo "⚠️  Found running mongod processes, killing them..."
    pkill -9 mongod
    sleep 2
fi

echo ""
echo "🔐 Step 7: Fixing permissions..."
chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb
chown mongodb:mongodb /tmp/mongodb-27017.sock 2>/dev/null || true
chmod 755 /var/lib/mongodb
chmod 755 /var/log/mongodb
chmod 644 /etc/mongod.conf

echo ""
echo "📝 Step 8: Checking MongoDB configuration..."
echo "Current security settings:"
grep -A 3 "security:" /etc/mongod.conf || echo "No security section found"

echo ""
echo "Current bind IP:"
grep "bindIp:" /etc/mongod.conf

echo ""
echo "🔧 Step 9: Updating MongoDB configuration..."

# Backup config
cp /etc/mongod.conf /etc/mongod.conf.backup.$(date +%Y%m%d%H%M%S)

# Update bind IP to localhost only
sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf

# Enable authentication if not already enabled
if ! grep -q "authorization: enabled" /etc/mongod.conf; then
    echo "🔐 Enabling authentication..."
    # Check if security section exists
    if grep -q "^security:" /etc/mongod.conf; then
        # Security section exists, just add authorization
        sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
    else
        # Add new security section
        echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf
    fi
fi

echo ""
echo "📋 Updated configuration:"
cat /etc/mongod.conf | grep -A 5 "security:"
echo ""
cat /etc/mongod.conf | grep "bindIp:"

echo ""
echo "🚀 Step 10: Starting MongoDB service..."
systemctl start mongod
sleep 3

echo ""
echo "✅ Step 11: Checking service status..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB service is running!"
    systemctl status mongod --no-pager | head -n 15
    
    echo ""
    echo "🔐 Step 12: Testing connection with admin user..."
    if command -v mongosh &> /dev/null; then
        # Using mongosh (newer)
        mongosh --quiet --username jbadmin --password 'PwC$Grow88!Track' --authenticationDatabase admin --eval "print('✅ Admin authentication successful!'); db.adminCommand('listDatabases')" 2>&1
    else
        # Using legacy mongo shell
        mongo --quiet --username jbadmin --password 'PwC$Grow88!Track' --authenticationDatabase admin --eval "print('✅ Admin authentication successful!'); db.adminCommand('listDatabases')" 2>&1
    fi
    
    echo ""
    echo "🔐 Step 13: Listing existing users..."
    if command -v mongosh &> /dev/null; then
        mongosh --quiet --username jbadmin --password 'PwC$Grow88!Track' --authenticationDatabase admin --eval "db.getUsers()" admin 2>&1
    else
        mongo --quiet --username jbadmin --password 'PwC$Grow88!Track' --authenticationDatabase admin --eval "db.getUsers()" admin 2>&1
    fi
    
else
    echo "❌ MongoDB service failed to start!"
    echo ""
    echo "📝 Recent error logs:"
    tail -n 50 /var/log/mongodb/mongod.log
    echo ""
    echo "🔍 Checking system logs:"
    journalctl -u mongod -n 30 --no-pager
    exit 1
fi

echo ""
echo "🔄 Step 14: Enabling MongoDB to start on boot..."
systemctl enable mongod

echo ""
echo "📊 Step 15: Final status check..."
systemctl status mongod --no-pager | head -n 20

echo ""
echo "✅ ===== MongoDB Service Fix Complete! ====="
echo ""
echo "📝 Summary:"
echo "   - MongoDB service: $(systemctl is-active mongod)"
echo "   - Listening on: 127.0.0.1:27017"  
echo "   - Authentication: enabled"
echo "   - Admin user: jbadmin"
echo "   - Config backup: /etc/mongod.conf.backup.*"
echo ""
echo "🔗 Connection string for your app:"
echo "   mongodb://jbadmin:PwC\$Grow88!Track@localhost:27017/AILearnDB?authSource=admin"
echo ""
