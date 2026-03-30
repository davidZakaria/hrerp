# ZKTeco ADMS Setup Guide

This guide explains how to configure ZKTeco biometric devices to push attendance data to the HR-ERP server in real time.

**Target device (primary):** **ZKTeco K40 Pro**. The same flow applies to other ZKTeco terminals that support **ADMS / Cloud push** (iClock-compatible).

## Prerequisites

- **ZKTeco K40 Pro** (or compatible device) with **ADMS (Push)** / **Cloud server** options in firmware and menus. Regional builds may label these **Cloud**, **ADMS**, **Server**, or similar. If your unit has no push/cloud settings, use **§6 Manual upload fallback** or upgrade firmware with ZKTeco or your vendor.
- VPS or server running HR-ERP with a public/reachable IP
- Employee codes in HR-ERP must match the device's AC-No (User PIN)

## 1. Create System User (One-Time)

Run the script to create a dedicated user for ZKTeco imports:

```bash
node scripts/createZktecoSystemUser.js
```

Add the printed ID to your `.env` file:

```
ZKTECO_SYSTEM_USER_ID=<printed_id>
```

If not set, the system falls back to the first `super_admin` user.

## 2. Configure the ZKTeco Device

### General rules (all devices)

1. Traffic must reach **`/iclock/cdata`** (GET handshake, POST attendance). Your reverse proxy must forward **`/iclock`** to Node without stripping the path.
2. **Behind Nginx (site uses SSL for browsers):** Point the device at **`http://<YOUR_DOMAIN>/iclock/cdata`**, **port 80**, **HTTPS/SSL OFF** on the device. The HR website stays on **HTTPS**; only the clock uses **HTTP** to `/iclock` (see **§9** if punches still fail).
3. **Direct to Node (no Nginx):** `http://<YOUR_VPS_IP>:<NODE_PORT>/iclock/cdata` (use the same port as `PORT` in `.env`, often `5000` or `5001`).
4. Firewall: allow **TCP 80** when Nginx is in front, or your Node port for a direct connection.

### K40 Pro — typical device configuration

On-device and web UI **labels vary by firmware**; follow your **K40 Pro manual** for the exact menu path. Typical workflow:

1. **Ethernet:** Configure static IP or DHCP, **gateway**, and **DNS** so the device can reach your server and **resolve the domain** if you use a hostname.
2. **Where to configure:** Use the **device menu** (paths such as **COMM**, **Communication**, **Advanced**, or **Options** are common — yours may differ) and/or the **web interface** (browser → device IP on the LAN).
3. **Cloud / ADMS:** Enable push and set **server mode** to **ADMS** (or the equivalent name on your firmware).
4. **Domain name option:** If the UI has **Enable domain name** (or similar): **ON** for a hostname (e.g. `hr-njd.com`); **OFF** if you enter only the VPS **public IP**.
5. **Server address:** Hostname or IP only — no `http://` if the UI rejects it. When the UI has a separate URL or path field, put only the host or IP here (not `/iclock/cdata`); if the UI has a single **full URL** field, use step 8 instead.
6. **Server port:** **80** when Nginx terminates HTTP on the VPS. **Do not use 4370** here — that is the ZK **SDK** port for desktop tools, not ADMS **HTTP** push.
7. **HTTPS / SSL:** **OFF** on the K40 Pro for reliable operation with HR-ERP (embedded TLS often fails with Let’s Encrypt or redirects).
8. **Full URL field** (if your firmware has one): `http://<domain-or-ip>/iclock/cdata` and port **80** (unless the manual says otherwise).
9. **Save** and **reboot** if required; confirm status (e.g. cloud/connection icon) per your manual.

## 3. Endpoints (Device Hardcoded)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/iclock/cdata` | GET | Handshake – device requests configuration |
| `/iclock/cdata` | POST | Attendance data push (table=ATTLOG) |
| `/iclock/getrequest` | GET | Command polling – server returns OK |

## 4. Employee Code Mapping

Each employee must have an `employeeCode` in HR-ERP that matches their **AC-No** (User PIN) in the ZKTeco device. When creating or editing users, set this in the "ZKTeco device code" field.

## 5. Data Flow

1. Device sends GET to `/iclock/cdata` → receives config with `Realtime=1`
2. Device pushes punches to POST `/iclock/cdata?table=ATTLOG`
3. Server responds `OK` immediately, then processes asynchronously
4. FILO logic: first punch of day = clock-in, last punch = clock-out
5. 5-minute deduplication: punches within 5 minutes are collapsed

