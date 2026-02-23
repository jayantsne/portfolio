#!/bin/bash

# ============================================
# VPS Deployment Helper Script
# Quick commands for server management
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Server details (update these)
VPS_HOST="76.13.244.113"
VPS_USER="deployuser"
DOMAIN="learnwithai.tech"

function show_menu() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  VPS Deployment Helper${NC}"
    echo -e "${GREEN}  Server: ${VPS_HOST}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "1. SSH into server"
    echo "2. Check API status"
    echo "3. Check Nginx status"
    echo "4. View API logs"
    echo "5. View Nginx logs"
    echo "6. Restart API service"
    echo "7. Restart Nginx"
    echo "8. Test API health"
    echo "9. Check SSL certificate"
    echo "10. Exit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1) ssh_connect ;;
        2) check_api ;;
        3) check_nginx ;;
        4) view_api_logs ;;
        5) view_nginx_logs ;;
        6) restart_api ;;
        7) restart_nginx ;;
        8) test_api ;;
        9) check_ssl ;;
        10) exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}"; show_menu ;;
    esac
}

function ssh_connect() {
    echo -e "${YELLOW}Connecting to $VPS_HOST...${NC}"
    ssh $VPS_USER@$VPS_HOST
}

function check_api() {
    echo -e "${YELLOW}Checking API service status...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo systemctl status ailearnapi --no-pager"
    show_menu
}

function check_nginx() {
    echo -e "${YELLOW}Checking Nginx status...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo systemctl status nginx --no-pager"
    show_menu
}

function view_api_logs() {
    echo -e "${YELLOW}Showing last 50 lines of API logs...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo journalctl -u ailearnapi -n 50 --no-pager"
    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function view_nginx_logs() {
    echo -e "${YELLOW}Showing Nginx access logs...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo tail -n 50 /var/log/nginx/learnwithai.tech_access.log"
    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function restart_api() {
    echo -e "${YELLOW}Restarting API service...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo systemctl restart ailearnapi && echo '✓ API restarted' && sudo systemctl status ailearnapi --no-pager | head -10"
    show_menu
}

function restart_nginx() {
    echo -e "${YELLOW}Restarting Nginx...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo systemctl restart nginx && echo '✓ Nginx restarted'"
    show_menu
}

function test_api() {
    echo -e "${YELLOW}Testing API health endpoint...${NC}"
    curl -s https://$DOMAIN/api/health | jq . || curl -s https://$DOMAIN/api/health
    echo ""
    show_menu
}

function check_ssl() {
    echo -e "${YELLOW}Checking SSL certificate...${NC}"
    ssh $VPS_USER@$VPS_HOST "sudo certbot certificates"
    show_menu
}

# Main
show_menu
