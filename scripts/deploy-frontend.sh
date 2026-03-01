#!/bin/bash
# =============================================================================
# deploy-frontend.sh
# Builds the Angular app and deploys it to the Nginx web root.
# Triggered by the Admin → Deployment panel (localhost only, ADMIN role).
#
# Customize the variables below for your environment.
# =============================================================================
set -euo pipefail

REPO_DIR="/opt/src/jayant-angular-ui"
ANGULAR_DIR="$REPO_DIR/angular-starter"
WEB_ROOT="/var/www/jayant-ui"
NGINX_SERVICE="nginx"

echo "============================================="
echo " JAYANT PORTFOLIO — FRONTEND DEPLOYMENT"
echo " Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================="

echo ""
echo ">>> [1/5] Pulling latest code from git..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main
echo "    OK — HEAD: $(git rev-parse --short HEAD)"

echo ""
echo ">>> [2/5] Installing Node.js dependencies..."
cd "$ANGULAR_DIR"
npm ci --prefer-offline
echo "    OK"

echo ""
echo ">>> [3/5] Building Angular production bundle..."
npx ng build --configuration production
echo "    OK"

echo ""
echo ">>> [4/5] Deploying dist/ to $WEB_ROOT..."
rm -rf "$WEB_ROOT"
mkdir -p "$WEB_ROOT"
cp -r "$ANGULAR_DIR/dist/angular-starter/." "$WEB_ROOT/"
echo "    OK"

echo ""
echo ">>> [5/5] Reloading Nginx..."
sudo systemctl reload "$NGINX_SERVICE"
STATUS=$(systemctl is-active "$NGINX_SERVICE")
echo "    Nginx status: $STATUS"

if [ "$STATUS" != "active" ]; then
  echo "ERROR: Nginx is not running."
  sudo nginx -t
  exit 1
fi

echo ""
echo "============================================="
echo " FRONTEND DEPLOYMENT COMPLETE — SUCCESS"
echo " Finished: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================="