## 6. Manual Upload Fallback

Manual XLS/XLSX upload remains available. Both ZKTeco push and manual upload can coexist; records are merged by employee and date.

## 7. Verifying the Device Is Pinging

Watch your server console/terminal when the server is running. You will see logs prefixed with `[ZKTeco]`:

| Log message | Meaning |
|-------------|---------|
| `[ZKTeco] Handshake from device SN=... IP=...` | Device did initial handshake (GET /iclock/cdata) |
| `[ZKTeco] Data push from device SN=... - N punch(es)` | Device pushed attendance data (POST /iclock/cdata) |
| `[ZKTeco] Command poll from device SN=... - device is connected` | Device is polling for commands (GET /iclock/getrequest) – logged at most once per minute per IP |
| `[ZKTeco] Processed: X new, Y updated attendance record(s)` | Attendance records were saved to the database |

**Quick test** (matches Nginx in front — preferred):

```bash
curl -s "http://YOUR_DOMAIN/iclock/cdata?SN=TEST123" | head -1
```

You should see a line starting with `GET OPTION FROM: TEST123` and a `[ZKTeco] Handshake` log in the server console.

**Direct to Node** (no Nginx): use your server IP and app port, e.g. `curl -s "http://YOUR_VPS_IP:5001/iclock/cdata?SN=TEST123" | head -1` (replace `5001` with your `PORT`).

## 8. Troubleshooting

- **Unmatched employee codes**: Ensure `employeeCode` in User matches device AC-No
- **No data appearing**: Check firewall, device connectivity, and server logs for `[ZKTeco]` messages
- **Duplicate punches**: The 5-minute grace period should filter accidental double-punches
- **SSL / HTTPS on the domain**: If the site redirects all HTTP to HTTPS, `/iclock` on port 80 must be **exempt** (proxied without redirect). See **section 9** below.
- **K40 Pro shows “connected” / cloud OK but no punches in HR-ERP**: Confirm **ADMS** push is enabled, **DNS** on the device resolves your domain, **Nginx does not redirect** `http://domain/iclock` to HTTPS (§9), **server port 80** (not 4370), **HTTPS OFF** on the device, and each employee’s **PIN (AC-No)** matches **`employeeCode`** in HR-ERP.
- **Only `[ZKTeco] Handshake` in logs, never `POST cdata` or `Data push`**: The device is reaching GET `/iclock/cdata` but **not POSTing attendance**. On the K40, use the manual to find **upload / send attendance / data push** (wording varies); some units poll for minutes before the first upload. Ensure **HTTPS is OFF** and **port 80** so POST matches the server. After deploying the latest backend, every POST is logged as **`[ZKTeco] POST cdata`** with `bodyLen` and `table=` — if that line never appears when you punch, the POST is not reaching Node (device or network).
- **`POST cdata` with `bodyLen=0`**: Firmware sent an empty body (or a proxy stripped it). Try **manual upload** on the device or another firmware; check Nginx **`client_max_body_size`** is not zero for `/iclock`.
- **`table` not `ATTLOG` but body looks like punches**: Fix cloud URL or firmware so requests include **`?table=ATTLOG`** (HR-ERP also accepts **missing** `table` only when the body clearly looks like ATTLOG lines).

---

## 9. Nginx + SSL: step-by-step fix (when punches do not arrive)

If your domain uses Let’s Encrypt / Certbot, the **port 80** `server` block often redirects **every** request to HTTPS. ZKTeco devices then never reach Node (many units do not follow `301` or support TLS). Your **HTTPS** `server` block may also be missing **`location /iclock`**, so traffic never hits the API.

Follow these steps on the VPS (SSH as root or with `sudo`).

### Step 1 — Find and back up the active config

List enabled sites:

```bash
ls -la /etc/nginx/sites-enabled/
```

You will see a symlink such as `hr-erp -> /etc/nginx/sites-available/hr-erp`. The file you edit is the target in **`sites-available`**:

```bash
sudo cp /etc/nginx/sites-available/hr-erp /etc/nginx/sites-available/hr-erp.bak.$(date +%Y%m%d)
```

### Step 2 — Confirm Node’s listening port

Nginx must proxy to the same port PM2/Node uses:

