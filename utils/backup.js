/**
 * HR-ERP Secure Backup System
 * ============================
 * Comprehensive backup utility for MongoDB database and uploaded files.
 * 
 * Features:
 * - Full MongoDB database backup using mongodump
 * - File backup (uploads: resumes, medical docs, attendance)
 * - Encrypted backup archives
 * - Automatic backup rotation (retention policy)
 * - Backup verification and integrity checks
 * - Detailed logging and audit trail
 * 
 * Usage:
 * - Manual: node utils/backup.js
 * - API: POST /api/backup/create (super_admin only)
 * - Scheduled: Configured in server.js cron jobs
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const util = require('util');

const execPromise = util.promisify(exec);

// Backup configuration
const BACKUP_CONFIG = {
  // Backup directory (relative to project root)
  backupDir: path.join(__dirname, '..', 'backups'),
  
  // Directories to backup
  uploadDirs: [
    'uploads/resumes',
    'uploads/medical-documents',
    'uploads/attendance'
  ],
  
  // Config files to backup (exclude sensitive env files)
  configFiles: [
    'package.json',
    'config/default.json',
    'ecosystem.config.js'
  ],
  
  // Retention policy (days)
  retentionDays: 30,
  
  // Maximum number of backups to keep
  maxBackups: 50,
  
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16
  }
};

/**
 * Generate a unique backup ID with timestamp
 */
function generateBackupId() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `backup-${timestamp}-${randomSuffix}`;
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    fs.mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_CONFIG.backupDir}`);
  }
  
  // Add .gitignore to exclude backups from version control
  const gitignorePath = path.join(BACKUP_CONFIG.backupDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
  }
}

/**
 * Get MongoDB connection details from environment
 */
function getMongoConfig() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
  
  try {
    const url = new URL(mongoURI);
    return {
      host: url.hostname,
      port: url.port || '27017',
      database: url.pathname.replace('/', '') || 'hr-erp',
      username: url.username || null,
      password: url.password || null,
      authSource: url.searchParams.get('authSource') || 'admin',
      uri: mongoURI
    };
  } catch (err) {
    // Fallback for simple connection strings
    return {
      host: 'localhost',
      port: '27017',
      database: 'hr-erp',
      username: null,
      password: null,
      authSource: 'admin',
      uri: mongoURI
    };
  }
}

/**
 * Backup MongoDB database using mongodump
 */
async function backupDatabase(backupPath) {
  const mongoConfig = getMongoConfig();
  const dbBackupPath = path.join(backupPath, 'database');
  
  console.log(`💾 Starting MongoDB backup for database: ${mongoConfig.database}`);
  
  // Build mongodump command
  let mongodumpCmd = `mongodump --uri="${mongoConfig.uri}" --out="${dbBackupPath}"`;
  
  // Add gzip compression
  mongodumpCmd += ' --gzip';
  
  try {
    const { stdout, stderr } = await execPromise(mongodumpCmd, {
      timeout: 300000 // 5 minute timeout
    });
    
    if (stderr && !stderr.includes('done dumping')) {
      console.warn('⚠️  MongoDB backup warnings:', stderr);
    }
    
    // Verify backup was created
    if (fs.existsSync(dbBackupPath)) {
      const stats = getDirectorySize(dbBackupPath);
      console.log(`✅ MongoDB backup completed: ${formatBytes(stats.size)}`);
      return {
        success: true,
        path: dbBackupPath,
        size: stats.size,
        fileCount: stats.fileCount
      };
    } else {
      throw new Error('Backup directory was not created');
    }
  } catch (error) {
    console.error('❌ MongoDB backup failed:', error.message);
    
    // Try alternative backup method using mongoose
    return await backupDatabaseFallback(dbBackupPath);
  }
}

/**
 * Fallback database backup using mongoose (for when mongodump is not available)
 */
async function backupDatabaseFallback(backupPath) {
  console.log('📝 Using fallback JSON export method...');
  
  try {
    const mongoose = require('mongoose');
    
    // Ensure connection
    if (mongoose.connection.readyState !== 1) {
      const mongoConfig = getMongoConfig();
      await mongoose.connect(mongoConfig.uri);
    }
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    let totalSize = 0;
    let fileCount = 0;
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      
      const filePath = path.join(backupPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      fileCount++;
      
      console.log(`  📄 Exported ${collectionName}: ${data.length} documents`);
    }
    
    console.log(`✅ Fallback backup completed: ${formatBytes(totalSize)}`);
    return {
      success: true,
      path: backupPath,
      size: totalSize,
      fileCount,
      method: 'json_export'
    };
  } catch (error) {
    console.error('❌ Fallback backup failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Backup uploaded files
 */
async function backupFiles(backupPath) {
  const filesBackupPath = path.join(backupPath, 'files');
  fs.mkdirSync(filesBackupPath, { recursive: true });
  
  console.log('📂 Starting files backup...');
  
  let totalSize = 0;
  let totalFiles = 0;
  const results = [];
  
  for (const uploadDir of BACKUP_CONFIG.uploadDirs) {
    const sourcePath = path.join(__dirname, '..', uploadDir);
    const destPath = path.join(filesBackupPath, uploadDir);
    
    if (fs.existsSync(sourcePath)) {
      try {
        await copyDirectory(sourcePath, destPath);
        const stats = getDirectorySize(destPath);
        totalSize += stats.size;
        totalFiles += stats.fileCount;
        
        results.push({
          directory: uploadDir,
          files: stats.fileCount,
          size: stats.size
        });
        
        console.log(`  📁 ${uploadDir}: ${stats.fileCount} files (${formatBytes(stats.size)})`);
      } catch (err) {
        console.warn(`  ⚠️  Error backing up ${uploadDir}:`, err.message);
        results.push({
          directory: uploadDir,
          error: err.message
        });
      }
    } else {
      console.log(`  ⏭️  Skipping ${uploadDir} (does not exist)`);
    }
  }
  
  console.log(`✅ Files backup completed: ${totalFiles} files (${formatBytes(totalSize)})`);
  
  return {
    success: true,
    path: filesBackupPath,
    totalSize,
    totalFiles,
    details: results
  };
}

/**
 * Backup configuration files
 */
async function backupConfig(backupPath) {
  const configBackupPath = path.join(backupPath, 'config');
  fs.mkdirSync(configBackupPath, { recursive: true });
  
  console.log('⚙️  Starting config backup...');
  
  let fileCount = 0;
  const results = [];
  
  for (const configFile of BACKUP_CONFIG.configFiles) {
    const sourcePath = path.join(__dirname, '..', configFile);
    
    if (fs.existsSync(sourcePath)) {
      try {
        const destPath = path.join(configBackupPath, configFile);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(sourcePath, destPath);
        fileCount++;
        results.push({ file: configFile, status: 'backed up' });
        console.log(`  📄 ${configFile}`);
      } catch (err) {
        results.push({ file: configFile, error: err.message });
      }
    }
  }
  
  // Save environment template (without sensitive values)
  const envTemplate = generateEnvTemplate();
  fs.writeFileSync(path.join(configBackupPath, '.env.template'), envTemplate);
  
  console.log(`✅ Config backup completed: ${fileCount} files`);
  
  return {
    success: true,
    path: configBackupPath,
    fileCount,
    details: results
  };
}

/**
 * Generate environment template (without sensitive values)
 */
function generateEnvTemplate() {
  return `# HR-ERP Environment Variables Template
