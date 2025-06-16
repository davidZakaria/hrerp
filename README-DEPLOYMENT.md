# 🚀 HR ERP Deployment Guide for Hostinger KVM2

## Prerequisites
- Hostinger KVM2 VPS subscription
- Domain name (optional but recommended)
- SSH access to your VPS

## Step-by-Step Deployment

### 1. Access Your Hostinger VPS

1. **Login to Hostinger Control Panel**
   - Go to your Hostinger account
   - Navigate to VPS section
   - Find your KVM2 server details

2. **Get SSH Access Details**
   - IP Address: `your-server-ip`
   - Username: `root` (or provided username)
   - Password: (provided in email or control panel)

3. **Connect via SSH**
   ```bash
   ssh root@your-server-ip
   ```

### 2. Upload Your Application

**Option A: Using Git (Recommended)**
```bash
# Clone your repository
git clone https://github.com/yourusername/hr-erp.git /var/www/hr-erp
cd /var/www/hr-erp
```

**Option B: Using SCP/SFTP**
```bash
# From your local machine
scp -r /path/to/your/hr-erp root@your-server-ip:/var/www/
```

### 3. Run the Deployment Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### 4. Configure Environment Variables

```bash
# Create environment file
nano .env
```

Add the following:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hr-erp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-very-long-and-random
```

### 5. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/hr-erp

# Enable the site
sudo ln -s /etc/nginx/sites-available/hr-erp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 6. Configure Domain (Optional)

1. **Point your domain to your VPS IP**
   - Go to your domain registrar
   - Update A record to point to your VPS IP

2. **Update Nginx configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/hr-erp
   ```
   Replace `your-domain.com` with your actual domain

### 7. Setup SSL Certificate (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## 🔧 Management Commands

### Backend Management
```bash
# Check application status
pm2 status

# View logs
pm2 logs hr-erp-backend

# Restart application
pm2 restart hr-erp-backend

# Stop application
pm2 stop hr-erp-backend
```

### Database Management
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# MongoDB shell
mongosh

# Backup database
mongodump --db hr-erp --out /backup/$(date +%Y%m%d)
```

### Nginx Management
```bash
# Check nginx status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx

# Check configuration
sudo nginx -t
```

## 🔍 Troubleshooting

### Common Issues

1. **Application not starting**
   ```bash
   pm2 logs hr-erp-backend
   ```

2. **Database connection issues**
   ```bash
   sudo systemctl status mongod
   mongosh --eval "db.adminCommand('ismaster')"
   ```

3. **Nginx issues**
   ```bash
   sudo nginx -t
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Port issues**
   ```bash
   sudo netstat -tlnp | grep :5000
   sudo netstat -tlnp | grep :80
   ```

## 📊 Monitoring

### Setup Basic Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop

# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor memory usage
free -h
```

## 🔐 Security Best Practices

1. **Change default passwords**
2. **Setup SSH key authentication**
3. **Disable root login**
4. **Keep system updated**
5. **Setup fail2ban**
6. **Regular backups**

## 📱 Access Your Application

- **Frontend**: `http://your-domain.com` or `http://your-server-ip`
- **API**: `http://your-domain.com/api` or `http://your-server-ip/api`

## 🎯 Default Login Credentials

- **Super Admin**: 
  - Email: `superadmin@company.com`
  - Password: `SuperAdmin123!`

**⚠️ Important: Change these credentials immediately after first login!**

## 📞 Support

If you encounter any issues:
1. Check the logs using the commands above
2. Verify all services are running
3. Check firewall settings
4. Ensure domain DNS is properly configured

---

**🎉 Congratulations! Your HR ERP system is now deployed on Hostinger KVM2!** 