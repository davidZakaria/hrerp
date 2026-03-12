# ZKTeco ADMS Setup Guide

This guide explains how to configure ZKTeco biometric devices to push attendance data to the HR-ERP server in real time.

## Prerequisites

- ZKTeco device with ADMS (Push) protocol support
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

1. Access the device's web interface or configuration menu
2. Enable **ADMS** or **Push** mode
3. Set the server URL to: `http://<YOUR_VPS_IP>:<PORT>/iclock/cdata`
   - Example: `http://203.0.113.50:5001/iclock/cdata`
4. Ensure the device can reach your server (firewall allows inbound TCP on the port)

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

**Quick test**: From another machine, run:
```bash
curl "http://YOUR_VPS_IP:5001/iclock/cdata?SN=TEST123"
```
You should see the config response and a `[ZKTeco] Handshake` log in the server console.

## 8. Troubleshooting

- **Unmatched employee codes**: Ensure `employeeCode` in User matches device AC-No
- **No data appearing**: Check firewall, device connectivity, and server logs for `[ZKTeco]` messages
- **Duplicate punches**: The 5-minute grace period should filter accidental double-punches