# Generated from backup - DO NOT commit with actual values

# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hr-erp

# JWT Secret (generate a strong random string)
JWT_SECRET=your-jwt-secret-here

# Email Configuration (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Backup Encryption Key (generate: openssl rand -hex 32)
BACKUP_ENCRYPTION_KEY=

# API URL for frontend
REACT_APP_API_URL=http://localhost:5000
`;
}

/**
 * Create encrypted backup archive
 */
async function createEncryptedArchive(backupPath, encryptionKey) {
  if (!encryptionKey) {
    console.log('⚠️  No encryption key provided, skipping encryption');
    return { encrypted: false };
  }
  
  console.log('🔐 Creating encrypted archive...');
  
  const archivePath = `${backupPath}.tar`;
  const encryptedPath = `${backupPath}.tar.enc`;
  
  try {
    // Create tar archive
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Use PowerShell for Windows
      await execPromise(
        `powershell -Command "Compress-Archive -Path '${backupPath}\\*' -DestinationPath '${backupPath}.zip' -Force"`,
        { timeout: 300000 }
      );
      
      // Encrypt the zip file
      const zipData = fs.readFileSync(`${backupPath}.zip`);
      const encrypted = encryptData(zipData, encryptionKey);
      fs.writeFileSync(`${backupPath}.zip.enc`, encrypted);
      
      // Clean up unencrypted zip
      fs.unlinkSync(`${backupPath}.zip`);
      
      console.log('✅ Encrypted archive created (Windows)');
      return {
        encrypted: true,
        path: `${backupPath}.zip.enc`,
        algorithm: BACKUP_CONFIG.encryption.algorithm
      };
    } else {
      // Use tar for Unix systems
      await execPromise(`tar -cvf "${archivePath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`, {
        timeout: 300000
      });
      
      // Encrypt the archive
      const tarData = fs.readFileSync(archivePath);
      const encrypted = encryptData(tarData, encryptionKey);
      fs.writeFileSync(encryptedPath, encrypted);
      
      // Clean up unencrypted archive
      fs.unlinkSync(archivePath);
      
      console.log('✅ Encrypted archive created');
      return {
        encrypted: true,
        path: encryptedPath,
        algorithm: BACKUP_CONFIG.encryption.algorithm
      };
    }
  } catch (error) {
    console.error('⚠️  Encryption failed:', error.message);
    return { encrypted: false, error: error.message };
  }
}

