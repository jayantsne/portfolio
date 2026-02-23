#!/bin/bash

# ============================================
# SSL Certificate Setup Script
# Uses Let's Encrypt via Certbot
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="learnwithai.tech"
EMAIL="your-email@example.com"  # Change this!
WEBROOT="/var/www/learnwithai.tech"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Certificate Setup${NC}"
echo -e "${GREEN}  Domain: ${DOMAIN}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Use: sudo bash setup-ssl.sh"
    exit 1
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Create webroot directory if it doesn't exist
mkdir -p $WEBROOT
echo -e "${GREEN}✓ Webroot directory ready${NC}"

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Nginx configuration test failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Nginx configuration valid${NC}"

# Obtain SSL certificate
echo ""
echo -e "${YELLOW}Obtaining SSL certificate from Let's Encrypt...${NC}"
echo -e "${YELLOW}You may be prompted to answer a few questions.${NC}"
echo ""

certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --redirect \
    --hsts \
    --staple-ocsp

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ SSL Certificate Installed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Certificate: ${GREEN}/etc/letsencrypt/live/$DOMAIN/fullchain.pem${NC}"
    echo -e "Private Key: ${GREEN}/etc/letsencrypt/live/$DOMAIN/privkey.pem${NC}"
    echo ""
    echo -e "Site: ${GREEN}https://$DOMAIN${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ SSL Installation Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Common issues:"
    echo "1. Domain not pointing to this server"
    echo "2. Firewall blocking port 80/443"
    echo "3. Another process using port 80"
    echo ""
    exit 1
fi

# Test auto-renewal
echo -e "${YELLOW}Testing certificate auto-renewal...${NC}"
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Auto-renewal test successful${NC}"
else
    echo -e "${YELLOW}⚠ Auto-renewal test failed - certificates may not renew automatically${NC}"
fi

# Display renewal timer status
echo ""
echo -e "${YELLOW}Certbot renewal timer status:${NC}"
systemctl status certbot.timer --no-pager | grep -E "(Active|Loaded)"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Visit https://$DOMAIN to verify SSL is working"
echo "2. Certificates will auto-renew every 60 days"
echo "3. Monitor renewal: sudo systemctl status certbot.timer"
echo ""
