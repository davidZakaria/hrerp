# 📋 HR ERP Deployment Checklist for Hostinger KVM2

## ✅ Pre-Deployment Checklist

### Local Preparation
- [ ] Production build created (`npm run build` in hr-erp-frontend)
- [ ] All deployment files created (ecosystem.config.js, deploy.sh, nginx.conf)
- [ ] Environment variables configured
- [ ] Application tested locally

### Hostinger VPS Setup
- [ ] KVM2 VPS subscription active
- [ ] SSH access credentials obtained
- [ ] Domain name configured (optional)
- [ ] DNS records pointed to VPS IP

## 🚀 Deployment Steps

### Step 1: Access Your VPS
- [ ] SSH connection established: `ssh root@your-server-ip`
- [ ] Server accessible and responsive

### Step 2: Upload Application
Choose one method:

**Option A: Direct Upload**
- [ ] Files uploaded using: `./upload-to-server.sh your-server-ip`
- [ ] All files transferred successfully

**Option B: Git Repository**
- [ ] Repository cloned to `/var/www/hr-erp`
- [ ] Latest code pulled

### Step 3: Run Deployment Script
- [ ] Script made executable: `chmod +x deploy.sh`
- [ ] Deployment script executed: `./deploy.sh`
- [ ] All dependencies installed successfully
- [ ] MongoDB installed and running
- [ ] Node.js and PM2 installed

### Step 4: Configure Environment
- [ ] Environment file created: `cp env.production.example .env`
- [ ] JWT_SECRET changed to secure random string
- [ ] MongoDB URI configured
- [ ] All environment variables set

### Step 5: Start Application
- [ ] PM2 process started: `pm2 start ecosystem.config.js --env production`
- [ ] Application running on port 5000
- [ ] PM2 startup configured: `pm2 startup` and `pm2 save`

### Step 6: Configure Nginx
- [ ] Nginx configuration copied: `sudo cp nginx.conf /etc/nginx/sites-available/hr-erp`
- [ ] Site enabled: `sudo ln -s /etc/nginx/sites-available/hr-erp /etc/nginx/sites-enabled/`
- [ ] Default site removed: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx restarted: `sudo systemctl restart nginx`

### Step 7: Domain Configuration (Optional)
- [ ] Domain A record pointed to VPS IP
- [ ] Domain configured in nginx.conf
- [ ] DNS propagation completed (may take 24-48 hours)

### Step 8: SSL Certificate (Recommended)
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- [ ] SSL certificate obtained: `sudo certbot --nginx -d your-domain.com`
- [ ] Auto-renewal configured

### Step 9: Firewall Configuration
- [ ] UFW enabled: `sudo ufw enable`
- [ ] SSH allowed: `sudo ufw allow ssh`
- [ ] HTTP/HTTPS allowed: `sudo ufw allow 'Nginx Full'`
- [ ] Firewall status verified: `sudo ufw status`

### Step 10: Create Super Admin
- [ ] Super admin created: `node createSuperAdmin.js`
- [ ] Login credentials noted

## 🔍 Post-Deployment Verification

### Application Testing
- [ ] Frontend accessible at `http://your-domain.com` or `http://your-server-ip`
- [ ] API responding at `/api` endpoints
- [ ] Login functionality working
- [ ] All features tested (Employee Management, Forms, ATS)

### System Health Checks
- [ ] PM2 status: `pm2 status` shows running
- [ ] MongoDB status: `sudo systemctl status mongod` shows active
- [ ] Nginx status: `sudo systemctl status nginx` shows active
- [ ] Disk space: `df -h` shows adequate space
- [ ] Memory usage: `free -h` shows reasonable usage

### Security Verification
- [ ] Default passwords changed
- [ ] JWT secret is secure and unique
- [ ] Firewall properly configured
- [ ] SSL certificate working (if configured)

## 📊 Monitoring Setup

### Basic Monitoring
- [ ] htop installed: `sudo apt install htop`
- [ ] Log monitoring configured
- [ ] Backup strategy planned

### Application Monitoring
- [ ] PM2 monitoring: `pm2 monit`
- [ ] Log files location noted: `pm2 logs`
- [ ] Error handling tested

## 🎯 Final Access Information

### Application URLs
- **Frontend**: `http://your-domain.com` or `http://your-server-ip`
- **API**: `http://your-domain.com/api` or `http://your-server-ip/api`

### Default Credentials
- **Super Admin Email**: `superadmin@company.com`
- **Super Admin Password**: `SuperAdmin123!`

**⚠️ IMPORTANT: Change these credentials immediately after first login!**

## 🆘 Troubleshooting Commands

If something goes wrong, use these commands:

```bash
# Check application logs
pm2 logs hr-erp-backend

# Check system services
sudo systemctl status mongod
sudo systemctl status nginx

# Check ports
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80

# Check nginx configuration
sudo nginx -t

# Restart services
pm2 restart hr-erp-backend
sudo systemctl restart nginx
sudo systemctl restart mongod
```

## ✅ Deployment Complete!

Once all items are checked:
- [ ] Application is live and accessible
- [ ] All features working correctly
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation updated with actual URLs and credentials

**🎉 Congratulations! Your HR ERP system is successfully deployed on Hostinger KVM2!**

---

**Need Help?** Refer to `README-DEPLOYMENT.md` for detailed instructions. 