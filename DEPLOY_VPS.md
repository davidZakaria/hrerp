# VPS Deployment Commands

Production path on your server: **`/var/www/hr-erp`**. Adjust `user@your-vps-ip` and PM2 process name if yours differ.

---

## 1. On your machine (push changes)

From your project folder (e.g. `c:\Users\m.h\hrerp`):

```bash
git status
git add -A
git commit -m "Describe your change"
git push origin main
```

Resolve any merge issues locally before pushing. The VPS will pull `main` (or your deployment branch).

---

## 2. On the VPS (pull and deploy)

SSH in, then run:

```bash
cd /var/www/hr-erp

git fetch origin
git pull origin main

# Dependencies when package.json / lockfiles changed
npm install
cd hr-erp-frontend && npm install && cd ..

# Build React app (served by Node or nginx from build output — same as your current setup)
npm run build

# Restart API (name must match: pm2 list)
pm2 restart hr-erp-backend

pm2 status
pm2 logs hr-erp-backend --lines 30
```

If nginx caches or proxies static files, reload after a build when applicable:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Quick copy-paste (VPS only)

```bash
cd /var/www/hr-erp && git pull origin main && npm install && (cd hr-erp-frontend && npm install && cd ..) && npm run build && pm2 restart hr-erp-backend && pm2 logs hr-erp-backend --lines 20
```

---

## One-Time: ZKTeco System User (before first ZKTeco use)

```bash
cd /var/www/hr-erp
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
