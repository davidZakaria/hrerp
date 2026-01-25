# HR-ERP Deployment to Hostinger KVM 2 VPS

**Domain:** hr-njd.com  
**VPS:** Hostinger KVM 2 (8GB RAM, 2 vCPU, 100GB NVMe)

---

## Step 1: Configure GoDaddy DNS

Before deploying, point your domain to your VPS.

### 1.1 Get Your VPS IP Address
1. Log into Hostinger Panel
2. Go to VPS section
3. Copy your VPS IP address (e.g., `123.45.67.89`)

### 1.2 Configure GoDaddy DNS
1. Log into [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains** → `hr-njd.com`
3. Click **DNS** or **Manage DNS**
4. Update/Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 600 |
| A | www | YOUR_VPS_IP | 600 |

5. Delete any existing A records that point elsewhere
6. Save changes

**Note:** DNS propagation takes 5-30 minutes (sometimes up to 24 hours)

---

## Step 2: Upload Files to VPS

### Option A: Using SCP (Recommended)

From your local machine (PowerShell/Terminal):

```powershell
# From the hrerp folder, upload everything to VPS
scp -r * root@YOUR_VPS_IP:/var/www/hr-erp/
```

Or on Windows using PowerShell:
```powershell
# First, SSH to create the directory
ssh root@YOUR_VPS_IP "mkdir -p /var/www/hr-erp"

# Then upload (you may need to install WinSCP or use Git Bash)
```

### Option B: Using FileZilla/WinSCP
1. Download and install [WinSCP](https://winscp.net/) or [FileZilla](https://filezilla-project.org/)
2. Connect using SFTP:
   - Host: YOUR_VPS_IP
   - Username: root
   - Password: Your Hostinger VPS password
   - Port: 22
3. Upload the entire `hrerp` folder to `/var/www/hr-erp/`

### Option C: Using Git
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Create directory and clone
mkdir -p /var/www
cd /var/www
git clone YOUR_GITHUB_REPO_URL hr-erp
```

---

## Step 3: Run Deployment Script on VPS

### 3.1 SSH into your VPS
```bash
ssh root@YOUR_VPS_IP
```

### 3.2 Navigate to application and run deployment
```bash
cd /var/www/hr-erp

# Make script executable
chmod +x deploy-vps.sh

# Run deployment script
./deploy-vps.sh
```

This script will automatically:
- Update system packages
- Install Node.js 18.x
- Install and configure MongoDB 7.0
- Install Nginx
- Install PM2
- Configure firewall
- Start your application

---

## Step 4: Install SSL Certificate

After DNS propagation (verify at https://dnschecker.org):

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d hr-njd.com -d www.hr-njd.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

---

## Step 5: Create Super Admin Account

The super admin credentials are configured in the `.env` file.

### 5.1 Edit the .env file to set your admin credentials
```bash
cd /var/www/hr-erp
nano .env
```

Find and update these lines with your desired credentials:
```env
ADMIN_NAME=Your Name
ADMIN_EMAIL=admin@hr-njd.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_DEPARTMENT=Administration
```

### 5.2 Run the script
```bash
node scripts/createSuperAdmin.js
```

**Important:** Use a strong password and remember to change it after first login!

---

## Step 6: Verify Deployment

### Check all services:
```bash
pm2 status                    # Application should be "online"
systemctl status mongod       # MongoDB should be "active"
systemctl status nginx        # Nginx should be "active"
```

### Test the application:
```bash
# Test API locally
curl http://localhost:5000/api/auth

# Test from browser
# Visit: https://hr-njd.com
```

---

## Troubleshooting

### Application not starting
```bash
pm2 logs hr-erp-backend --lines 50
pm2 restart hr-erp-backend
```

### MongoDB issues
```bash
systemctl status mongod
systemctl restart mongod
journalctl -u mongod --lines 50
```

### Nginx issues
```bash
nginx -t                      # Test configuration
systemctl status nginx
tail -f /var/log/nginx/hr-erp.error.log
```

### SSL Certificate issues
```bash
certbot renew --dry-run       # Test renewal
certbot certificates          # List certificates
```

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `pm2 status` | Check app status |
| `pm2 logs hr-erp-backend` | View app logs |
| `pm2 restart hr-erp-backend` | Restart application |
| `pm2 monit` | Monitor resources |
| `htop` | System resource monitor |
| `df -h` | Check disk space |
| `free -h` | Check memory usage |

---

## Files Created for Deployment

| File | Purpose |
|------|---------|
| `.env.production` | Production environment variables |
| `hr-erp-frontend/.env.production` | Frontend API URL configuration |
| `nginx.conf` | Nginx configuration for your domain |
| `deploy-vps.sh` | Automated deployment script |
| `hr-erp-frontend/build/` | Production-ready frontend |

---

## Security Reminders

1. **Change super admin password** after first login
2. **Keep .env file secure** - never commit to git
3. **Regular backups** - MongoDB dumps are scheduled daily
4. **Monitor logs** - check for unauthorized access attempts
5. **Keep system updated** - run `apt update && apt upgrade` monthly
