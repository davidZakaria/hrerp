# VPS Deployment Commands

## Quick Deploy (after git push)

```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Navigate to project directory (adjust path to your setup)
cd /path/to/hrerp

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (if package.json changed)
npm install
cd hr-erp-frontend && npm install && cd ..

# 5. Build frontend
npm run build

# 6. Restart the app with PM2
pm2 restart hr-erp-backend

# 7. Verify it's running
pm2 status
pm2 logs hr-erp-backend --lines 20
```

## One-Time: ZKTeco System User (before first ZKTeco use)

```bash
cd /path/to/hrerp
node scripts/createZktecoSystemUser.js
```

Add the printed ID to your `.env`:
```
ZKTECO_SYSTEM_USER_ID=<printed_id>
```

Then restart:
```bash
pm2 restart hr-erp-backend
```

## Firewall: Allow ZKTeco Device Access

Ensure your server port (default 5000 or 5001) is open for the ZKTeco device:

```bash
# Ubuntu/Debian with ufw
sudo ufw allow 5000/tcp
sudo ufw reload
sudo ufw status
```

Device-specific steps and **K40 Pro** notes: see **[ZKTECO_SETUP.md](ZKTECO_SETUP.md)** (intro, §2, and §9).

## Verify ZKTeco Connectivity

After deploy, watch logs for device pings:
```bash
pm2 logs hr-erp-backend
```

Look for `[ZKTeco]` messages when the device connects.