/**
 * Encrypt data using AES-256-CBC
 */
function encryptData(data, key) {
  const keyBuffer = crypto.scryptSync(key, 'salt', BACKUP_CONFIG.encryption.keyLength);
  const iv = crypto.randomBytes(BACKUP_CONFIG.encryption.ivLength);
  
  const cipher = crypto.createCipheriv(
    BACKUP_CONFIG.encryption.algorithm,
    keyBuffer,
    iv
  );
  
  const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);
  return encrypted;
}

/**
 * Decrypt data using AES-256-CBC
 */
function decryptData(encryptedData, key) {
  const keyBuffer = crypto.scryptSync(key, 'salt', BACKUP_CONFIG.encryption.keyLength);
  const iv = encryptedData.slice(0, BACKUP_CONFIG.encryption.ivLength);
  const data = encryptedData.slice(BACKUP_CONFIG.encryption.ivLength);
  
  const decipher = crypto.createDecipheriv(
    BACKUP_CONFIG.encryption.algorithm,
    keyBuffer,
    iv
  );
  
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted;
}

/**
 * Generate backup manifest with checksums
 */
function generateManifest(backupPath, results) {
  const manifest = {
    backupId: path.basename(backupPath),
    createdAt: new Date().toISOString(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      hostname: require('os').hostname()
    },
    database: results.database,
    files: results.files,
    config: results.config,
    checksums: {}
  };
  
  // Generate checksums for all backed up files
  const allFiles = getAllFiles(backupPath);
  for (const file of allFiles) {
    const relativePath = path.relative(backupPath, file);
    manifest.checksums[relativePath] = generateFileChecksum(file);
  }
  
  const manifestPath = path.join(backupPath, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`📋 Manifest created with ${Object.keys(manifest.checksums).length} file checksums`);
  
  return manifest;
}

/**
 * Generate SHA-256 checksum for a file
 */
function generateFileChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }
  
  return arrayOfFiles;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get directory size and file count
 */
