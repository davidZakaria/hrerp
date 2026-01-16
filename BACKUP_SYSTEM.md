# HR-ERP Backup System Documentation

## Overview

The HR-ERP Backup System provides comprehensive data protection with the following features:

- **Full MongoDB Database Backup** - All collections including users, forms, attendance, audit logs
- **File Backup** - Resumes, medical documents, attendance files
- **Configuration Backup** - System configuration files
- **Encryption Support** - AES-256-CBC encryption for sensitive data
- **Automated Scheduled Backups** - Daily automated backups at 2:00 AM
- **Backup Verification** - SHA-256 checksum verification
- **Retention Policy** - Automatic cleanup of old backups

---

## Quick Start

### Manual Backup (CLI)

```bash
# Run a manual backup
node utils/backup.js

# With encryption (requires BACKUP_ENCRYPTION_KEY in .env)
BACKUP_ENCRYPTION_KEY=your-secret-key node utils/backup.js
```

### API Backup (Super Admin Only)

```bash
# Create backup via API
curl -X POST http://localhost:5000/api/backup/create \
  -H "x-auth-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"encrypt": true}'

# List all backups
curl http://localhost:5000/api/backup/list \
  -H "x-auth-token: YOUR_TOKEN"
```

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Backup encryption key (generate with: openssl rand -hex 32)
BACKUP_ENCRYPTION_KEY=your-32-character-hex-key-here

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/hr-erp
```

### Backup Settings

Edit `utils/backup.js` to customize:

```javascript
const BACKUP_CONFIG = {
  backupDir: './backups',           // Backup storage location
  retentionDays: 30,                // Keep backups for 30 days
  maxBackups: 50,                   // Maximum backups to keep
  uploadDirs: [                     // Directories to backup
    'uploads/resumes',
    'uploads/medical-documents',
    'uploads/attendance'
  ]
};
```

---

## Backup Structure

Each backup creates a timestamped folder:

```
backups/
└── backup-2024-01-15-10-30-00-abc123/
    ├── manifest.json           # Backup metadata and checksums
    ├── database/               # MongoDB dump (gzipped)
    │   └── hr-erp/
    │       ├── users.bson.gz
    │       ├── forms.bson.gz
    │       ├── audits.bson.gz
    │       └── ...
    ├── files/                  # Uploaded files
    │   └── uploads/
    │       ├── resumes/
    │       ├── medical-documents/
    │       └── attendance/
    └── config/                 # Configuration files
        ├── package.json
        └── config/
            └── default.json
```

---

## API Reference

### Create Backup
**POST** `/api/backup/create`

Creates a new backup. Super admin only.

**Request Body:**
```json
{
  "encrypt": true  // Optional: encrypt the backup
}
```

**Response:**
```json
{
  "success": true,
  "msg": "Backup created successfully",
  "backup": {
    "id": "backup-2024-01-15-10-30-00-abc123",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "size": "125.5 MB",
    "encrypted": true,
    "duration": "12.34s",
    "components": {
      "database": true,
      "files": 156,
      "config": 3
    }
  }
}
```

### List Backups
**GET** `/api/backup/list`

Lists all available backups.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "backups": [
    {
      "id": "backup-2024-01-15-10-30-00-abc123",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "size": "125.5 MB",
      "fileCount": 234,
      "encrypted": true
    }
  ]
}
```

### Verify Backup
**POST** `/api/backup/:backupId/verify`

Verifies backup integrity using checksums.

**Response:**
```json
{
  "success": true,
  "backupId": "backup-2024-01-15-10-30-00-abc123",
  "verification": {
    "valid": true,
    "verified": 234,
    "total": 234
  }
}
```

### Delete Backup
**DELETE** `/api/backup/:backupId`

Deletes a specific backup.

### Cleanup Old Backups
**POST** `/api/backup/cleanup`

Removes backups older than retention period.

### Get Backup Configuration
**GET** `/api/backup/config/settings`

Returns current backup configuration.

---

## Restore Operations

### Restore from CLI

