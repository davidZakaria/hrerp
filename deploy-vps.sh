#!/bin/bash
# =============================================================================
# HR-ERP VPS Deployment Script
# Domain: hr-njd.com
# Hostinger KVM 2 VPS
# =============================================================================

set -e  # Exit on error

echo "=========================================="
echo "HR-ERP Deployment Script"
echo "Domain: hr-njd.com"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# =============================================================================
# STEP 1: System Update
# =============================================================================
echo ""
echo "=========================================="
echo "Step 1: Updating System"
echo "=========================================="

apt update && apt upgrade -y
apt install -y curl wget git ufw htop gnupg
print_status "System updated"

# =============================================================================
# STEP 2: Install Node.js 18.x
# =============================================================================
echo ""
echo "=========================================="
echo "Step 2: Installing Node.js 18.x"
echo "=========================================="

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    print_status "Node.js installed: $(node --version)"
else
    print_warning "Node.js already installed: $(node --version)"
fi

# =============================================================================
# STEP 3: Install MongoDB 7.0
# =============================================================================
echo ""
echo "=========================================="
echo "Step 3: Installing MongoDB 7.0"
echo "=========================================="

if ! command -v mongod &> /dev/null; then
    # Import MongoDB GPG key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Add MongoDB repository (Ubuntu 22.04 - jammy)
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    apt update
    apt install -y mongodb-org
    
    print_status "MongoDB installed"
else
    print_warning "MongoDB already installed"
fi

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
print_status "MongoDB service started and enabled"

# =============================================================================
# STEP 4: Optimize MongoDB for VPS (8GB RAM)
# =============================================================================
echo ""
echo "=========================================="
echo "Step 4: Optimizing MongoDB for VPS"
echo "=========================================="

# Backup original config
cp /etc/mongod.conf /etc/mongod.conf.backup

# Create optimized MongoDB config
cat > /etc/mongod.conf << 'MONGOCONF'
# MongoDB configuration for Hostinger KVM 2 VPS (8GB RAM)
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1.5

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
MONGOCONF

systemctl restart mongod
print_status "MongoDB optimized with 1.5GB cache limit"

# =============================================================================
# STEP 5: Install Nginx
# =============================================================================
echo ""
echo "=========================================="
echo "Step 5: Installing Nginx"
echo "=========================================="

if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    print_status "Nginx installed"
else
    print_warning "Nginx already installed"
fi

systemctl start nginx
systemctl enable nginx
print_status "Nginx service started and enabled"

# =============================================================================
# STEP 6: Install PM2
# =============================================================================
echo ""
echo "=========================================="
echo "Step 6: Installing PM2"
echo "=========================================="

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_status "PM2 installed"
else
    print_warning "PM2 already installed"
fi

# =============================================================================
# STEP 7: Setup Application Directory
# =============================================================================
echo ""
echo "=========================================="
echo "Step 7: Setting up Application"
echo "=========================================="

APP_DIR="/var/www/hr-erp"

if [ ! -d "$APP_DIR" ]; then
    mkdir -p /var/www
    print_warning "Please upload your application to $APP_DIR"
    print_warning "Use: scp -r ./hr-erp root@YOUR_VPS_IP:/var/www/"
else
    print_status "Application directory exists at $APP_DIR"
    
    cd $APP_DIR
    
    # Install backend dependencies
    if [ -f "package.json" ]; then
        npm install --production
        print_status "Backend dependencies installed"
    fi
    
    # Install frontend dependencies and build if needed
    if [ -d "hr-erp-frontend" ]; then
        cd hr-erp-frontend
        if [ ! -d "build" ]; then
            npm install
            npm run build
            print_status "Frontend built"
        else
            print_status "Frontend build already exists"
        fi
        cd ..
    fi
    
    # Copy production env if exists
    if [ -f ".env.production" ] && [ ! -f ".env" ]; then
        cp .env.production .env
        print_status "Production .env file configured"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Start application with PM2
    pm2 delete hr-erp-backend 2>/dev/null || true
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup systemd -u root --hp /root
    print_status "Application started with PM2"
fi

# =============================================================================
# STEP 8: Configure Nginx
# =============================================================================
echo ""
echo "=========================================="
echo "Step 8: Configuring Nginx"
echo "=========================================="

if [ -f "$APP_DIR/nginx.conf" ]; then
    cp $APP_DIR/nginx.conf /etc/nginx/sites-available/hr-erp
    ln -sf /etc/nginx/sites-available/hr-erp /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t && systemctl restart nginx
    print_status "Nginx configured for hr-njd.com"
else
    print_warning "nginx.conf not found in $APP_DIR"
fi

# =============================================================================
# STEP 9: Configure Firewall
# =============================================================================
echo ""
echo "=========================================="
echo "Step 9: Configuring Firewall"
echo "=========================================="

ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
print_status "Firewall configured (SSH + Nginx)"

# =============================================================================
# STEP 10: SSL Certificate
# =============================================================================
echo ""
echo "=========================================="
echo "Step 10: SSL Certificate Setup"
echo "=========================================="

print_warning "Before running SSL setup, make sure your domain DNS is pointing to this server!"
print_warning ""
print_warning "To install SSL certificate, run:"
print_warning "  apt install -y certbot python3-certbot-nginx"
print_warning "  certbot --nginx -d hr-njd.com -d www.hr-njd.com"

# =============================================================================
# STEP 11: Create Super Admin
# =============================================================================
echo ""
echo "=========================================="
echo "Step 11: Create Super Admin"
echo "=========================================="

if [ -f "$APP_DIR/scripts/createSuperAdmin.js" ]; then
    print_warning "To create super admin, run:"
    print_warning "  cd $APP_DIR && node scripts/createSuperAdmin.js"
fi

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================
echo ""
echo "=========================================="
echo "DEPLOYMENT SUMMARY"
echo "=========================================="
print_status "System updated"
print_status "Node.js: $(node --version)"
print_status "MongoDB: running on port 27017"
print_status "Nginx: configured"
print_status "PM2: application managed"
print_status "Firewall: enabled"

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo "1. Point your domain DNS (hr-njd.com) to this server's IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Install SSL certificate:"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d hr-njd.com -d www.hr-njd.com"
echo "4. Create super admin:"
echo "   cd /var/www/hr-erp && node scripts/createSuperAdmin.js"
echo ""
echo "=========================================="
echo "USEFUL COMMANDS"
echo "=========================================="
echo "Check app status:    pm2 status"
echo "View app logs:       pm2 logs hr-erp-backend"
echo "Restart app:         pm2 restart hr-erp-backend"
echo "Check MongoDB:       systemctl status mongod"
echo "Check Nginx:         systemctl status nginx"
echo "Monitor resources:   htop"
echo ""
