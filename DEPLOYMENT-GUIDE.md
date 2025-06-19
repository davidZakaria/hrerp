# 🚀 Complete Hostinger Deployment Guide for HR-ERP System

## 📋 Prerequisites

Before starting the deployment, ensure you have:

1. **Hostinger KVM2 VPS** (recommended: 2GB RAM, 2 CPU cores)
2. **SSH access** to your VPS
3. **Domain name** (optional but recommended)
4. **Local development environment** with the project ready

## 🔧 Step 1: Prepare Your Local Environment

### 1.1 Build the Frontend

First, build the React frontend for production:

```bash
# Navigate to frontend directory
cd hr-erp-frontend

# Install dependencies (if not already installed)
npm install

# Build for production
npm run build
```

This creates a `build` folder with optimized production files.

### 1.2 Configure Environment Variables

Copy the example environment file:

```bash
cp env.production.example .env
```

Update the `.env` file with your specific configuration:

```env
NODE_ENV=production
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/hr-erp

# JWT Secret - Generate a strong random string
JWT_SECRET=your-super-secret-jwt-key-make-it-very-long-and-random-123456789

# Application Configuration
FRONTEND_URL=http://your-domain.com
BACKEND_URL=http://your-domain.com/api

# Security
CORS_ORIGIN=http://your-domain.com,https://your-domain.com
```

**⚠️ Important**: Generate a strong JWT secret using:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🚀 Step 2: Upload to Hostinger VPS

### 2.1 Upload Files

Make the upload script executable and run it:

```bash
chmod +x upload-to-server.sh
./upload-to-server.sh YOUR_SERVER_IP
```

Replace `YOUR_SERVER_IP` with your actual Hostinger VPS IP address.

### 2.2 Alternative: Git Upload

If you prefer using Git:

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Clone your repository
git clone https://github.com/your-username/your-repo.git /var/www/hr-erp
cd /var/www/hr-erp

# If using private repo, set up SSH keys or use HTTPS with credentials
```

## 🔧 Step 3: Server Setup and Deployment

### 3.1 SSH into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

### 3.2 Navigate to Application Directory

```bash
cd /var/www/hr-erp
```

### 3.3 Run the Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Update system packages
- Install Node.js 18.x
- Install MongoDB
- Install Nginx
- Install PM2
- Install project dependencies
- Start MongoDB service

### 3.4 Build Frontend (if not done locally)

```bash
cd hr-erp-frontend
npm install
npm run build
cd ..
```

## ⚙️ Step 4: Configure Environment

### 4.1 Create Production Environment File

```bash
cp env.production.example .env
nano .env
```

Update the configuration:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hr-erp
JWT_SECRET=your-generated-secure-jwt-secret
FRONTEND_URL=http://your-domain.com
BACKEND_URL=http://your-domain.com/api
CORS_ORIGIN=http://your-domain.com,https://your-domain.com
```

### 4.2 Create Super Admin User

```bash
node createSuperAdmin.js
```

This creates a super admin with credentials:
- **Email**: `superadmin@company.com`
- **Password**: `SuperAdmin123!`

**⚠️ Change these credentials immediately after first login!**

## 🚀 Step 5: Start the Application

### 5.1 Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5.2 Verify Application is Running

```bash
pm2 status
pm2 logs hr-erp-backend
```

Test the backend:
```bash
curl http://localhost:5000/api/health
```

## 🌐 Step 6: Configure Nginx

### 6.1 Update Nginx Configuration

```bash
nano nginx.conf
```

Replace `your-domain.com` with your actual domain or use your server IP:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # Or use your server IP: server_name YOUR_SERVER_IP;
    
    # ... rest of the configuration
}
```

### 6.2 Enable Nginx Site

```bash
sudo cp nginx.conf /etc/nginx/sites-available/hr-erp
sudo ln -s /etc/nginx/sites-available/hr-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 6.3 Test and Restart Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Step 7: Configure Firewall

### 7.1 Enable UFW and Configure Ports

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## 🔒 Step 8: SSL Certificate (Recommended)

### 8.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🎯 Step 9: Final Verification

### 9.1 Check All Services

```bash
# Check PM2
pm2 status

# Check MongoDB
sudo systemctl status mongod

# Check Nginx
sudo systemctl status nginx

# Check application logs
pm2 logs hr-erp-backend
```

### 9.2 Test the Application

Visit your application:
- **Frontend**: `http://your-domain.com` or `http://YOUR_SERVER_IP`
- **API Health**: `http://your-domain.com/api/health`

## 🔧 Troubleshooting

### Common Issues and Solutions

**1. MongoDB Connection Issues**
```bash
sudo systemctl status mongod
sudo systemctl start mongod
sudo systemctl enable mongod
```

**2. Node.js Application Not Starting**
```bash
pm2 logs hr-erp-backend
pm2 restart hr-erp-backend
```

**3. Nginx Configuration Errors**
```bash
sudo nginx -t
sudo systemctl status nginx
```

**4. Port Already in Use**
```bash
sudo netstat -tlnp | grep :5000
sudo kill -9 PID_NUMBER
```

**5. Frontend Not Loading**
```bash
# Check if build folder exists
ls -la hr-erp-frontend/build/
# Rebuild if necessary
cd hr-erp-frontend && npm run build
```

### Useful Commands

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs hr-erp-backend --lines 50

# Restart application
pm2 restart hr-erp-backend

# Check disk space
df -h

# Check memory usage
free -h

# Check system resources
htop
```

## 📊 Performance Optimization

### 9.1 Enable Gzip Compression (Already in nginx.conf)

### 9.2 Monitor Resources

```bash
# Install htop for monitoring
sudo apt install htop

# Monitor PM2 processes
pm2 monit
```

### 9.3 Set Up Log Rotation

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🔄 Regular Maintenance

### Daily Tasks
- Check application logs: `pm2 logs hr-erp-backend`
- Monitor system resources: `htop`

### Weekly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Check disk space: `df -h`
- Review application logs for errors

### Monthly Tasks
- Backup database: `mongodump --out /backup/$(date +%Y%m%d)`
- Review security logs
- Update SSL certificates if needed

## ✅ Deployment Complete!

Your HR-ERP system should now be running on:
- **Frontend**: `http://your-domain.com` or `http://YOUR_SERVER_IP`
- **Backend API**: `http://your-domain.com/api`

### Default Login Credentials
- **Email**: `superadmin@company.com`
- **Password**: `SuperAdmin123!`

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs: `pm2 logs hr-erp-backend`
3. Verify all services are running
4. Check Hostinger support documentation

---

**🎉 Congratulations! Your HR-ERP system is now live on Hostinger!** 