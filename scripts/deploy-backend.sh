#!/bin/bash
# =============================================================================
# deploy-backend.sh
# Deploys the ASP.NET Core API to the production server.
# Triggered by the Admin → Deployment panel (localhost only, ADMIN role).
#
# Customize the variables below for your environment.
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/jayant-api"
REPO_DIR="/opt/src/jayant-angular-ui"
PUBLISH_DIR="$APP_DIR/publish"
SERVICE_NAME="jayant-api"
DOTNET_PROJ="enterprise-dotnet-api/src/AILearnAPI.Api/AILearnAPI.Api.csproj"

echo "============================================="
echo " JAYANT PORTFOLIO — BACKEND DEPLOYMENT"
echo " Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================="

echo ""
echo ">>> [1/5] Pulling latest code from git..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main
echo "    OK — HEAD: $(git rev-parse --short HEAD)"

echo ""
echo ">>> [2/5] Restoring NuGet packages..."
dotnet restore "$DOTNET_PROJ"
echo "    OK"

echo ""
echo ">>> [3/5] Building release artefacts..."
rm -rf "$PUBLISH_DIR"
dotnet publish "$DOTNET_PROJ" \
    --configuration Release \
    --output "$PUBLISH_DIR" \
    --no-restore
echo "    OK"

echo ""
echo ">>> [4/5] Deploying files to $APP_DIR..."
rsync -a --delete "$PUBLISH_DIR/" "$APP_DIR/"
echo "    OK"

echo ""
echo ">>> [5/5] Restarting systemd service '$SERVICE_NAME'..."
sudo systemctl restart "$SERVICE_NAME"
sleep 2
STATUS=$(systemctl is-active "$SERVICE_NAME")
echo "    Service status: $STATUS"

if [ "$STATUS" != "active" ]; then
  echo "ERROR: Service did not start successfully."
  sudo journalctl -u "$SERVICE_NAME" -n 30 --no-pager
  exit 1
fi

echo ""
echo "============================================="
echo " BACKEND DEPLOYMENT COMPLETE — SUCCESS"
echo " Finished: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "============================================="