```bash
# List available backups
node utils/restore.js --help

# Dry run (preview what would be restored)
node utils/restore.js backup-2024-01-15-10-30-00-abc123 --dry-run

# Full restore (WARNING: overwrites existing data!)
node utils/restore.js backup-2024-01-15-10-30-00-abc123

# Restore database only
node utils/restore.js backup-2024-01-15-10-30-00-abc123 --database-only

# Restore files only
node utils/restore.js backup-2024-01-15-10-30-00-abc123 --files-only

# Skip verification (not recommended)
node utils/restore.js backup-2024-01-15-10-30-00-abc123 --skip-verify

# Force restore without confirmation
node utils/restore.js backup-2024-01-15-10-30-00-abc123 --force
```

### Restore Steps

1. **Stop the server** to prevent data conflicts
2. **Verify the backup** before restoring
3. **Run the restore** with appropriate options
4. **Restart the server** to apply changes
5. **Verify the application** is working correctly

---

## Automated Backups

The system automatically creates backups daily at 2:00 AM server time.

### Schedule Configuration

To modify the schedule, edit `server.js`:

```javascript
// Current: Daily at 2:00 AM
cron.schedule('0 2 * * *', async () => { ... });

// Examples:
// Every 6 hours: '0 */6 * * *'
// Weekly on Sunday at 3 AM: '0 3 * * 0'
// Monthly on 1st at midnight: '0 0 1 * *'
```

### Monitoring Automated Backups

Check the audit logs for automated backup status:
- `AUTOMATED_BACKUP_COMPLETED` - Successful backup
- `AUTOMATED_BACKUP_FAILED` - Failed backup (check logs)

---

## Security Best Practices

### 1. Enable Encryption

Always encrypt backups in production:

```bash
# Generate encryption key
openssl rand -hex 32
```

Add to `.env`:
```env
BACKUP_ENCRYPTION_KEY=<generated-key>
```

### 2. Secure Backup Storage

- Store backups on a separate drive/server
- Use encrypted storage volumes
- Implement offsite backup replication
- Restrict access to backup directory

### 3. Access Control

- Only super_admin can create/manage backups via API
- All backup operations are logged in audit trail
- CLI backup requires server access

### 4. Regular Testing

- Test restore procedures regularly
- Verify backup integrity monthly
- Document recovery procedures

---

## Troubleshooting

### Backup Fails with "mongodump not found"

Install MongoDB Database Tools:

**Windows:**
```
Download from: https://www.mongodb.com/try/download/database-tools
Add to PATH
```

**Ubuntu/Debian:**
```bash
sudo apt install mongodb-database-tools
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-database-tools
```

The system will fall back to JSON export if mongodump is unavailable.

### "Permission denied" Errors

Ensure the Node.js process has write permissions to:
- `./backups/` directory
- `./uploads/` directory

### Large Backup Sizes

- Enable gzip compression (default)
- Clean up old backups regularly
- Consider excluding large files from backup

### Database Restore Fails

1. Ensure MongoDB is running
2. Check connection string in `.env`
3. Verify backup files are not corrupted
4. Try `--skip-verify` flag (use with caution)

---

## Recovery Scenarios

### Scenario 1: Accidental Data Deletion

```bash
# 1. Identify the most recent good backup
node utils/restore.js --help

# 2. Stop the server
npm stop

# 3. Restore database only
node utils/restore.js backup-XXXX --database-only

# 4. Restart server
npm start
```

### Scenario 2: Server Migration

```bash
# On old server:
node utils/backup.js

# Copy backup folder to new server

# On new server:
node utils/restore.js backup-XXXX --force
```

### Scenario 3: Corrupted Uploads

```bash
# Restore files only
node utils/restore.js backup-XXXX --files-only
```

---

## Backup Manifest

Each backup includes a `manifest.json` file:

```json
{
  "backupId": "backup-2024-01-15-10-30-00-abc123",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "system": {
    "platform": "win32",
    "nodeVersion": "v18.17.0",
    "hostname": "production-server"
  },
  "database": {
    "success": true,
    "path": "/backups/.../database",
    "size": 52428800,
    "fileCount": 12
  },
  "files": {
    "success": true,
    "totalSize": 78643200,
    "totalFiles": 156
  },
  "config": {
    "success": true,
    "fileCount": 3
  },
  "checksums": {
    "database/users.bson.gz": "sha256-hash...",
    "files/uploads/resumes/resume-123.pdf": "sha256-hash..."
  }
}
```

---

## Contact

For backup system issues, contact your system administrator.

**IMPORTANT:** Never share backup files or encryption keys publicly.
