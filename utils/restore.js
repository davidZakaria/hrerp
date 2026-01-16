/**
 * HR-ERP Restore System
 * =====================
 * Comprehensive restore utility for recovering from backups.
 * 
 * WARNING: This script will OVERWRITE existing data!
 * Always verify the backup before restoring.
 * 
 * Usage:
 * - Restore all: node utils/restore.js <backupId>
 * - Restore database only: node utils/restore.js <backupId> --database-only
 * - Restore files only: node utils/restore.js <backupId> --files-only
 * - Dry run (preview): node utils/restore.js <backupId> --dry-run
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const util = require('util');
const readline = require('readline');

const execPromise = util.promisify(exec);

const { 
  BACKUP_CONFIG, 
  verifyBackup, 
  formatBytes,
  listBackups 
} = require('./backup');

/**
 * Prompt for user confirmation
 */
async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(`${message} (yes/no): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Decrypt backup archive
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
  
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Get MongoDB connection details
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
    return {
      host: 'localhost',
      port: '27017',
      database: 'hr-erp',
      uri: mongoURI
    };
  }
}

/**
 * Restore MongoDB database
 */
async function restoreDatabase(backupPath, options = {}) {
  const { dryRun = false } = options;
  const dbBackupPath = path.join(backupPath, 'database');
  
  console.log('\n💾 RESTORING DATABASE');
  console.log('─'.repeat(40));
  
  if (!fs.existsSync(dbBackupPath)) {
    console.log('⚠️  Database backup not found, skipping...');
    return { success: false, error: 'Database backup not found' };
  }
  
  const mongoConfig = getMongoConfig();
  console.log(`📊 Target database: ${mongoConfig.database}`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN: Would restore database from', dbBackupPath);
    return { success: true, dryRun: true };
  }
  
  try {
    // Check if this is a mongodump backup or JSON export
    const dbPath = fs.readdirSync(dbBackupPath);
    const isJsonBackup = dbPath.some(f => f.endsWith('.json'));
    
    if (isJsonBackup) {
      // Restore from JSON files
      return await restoreDatabaseFromJson(dbBackupPath, mongoConfig);
    } else {
      // Restore using mongorestore
      const mongoDatabasePath = path.join(dbBackupPath, mongoConfig.database);
      
      if (!fs.existsSync(mongoDatabasePath)) {
        // Try to find any database folder
        const dirs = fs.readdirSync(dbBackupPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        
        if (dirs.length > 0) {
          console.log(`📁 Found database: ${dirs[0]}`);
        }
      }
      
      let mongorestoreCmd = `mongorestore --uri="${mongoConfig.uri}" --gzip --drop "${dbBackupPath}"`;
      
      console.log('🔄 Running mongorestore...');
      const { stdout, stderr } = await execPromise(mongorestoreCmd, {
        timeout: 600000 // 10 minute timeout
      });
      
      if (stderr && !stderr.includes('done')) {
        console.warn('⚠️  Restore warnings:', stderr);
      }
      
      console.log('✅ Database restored successfully');
      return { success: true, method: 'mongorestore' };
    }
  } catch (error) {
    console.error('❌ Database restore failed:', error.message);
    
    // Try JSON fallback
    const jsonFiles = fs.existsSync(dbBackupPath) ? 
      fs.readdirSync(dbBackupPath).filter(f => f.endsWith('.json')) : [];
    
    if (jsonFiles.length > 0) {
      console.log('📝 Attempting JSON restore fallback...');
      return await restoreDatabaseFromJson(dbBackupPath, mongoConfig);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Restore database from JSON backup files
 */
async function restoreDatabaseFromJson(backupPath, mongoConfig) {
  console.log('📝 Restoring from JSON backup...');
  
  try {
    const mongoose = require('mongoose');
    
    // Ensure connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoConfig.uri);
      console.log('✅ Connected to MongoDB');
    }
    
    const jsonFiles = fs.readdirSync(backupPath).filter(f => f.endsWith('.json'));
    let restored = 0;
    
    for (const file of jsonFiles) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(backupPath, file);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (Array.isArray(data) && data.length > 0) {
          // Drop existing collection
          try {
            await mongoose.connection.db.collection(collectionName).drop();
          } catch (e) {
            // Collection might not exist
          }
          
          // Insert data
          await mongoose.connection.db.collection(collectionName).insertMany(data);
          restored++;
          console.log(`  📄 ${collectionName}: ${data.length} documents`);
        }
      } catch (err) {
        console.warn(`  ⚠️  Error restoring ${collectionName}:`, err.message);
      }
    }
    
    console.log(`✅ JSON restore completed: ${restored} collections`);
    return { success: true, method: 'json_import', collections: restored };
  } catch (error) {
    console.error('❌ JSON restore failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Restore uploaded files
 */
async function restoreFiles(backupPath, options = {}) {
  const { dryRun = false } = options;
  const filesBackupPath = path.join(backupPath, 'files');
  
  console.log('\n📂 RESTORING FILES');
  console.log('─'.repeat(40));
  
  if (!fs.existsSync(filesBackupPath)) {
    console.log('⚠️  Files backup not found, skipping...');
    return { success: false, error: 'Files backup not found' };
  }
  
  let restored = 0;
  let errors = [];
  
  for (const uploadDir of BACKUP_CONFIG.uploadDirs) {
    const sourcePath = path.join(filesBackupPath, uploadDir);
    const destPath = path.join(__dirname, '..', uploadDir);
    
    if (fs.existsSync(sourcePath)) {
      console.log(`📁 ${uploadDir}`);
      
      if (dryRun) {
        const files = getAllFiles(sourcePath);
        console.log(`   Would restore ${files.length} files`);
        continue;
      }
      
      try {
        // Ensure destination directory exists
        fs.mkdirSync(destPath, { recursive: true });
        
        // Copy files
        const files = getAllFiles(sourcePath);
        for (const file of files) {
          const relativePath = path.relative(sourcePath, file);
          const destFile = path.join(destPath, relativePath);
          const destDir = path.dirname(destFile);
          
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          fs.copyFileSync(file, destFile);
          restored++;
        }
        
        console.log(`   ✅ Restored ${files.length} files`);
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        errors.push({ dir: uploadDir, error: err.message });
      }
    } else {
      console.log(`   ⏭️  Not in backup`);
    }
  }
  
  if (dryRun) {
    return { success: true, dryRun: true };
  }
  
  console.log(`✅ Files restore completed: ${restored} files`);
  return { 
    success: errors.length === 0, 
    restored, 
    errors: errors.length > 0 ? errors : undefined 
  };
}

/**
 * Restore configuration files
 */
async function restoreConfig(backupPath, options = {}) {
  const { dryRun = false } = options;
  const configBackupPath = path.join(backupPath, 'config');
  
  console.log('\n⚙️  RESTORING CONFIGURATION');
  console.log('─'.repeat(40));
  
  if (!fs.existsSync(configBackupPath)) {
    console.log('⚠️  Config backup not found, skipping...');
    return { success: false, error: 'Config backup not found' };
  }
  
  let restored = 0;
  
  // Note: We don't auto-restore package.json to avoid version conflicts
  // Only restore safe config files
  const safeConfigs = ['config/default.json'];
  
  for (const configFile of safeConfigs) {
    const sourcePath = path.join(configBackupPath, configFile);
    const destPath = path.join(__dirname, '..', configFile);
    
    if (fs.existsSync(sourcePath)) {
      console.log(`📄 ${configFile}`);
      
      if (dryRun) {
        console.log('   Would restore config file');
        continue;
      }
      
      try {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Create backup of existing config
        if (fs.existsSync(destPath)) {
          const backupName = `${destPath}.bak.${Date.now()}`;
          fs.copyFileSync(destPath, backupName);
          console.log(`   📋 Backed up existing to ${path.basename(backupName)}`);
        }
        
        fs.copyFileSync(sourcePath, destPath);
        restored++;
        console.log('   ✅ Restored');
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
      }
    }
  }
  
  console.log(`✅ Config restore completed: ${restored} files`);
  return { success: true, restored };
}

/**
 * Get all files in directory recursively
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
 * Main restore function
 */
async function restore(backupId, options = {}) {
  const {
    databaseOnly = false,
    filesOnly = false,
    configOnly = false,
    dryRun = false,
    skipVerify = false,
    force = false
  } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log('🔄 HR-ERP RESTORE SYSTEM');
  console.log('='.repeat(60));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`📦 Backup ID: ${backupId}`);
  if (dryRun) console.log('🔍 MODE: DRY RUN (no changes will be made)');
  console.log('');
  
  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
  
  // Check if backup exists
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup not found:', backupPath);
    console.log('\n📋 Available backups:');
    const backups = listBackups();
    backups.forEach(b => console.log(`   - ${b.id} (${b.formattedSize})`));
    return { success: false, error: 'Backup not found' };
  }
  
  // Verify backup integrity
  if (!skipVerify) {
    console.log('🔍 Verifying backup integrity...');
    const verification = await verifyBackup(backupId);
    
    if (!verification.valid) {
      console.error('❌ Backup verification failed:', verification.error || 'Unknown error');
      if (verification.errors) {
        console.error('   Errors:', JSON.stringify(verification.errors, null, 2));
      }
      
      if (!force) {
        console.log('\n⚠️  Use --force to restore anyway (not recommended)');
        return { success: false, error: 'Verification failed' };
      }
      console.log('⚠️  Proceeding anyway due to --force flag');
    } else {
      console.log(`✅ Backup verified: ${verification.verified}/${verification.total} files OK`);
    }
  }
  
  // Warning and confirmation
  if (!dryRun && !force) {
    console.log('\n' + '⚠️'.repeat(30));
    console.log('WARNING: This will OVERWRITE existing data!');
    console.log('⚠️'.repeat(30));
    
    const confirmed = await promptConfirmation('Are you sure you want to proceed?');
    if (!confirmed) {
      console.log('❌ Restore cancelled by user');
      return { success: false, error: 'Cancelled by user' };
    }
  }
  
  const results = {};
  
  // Restore database
  if (!filesOnly && !configOnly) {
    results.database = await restoreDatabase(backupPath, { dryRun });
  }
  
  // Restore files
  if (!databaseOnly && !configOnly) {
    results.files = await restoreFiles(backupPath, { dryRun });
  }
  
  // Restore config
  if (!databaseOnly && !filesOnly) {
    results.config = await restoreConfig(backupPath, { dryRun });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN COMPLETED');
  } else {
    console.log('✅ RESTORE COMPLETED');
  }
  console.log('='.repeat(60));
  console.log('Results:');
  if (results.database) console.log(`  Database: ${results.database.success ? '✅' : '❌'}`);
  if (results.files) console.log(`  Files: ${results.files.success ? '✅' : '❌'} (${results.files.restored || 0} files)`);
  if (results.config) console.log(`  Config: ${results.config.success ? '✅' : '❌'} (${results.config.restored || 0} files)`);
  console.log('='.repeat(60) + '\n');
  
  if (!dryRun) {
    console.log('🔄 IMPORTANT: Restart the server to apply changes!');
  }
  
  return {
    success: true,
    dryRun,
    results
  };
}

// Export functions
module.exports = {
  restore,
  restoreDatabase,
  restoreFiles,
  restoreConfig,
  verifyBackup
};

// Run restore if executed directly
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
HR-ERP Restore System
=====================

Usage: node utils/restore.js <backupId> [options]

Options:
  --database-only    Restore only the database
  --files-only       Restore only uploaded files
  --config-only      Restore only configuration files
  --dry-run          Preview restore without making changes
  --skip-verify      Skip backup verification
  --force            Force restore without confirmation

Examples:
  node utils/restore.js backup-2024-01-15-10-30-00-abc123
  node utils/restore.js backup-2024-01-15-10-30-00-abc123 --dry-run
  node utils/restore.js backup-2024-01-15-10-30-00-abc123 --database-only

Available backups:
`);
    const backups = listBackups();
    if (backups.length === 0) {
      console.log('  No backups found');
    } else {
      backups.forEach(b => {
        console.log(`  - ${b.id}`);
        console.log(`    Created: ${b.createdAt}`);
        console.log(`    Size: ${b.formattedSize}`);
      });
    }
    process.exit(0);
  }
  
  const backupId = args[0];
  const options = {
    databaseOnly: args.includes('--database-only'),
    filesOnly: args.includes('--files-only'),
    configOnly: args.includes('--config-only'),
    dryRun: args.includes('--dry-run'),
    skipVerify: args.includes('--skip-verify'),
    force: args.includes('--force')
  };
  
  restore(backupId, options)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Restore failed:', err);
      process.exit(1);
    });
}
