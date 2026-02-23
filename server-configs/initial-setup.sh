#!/bin/bash

# ============================================
# Initial VPS Server Setup Script
# One-time setup for deployment environment
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VPS Initial Setup for Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Use: sudo bash initial-setup.sh"
    exit 1
fi

# Create deployment user
echo -e "${YELLOW}Creating deployment user...${NC}"
if id "deployuser" &>/dev/null; then
    echo -e "${GREEN}✓ deployuser already exists${NC}"
else
    adduser --disabled-password --gecos "" deployuser
    usermod -aG sudo deployuser
    echo -e "${GREEN}✓ deployuser created${NC}"
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"

# Install Node.js
echo -e "${YELLOW}Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
echo -e "${GREEN}✓ Node.js $(node --version) installed${NC}"

# Install .NNET 8.0 SDK
echo -e "${YELLOW}Installing .NET 8.0 SDK...${NC}"
wget -q https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
apt update
apt install -y dotnet-sdk-8.0
rm packages-microsoft-prod.deb
echo -e "${GREEN}✓ .NET $(dotnet --version) installed${NC}"

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
apt install -y nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed${NC}"

# Install MongoDB
echo -e "${YELLOW}Installing MongoDB...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
echo -e "${GREEN}✓ MongoDB installed${NC}"

# Install Certbot for SSL
echo -e "${YELLOW}Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot installed${NC}"

# Create directory structure
echo -e "${YELLOW}Creating application directories...${NC}"
mkdir -p /var/www/learnwithai.tech/frontend
mkdir -p /var/www/learnwithai.tech/backend
mkdir -p /var/log/ailearnapi
chown -R deployuser:deployuser /var/www/learnwithai.tech
chown -R deployuser:deployuser /var/log/ailearnapi
echo -e "${GREEN}✓ Directories created${NC}"

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5000
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"

# Generate SSH key for GitHub Actions
echo -e "${YELLOW}Generating SSH key for deployments...${NC}"
su - deployuser -c "ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github_deploy -N ''"
su - deployuser -c "cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys"
su - deployuser -c "chmod 600 ~/.ssh/authorized_keys"
echo -e "${GREEN}✓ SSH key generated${NC}"

# Display summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installed software:"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • .NET: $(dotnet --version)"
echo "  • Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "  • MongoDB: $(mongod --version | head -1 | cut -d' ' -f3)"
echo ""
echo -e "${YELLOW}IMPORTANT: Copy this SSH private key for GitHub Secrets${NC}"
echo -e "${YELLOW}(Secret name: VPS_SSH_PRIVATE_KEY)${NC}"
echo ""
su - deployuser -c "cat ~/.ssh/github_deploy"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Copy the SSH private key above to GitHub Secrets"
echo "2. Update Nginx config: /etc/nginx/sites-available/learnwithai.tech"
echo "3. Setup SSL: sudo certbot --nginx -d learnwithai.tech"
echo "4. Setup systemd service: /etc/systemd/system/ailearnapi.service"
echo "5. Push to GitHub to trigger first deployment"
echo ""
echo "Useful commands:"
echo "  • Check services: sudo systemctl status ailearnapi nginx mongod"
echo "  • View logs: sudo journalctl -u ailearnapi -f"
echo "  • Switch to deploy user: su - deployuser"
echo ""