```bash
grep ^PORT /path/to/hrerp/.env
# or
pm2 show hr-erp-backend | grep -i script
```

Note the value (often `5000` or `5001`). Every `proxy_pass http://127.0.0.1:PORT` below must use **that** port.

### Step 3 — Fix the port 80 (`listen 80`) server block

Open the config:

```bash
sudo nano /etc/nginx/sites-available/hr-erp
```

Locate the `server { ... }` that has **`listen 80;`** and your domain in **`server_name`** (e.g. `hr-njd.com`).

**Remove or replace** Certbot-style blocks that do only this for every request:

- `if ($host = ...) { return 301 https://...; }` plus `return 404;`, or
- a single `return 301 https://...` for the whole server

**Replace** that entire port 80 `server { }` with the following pattern (adjust `server_name` and `proxy_pass` port to match your server):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name hr-njd.com www.hr-njd.com;

    # Let's Encrypt — keep certificate renewals working
    # If renewals fail, run: grep -r acme-challenge /etc/nginx/
    # and copy the root/alias Certbot already uses into this block.
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /iclock {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 10M;
    }

    location / {
        return 301 https://hr-njd.com$request_uri;
    }
}
```

Important:

- **`location /iclock`** must exist and **must not** be behind a blanket HTTP→HTTPS redirect.
- Change **`5000`** to your real Node **`PORT`** if different.
- If **`/.well-known/acme-challenge/`** uses a different `root` on your server, use that path (from your old config or `grep`).

### Step 4 — Add `/iclock` to the HTTPS (`listen 443 ssl`) server block

In the same file, open the **`server { ... }`** that has **`listen 443 ssl`** and **`server_name hr-njd.com`** (your main site).

Next to your existing **`location /api { ... }`**, add:

```nginx
    location /iclock {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 10M;
    }
```

Again, set **`proxy_pass`** port to your Node port. Devices should still use **HTTP port 80**; this block helps testing and rare TLS-capable firmware.

### Step 5 — Test Nginx and reload

```bash
sudo nginx -t
```

If you see **syntax is ok** and **test is successful**:

```bash
sudo systemctl reload nginx
```

If `nginx -t` fails, fix the reported line or restore the backup:

```bash
sudo cp /etc/nginx/sites-available/hr-erp.bak.YYYYMMDD /etc/nginx/sites-available/hr-erp
```

(use the actual backup filename from Step 1)

### Step 6 — Verify from outside

From any machine:

```bash
curl -s "http://YOUR_DOMAIN/iclock/cdata?SN=TEST" | head -1
```

Expected: a line starting with `GET OPTION FROM: TEST`.  
Wrong: HTML, `404`, or no body after a redirect to `https://` (means `/iclock` is still redirecting).

On the server, watch logs:

```bash
pm2 logs hr-erp-backend --lines 30
```

You should see `[ZKTeco] Handshake ...` when you run the `curl` above.

### Step 7 — Firewall

Allow **TCP 80** from the internet (or from the device’s IP if you restrict by source):

```bash
sudo ufw allow 80/tcp
sudo ufw reload
sudo ufw status
```

### Step 8 — Device settings (after Nginx is fixed)

| Setting        | Value |
|----------------|--------|
| Server / host  | Your domain (e.g. `hr-njd.com`) or public IP |
| Port           | **80** |
| HTTPS / SSL    | **Off** |
| URL / path     | Includes **`/iclock/cdata`** |

### Step 9 — Reference copy in the repo

The same layout is kept in the project file [`nginx.conf`](nginx.conf) in the repository for copy-paste and review (adjust paths, `server_name`, and port to your environment).

---

## 10. Symptom → cause (quick)

| What you see | Likely cause |
|----------------|--------------|
| `curl http://domain/iclock/...` → `301` to `https://` | Port 80 still redirects `/iclock`; fix Step 3 |
| `curl https://domain/iclock/...` → HTML or 404 | Missing `location /iclock` on 443; fix Step 4 |
| Works on server via `localhost:PORT` but not from device | Firewall, wrong domain, or device still using old URL/port |
| Handshake in logs but no DB rows | Employee code mismatch or `ZKTECO_SYSTEM_USER_ID` / DB errors in logs |
| K40 Pro “online” / connected, no attendance in app | ADMS not actually pushing, wrong port (not 80 behind Nginx), HTTP→HTTPS redirect on `/iclock`, DNS from device, or PIN ≠ `employeeCode` |
