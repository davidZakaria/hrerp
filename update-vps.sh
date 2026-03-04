#!/bin/bash
# Quick update script - run on VPS after git push
# Usage: ssh root@YOUR_VPS_IP "cd /var/www/hr-erp && bash update-vps.sh"
# Or: ssh root@YOUR_VPS_IP, then: cd /var/www/hr-erp && ./update-vps.sh

set -e
echo "=========================================="
echo "HR-ERP VPS Update"
echo "=========================================="

cd /var/www/hr-erp

echo "[1/4] Pulling latest from GitHub..."
git pull origin main

echo "[2/4] Installing backend dependencies..."
npm install --production

echo "[3/4] Building frontend..."
cd hr-erp-frontend
npm install
REACT_APP_API_URL=https://hr-njd.com npm run build
cd ..

echo "[4/4] Restarting backend..."
pm2 restart hr-erp-backend
pm2 save

echo ""
echo "Update complete. Check: pm2 logs hr-erp-backend"
