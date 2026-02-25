# Login Failure Troubleshooting Guide (Hostinger VPS)

When all users see "Login failed" or "Error connecting to server", follow these steps on your VPS to identify and fix the issue.

---

## 1. Check Server Logs (Most Important)

SSH into your VPS and run:

```bash
# View live backend logs (Ctrl+C to exit)
pm2 logs hr-erp-backend --lines 100

# Or view the last 50 lines of error log
pm2 logs hr-erp-backend --err --lines 50

# Check the log files directly
tail -100 /var/www/hr-erp/logs/pm2-error.log
tail -100 /var/www/hr-erp/logs/pm2-out.log
```

**What to look for:**
- `JWT_SECRET is not configured` → Add JWT_SECRET to your `.env` file
- `MongoDB connection error` or `Mongoose disconnected` → Database issue
- `Login error:` followed by an error message → Specific auth failure
- `Request error:` with status 429 → Rate limiting (too many failed attempts from same IP)

---

## 2. Verify Environment Variables

```bash
cd /var/www/hr-erp
cat .env | grep -E "JWT_SECRET|MONGODB_URI|CORS_ORIGIN|PORT"
```

**Required for login:**
- `JWT_SECRET` – Must be set and at least 32 characters. If missing, login returns 500.
- `MONGODB_URI` – MongoDB connection string. If wrong or DB is down, login fails.
- `CORS_ORIGIN` – Should match your frontend URL (e.g. `https://hr-njd.com`).

---

## 3. Test API Directly

```bash
# Test login endpoint (replace with valid credentials)
curl -X POST https://hr-njd.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@newjerseyegypt.com","password":"YOUR_PASSWORD"}'
```

**Response meanings:**
- `{"msg":"Invalid credentials"}` → Wrong email/password or user not found
- `{"msg":"Server configuration error"}` → JWT_SECRET missing
- `{"msg":"Server error..."}` → Check pm2 logs for the actual error
- `{"msg":"Too many login attempts..."}` → Rate limited; wait 15 min or restart PM2 to reset
- Connection refused / timeout → Nginx or backend not running

---

## 4. Check Services

```bash
pm2 status                    # hr-erp-backend should be "online"
systemctl status mongod       # MongoDB should be "active"
systemctl status nginx        # Nginx should be "active"
```

If MongoDB is down:
```bash
systemctl restart mongod
journalctl -u mongod -n 30    # Check MongoDB logs
```

If backend is down:
```bash
pm2 restart hr-erp-backend
pm2 logs hr-erp-backend --lines 20
```

---

## 5. Frontend API URL

Ensure the frontend was built with the correct API URL. On the VPS:

```bash
# Check what API URL the built frontend uses (in the JS bundle)
grep -r "hr-njd.com\|localhost:5000" /var/www/hr-erp/hr-erp-frontend/build/static/js/ | head -5
```

The production build must have `REACT_APP_API_URL=https://hr-njd.com` set **before** running `npm run build`. If it shows `localhost:5000`, rebuild the frontend:

```bash
cd /var/www/hr-erp/hr-erp-frontend
# Ensure .env.production has: REACT_APP_API_URL=https://hr-njd.com
npm run build
```

---

## 6. Rate Limiting (All Users Blocked)

If many users share one IP (corporate network, NAT), 30 failed logins in 15 minutes blocks everyone.

**Temporary fix – reset rate limit by restarting:**
```bash
pm2 restart hr-erp-backend
```

**Permanent fix:** The codebase was updated to allow 30 attempts per 15 min (was 10). Redeploy the updated `server.js`.

---

## 7. Nginx Proxy Check

```bash
# Verify Nginx proxies /api to the backend
nginx -t
tail -20 /var/log/nginx/hr-erp.error.log
tail -20 /var/log/nginx/hr-erp.access.log
```

---

## Quick Fix Checklist

| Symptom | Action |
|---------|--------|
| "Server configuration error" | Add `JWT_SECRET` to `.env`, restart: `pm2 restart hr-erp-backend` |
| "Error connecting to server" | Check `REACT_APP_API_URL` in frontend build, verify backend is running |
| "Invalid credentials" (correct password) | Check user exists and status is `active` in MongoDB |
| "Too many login attempts" | Wait 15 min or `pm2 restart hr-erp-backend` |
| Database errors in logs | `systemctl restart mongod`, verify `MONGODB_URI` |

---

## Deploy Fixes to VPS

After pulling the code changes (email normalization, JSON error responses, rate limit increase):

```bash
# On your local machine - push and pull on VPS, or upload via SCP
ssh root@YOUR_VPS_IP
cd /var/www/hr-erp
git pull   # or upload the changed files
pm2 restart hr-erp-backend
pm2 logs hr-erp-backend --lines 20
```
