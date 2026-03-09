#!/bin/bash

# Deploy Updated MongoDB Configuration
# Run this after MongoDB service is fixed

echo "🚀 Deploying Updated API Configuration with MongoDB Auth"
echo "=========================================================="
echo ""

# 1. Copy updated systemd service file
echo "📝 Step 1: Updating systemd service file..."
sudo cp /tmp/ailearnapi.service /etc/systemd/system/ailearnapi.service
sudo chmod 644 /etc/systemd/system/ailearnapi.service

# 2. Reload systemd
echo "🔄 Step 2: Reloading systemd..."
sudo systemctl daemon-reload

# 3. Restart API service
echo "🔄 Step 3: Restarting API service..."
sudo systemctl restart ailearnapi

# 4. Check status
echo ""
echo "✅ Step 4: Checking service status..."
sleep 2
sudo systemctl status ailearnapi --no-pager | head -n 20

echo ""
echo "📊 Step 5: Checking recent logs..."
sudo journalctl -u ailearnapi -n 30 --no-pager

echo ""
echo "🔍 Step 6: Testing API endpoint..."
sleep 2
curl -s http://localhost:5000/health || curl -s http://localhost:5000/api/health || echo "⚠️  Health endpoint not responding (this may be normal)"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Summary:"
echo "   - MongoDB: mongodb://jbadmin:***@localhost:27017/AILearnDB"
echo "   - API Service: $(systemctl is-active ailearnapi)"
echo "   - API URL: http://localhost:5000"
echo ""
echo "🌐 Test your site: https://learnwithai.tech"
echo ""