function getDirectorySize(dirPath) {
  let size = 0;
  let fileCount = 0;
  
  if (!fs.existsSync(dirPath)) return { size: 0, fileCount: 0 };
  
  const files = getAllFiles(dirPath);
  for (const file of files) {
    const stats = fs.statSync(file);
    size += stats.size;
    fileCount++;
  }
  
  return { size, fileCount };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups() {
  console.log('🧹 Checking for old backups to clean up...');
  
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    return { cleaned: 0 };
  }
  
  const entries = fs.readdirSync(BACKUP_CONFIG.backupDir, { withFileTypes: true });
  const backups = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map(entry => ({
      name: entry.name,
      path: path.join(BACKUP_CONFIG.backupDir, entry.name),
      createdAt: fs.statSync(path.join(BACKUP_CONFIG.backupDir, entry.name)).birthtime
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  
  let cleaned = 0;
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - BACKUP_CONFIG.retentionDays);
  
  for (let i = 0; i < backups.length; i++) {
    const backup = backups[i];
    
    // Keep backups within retention period, but enforce max backup count
    if (i >= BACKUP_CONFIG.maxBackups || backup.createdAt < retentionDate) {
      try {
        fs.rmSync(backup.path, { recursive: true, force: true });
        
        // Also remove encrypted archive if exists
        const encryptedPath = `${backup.path}.tar.enc`;
        const zipEncPath = `${backup.path}.zip.enc`;
        if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);
        if (fs.existsSync(zipEncPath)) fs.unlinkSync(zipEncPath);
        
        cleaned++;
        console.log(`  🗑️  Removed old backup: ${backup.name}`);
      } catch (err) {
        console.warn(`  ⚠️  Failed to remove ${backup.name}:`, err.message);
      }
    }
  }
  
  console.log(`✅ Cleanup completed: ${cleaned} old backups removed`);
  return { cleaned, remaining: backups.length - cleaned };
}

/**
 * List all available backups
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_CONFIG.backupDir)) {
    return [];
  }
  
  const entries = fs.readdirSync(BACKUP_CONFIG.backupDir, { withFileTypes: true });
  
  return entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map(entry => {
      const backupPath = path.join(BACKUP_CONFIG.backupDir, entry.name);
      const stats = getDirectorySize(backupPath);
      const manifestPath = path.join(backupPath, 'manifest.json');
      
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {}
      }
      
      // Check for encrypted archive
      const hasEncrypted = fs.existsSync(`${backupPath}.tar.enc`) || 
                          fs.existsSync(`${backupPath}.zip.enc`);
      
      return {
        id: entry.name,
        path: backupPath,
        createdAt: manifest?.createdAt || fs.statSync(backupPath).birthtime.toISOString(),
        size: stats.size,
        formattedSize: formatBytes(stats.size),
        fileCount: stats.fileCount,
        hasEncrypted,
        manifest
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Main backup function
 */
async function createBackup(options = {}) {
  const {
    encryptionKey = process.env.BACKUP_ENCRYPTION_KEY,
    skipCleanup = false,
    performedBy = 'SYSTEM'
  } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HR-ERP BACKUP SYSTEM');
  console.log('='.repeat(60));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`👤 Performed by: ${performedBy}`);
  console.log('');
  
  const startTime = Date.now();
  const backupId = generateBackupId();
  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
  
  try {
    // Ensure backup directory exists
    ensureBackupDir();
    fs.mkdirSync(backupPath, { recursive: true });
    
    console.log(`📁 Backup ID: ${backupId}`);
    console.log(`📍 Location: ${backupPath}\n`);
    
    // Perform backups
    const results = {
      database: await backupDatabase(backupPath),
      files: await backupFiles(backupPath),
      config: await backupConfig(backupPath)
    };
    
    // Generate manifest
    const manifest = generateManifest(backupPath, results);
    
    // Create encrypted archive if key provided
    let encryptionResult = { encrypted: false };
    if (encryptionKey) {
      encryptionResult = await createEncryptedArchive(backupPath, encryptionKey);
    }
    
    // Cleanup old backups
    let cleanupResult = { cleaned: 0 };
    if (!skipCleanup) {
      cleanupResult = await cleanupOldBackups();
    }
    
    const duration = Date.now() - startTime;
    const totalSize = getDirectorySize(backupPath).size;
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📁 Backup ID: ${backupId}`);
    console.log(`📊 Total Size: ${formatBytes(totalSize)}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`🔐 Encrypted: ${encryptionResult.encrypted ? 'Yes' : 'No'}`);
    console.log(`🧹 Old backups removed: ${cleanupResult.cleaned}`);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      backupId,
      path: backupPath,
      createdAt: manifest.createdAt,
      duration,
      size: totalSize,
      formattedSize: formatBytes(totalSize),
      encrypted: encryptionResult.encrypted,
      results,
      manifest,
      cleanup: cleanupResult
    };
    
  } catch (error) {
    console.error('\n❌ BACKUP FAILED:', error.message);
    console.error(error.stack);
    
    // Cleanup failed backup
    try {
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
    } catch (e) {}
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupId) {
  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
  
  if (!fs.existsSync(backupPath)) {
    return { valid: false, error: 'Backup not found' };
  }
  
  const manifestPath = path.join(backupPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, error: 'Manifest not found' };
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const errors = [];
    let verified = 0;
    
    for (const [relativePath, expectedChecksum] of Object.entries(manifest.checksums)) {
      const filePath = path.join(backupPath, relativePath);
      
      if (!fs.existsSync(filePath)) {
        errors.push({ file: relativePath, error: 'File missing' });
        continue;
      }
      
      const actualChecksum = generateFileChecksum(filePath);
      if (actualChecksum !== expectedChecksum) {
        errors.push({ file: relativePath, error: 'Checksum mismatch' });
      } else {
        verified++;
      }
    }
    
    return {
      valid: errors.length === 0,
      verified,
      total: Object.keys(manifest.checksums).length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Export functions
module.exports = {
  createBackup,
  listBackups,
  verifyBackup,
  cleanupOldBackups,
  getDirectorySize,
  formatBytes,
  BACKUP_CONFIG
};

// Run backup if executed directly
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  createBackup({
    performedBy: 'CLI'
  }).then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}
