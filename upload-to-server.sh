#!/bin/bash

# Upload HR ERP to Hostinger VPS
# Usage: ./upload-to-server.sh your-server-ip

if [ -z "$1" ]; then
    echo "❌ Please provide your server IP address"
    echo "Usage: ./upload-to-server.sh your-server-ip"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"  # Change if different
REMOTE_PATH="/var/www/hr-erp"

echo "🚀 Uploading HR ERP to $SERVER_IP..."

# Create remote directory
echo "📁 Creating remote directory..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Upload backend files
echo "📦 Uploading backend files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'hr-erp-frontend/node_modules' \
    --exclude 'hr-erp-frontend/build' \
    --exclude '.git' \
    --exclude '*.log' \
    ./ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

echo "✅ Upload completed!"
echo ""
echo "🔧 Next steps:"
echo "1. SSH into your server: ssh $SERVER_USER@$SERVER_IP"
echo "2. Navigate to the app directory: cd $REMOTE_PATH"
echo "3. Run the deployment script: chmod +x deploy.sh && ./deploy.sh"
echo "4. Configure your domain and SSL certificate"
echo ""
echo "📖 For detailed instructions, see README-DEPLOYMENT.md" 