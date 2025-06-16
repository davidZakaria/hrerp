#!/bin/bash

# HR ERP Deployment Script for Hostinger KVM2
echo "🚀 Starting HR ERP deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
echo "📦 Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/hr-erp
sudo chown -R $USER:$USER /var/www/hr-erp

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /var/www/hr-erp
npm install

# Create MongoDB super admin user
echo "👤 Creating super admin user..."
node createSuperAdmin.js

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Your application should be running on port 5000"
echo "📝 Don't forget to configure Nginx and SSL!" 