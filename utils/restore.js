/**
 * HR-ERP Restore System
 * =====================
 * Shared restore logic for CLI and API.
 *
 * Usage (CLI):
 *   node utils/restore.js <backupId> [--database-only|--files-only|--full] [--dry-run] [--force]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { EJSON } = require('bson');

const {
  BACKUP_CONFIG,
  verifyBackup,
  listBackups,
  decryptData,
  getMongoConfig
} = require('./backup');

function log(message, quiet) {
  if (!quiet) console.log(message);
}

function logError(message, quiet) {
  if (!quiet) console.error(message);
}

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  for (const file of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }

  return arrayOfFiles;
}

function runProcess(command, args, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
      }
    });
  });
}

function detectDatabaseBackupFormat(dbBackupPath) {
  if (!fs.existsSync(dbBackupPath)) return 'missing';

  const rootJson = fs.readdirSync(dbBackupPath).filter((f) => f.endsWith('.json'));
  if (rootJson.length > 0) return 'json';

  const allFiles = getAllFiles(dbBackupPath);
  if (allFiles.some((f) => f.endsWith('.bson') || f.endsWith('.bson.gz') || f.endsWith('.metadata.json.gz'))) {
    return 'mongodump';
  }

  return 'unknown';
}

async function disconnectMongooseIfConnected() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    return true;
  }
  return false;
}

async function reconnectMongoose(uri) {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
}

async function runMongorestore(dbBackupPath, mongoConfig, quiet = false) {
  log('🔄 Running mongorestore...', quiet);
  const args = ['--uri', mongoConfig.uri, '--gzip', '--drop', dbBackupPath];
  const { stderr } = await runProcess('mongorestore', args);
  if (stderr && !quiet) {
    log(`mongorestore: ${stderr.trim()}`, quiet);
  }
}

function readJsonBackupDocuments(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return EJSON.parse(raw);
  } catch (_) {
    return JSON.parse(raw);
  }
}

function normalizeDocuments(data) {
  if (!Array.isArray(data)) return [];
  return data.map((doc) => EJSON.deserialize(EJSON.serialize(doc)));
}

/**
 * Restore MongoDB from backup folder.
 */
async function restoreDatabase(backupPath, options = {}) {
  const { dryRun = false, quiet = false } = options;
  const dbBackupPath = path.join(backupPath, 'database');

  log('\n💾 RESTORING DATABASE', quiet);
  log('─'.repeat(40), quiet);

  if (!fs.existsSync(dbBackupPath)) {
    return { success: false, error: 'Database backup not found' };
  }

  const mongoConfig = getMongoConfig();
  const format = detectDatabaseBackupFormat(dbBackupPath);
  log(`📊 Target: ${mongoConfig.database} (${format})`, quiet);

  if (dryRun) {
    return { success: true, dryRun: true, method: format };
  }

  if (format === 'json') {
    return restoreDatabaseFromJson(dbBackupPath, mongoConfig, quiet);
  }

  if (format === 'mongodump') {
    let reconnected = false;
    try {
      reconnected = await disconnectMongooseIfConnected();
      await runMongorestore(dbBackupPath, mongoConfig, quiet);
      log('✅ Database restored via mongorestore', quiet);
      return { success: true, method: 'mongorestore' };
    } catch (error) {
      logError(`❌ mongorestore failed: ${error.message}`, quiet);

      if (detectDatabaseBackupFormat(dbBackupPath) === 'json') {
        log('📝 Falling back to JSON restore...', quiet);
        return restoreDatabaseFromJson(dbBackupPath, mongoConfig, quiet);
      }

      return { success: false, error: error.message, method: 'mongorestore' };
    } finally {
      if (reconnected) {
        try {
          await reconnectMongoose(mongoConfig.uri);
        } catch (err) {
          logError(`⚠️  Reconnect after restore failed: ${err.message}`, quiet);
        }
      }
    }
  }

  return {
    success: false,
    error: 'Unrecognized database backup format (expected mongodump or JSON export)'
  };
}

async function restoreDatabaseFromJson(backupPath, mongoConfig, quiet = false) {
  log('📝 Restoring from JSON backup...', quiet);

  const mongoose = require('mongoose');
  let disconnectedForRestore = false;

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoConfig.uri);
      log('✅ Connected to MongoDB', quiet);
    }

    const jsonFiles = fs.readdirSync(backupPath).filter((f) => f.endsWith('.json'));
    let restored = 0;
    let totalDocuments = 0;
    const errors = [];

    for (const file of jsonFiles) {
      const collectionName = path.basename(file, '.json');
      const filePath = path.join(backupPath, file);

      try {
        const parsed = readJsonBackupDocuments(filePath);
        const data = normalizeDocuments(parsed);

        if (data.length === 0) continue;

        try {
          await mongoose.connection.db.collection(collectionName).drop();
        } catch (_) {
          // collection may not exist
        }

        const result = await mongoose.connection.db.collection(collectionName).insertMany(data, { ordered: false });
        const inserted = result.insertedCount ?? data.length;
        restored += 1;
        totalDocuments += inserted;
        log(`  📄 ${collectionName}: ${inserted} documents`, quiet);
      } catch (err) {
        errors.push({ collection: collectionName, error: err.message });
        logError(`  ⚠️  ${collectionName}: ${err.message}`, quiet);
      }
    }

    if (restored === 0 && errors.length > 0) {
      return { success: false, method: 'json_import', errors };
    }

    return {
      success: errors.length === 0,
      method: 'json_import',
      collections: restored,
      documents: totalDocuments,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return { success: false, error: error.message, method: 'json_import' };
  } finally {
    if (disconnectedForRestore) {
      try {
        await reconnectMongoose(mongoConfig.uri);
      } catch (_) {}
    }
  }
}

async function restoreFiles(backupPath, options = {}) {
  const { dryRun = false, quiet = false } = options;
  const filesBackupPath = path.join(backupPath, 'files');

  log('\n📂 RESTORING FILES', quiet);
  log('─'.repeat(40), quiet);

  if (!fs.existsSync(filesBackupPath)) {
    return { success: false, error: 'Files backup not found' };
  }

  let restored = 0;
  const errors = [];

  for (const uploadDir of BACKUP_CONFIG.uploadDirs) {
    const sourcePath = path.join(filesBackupPath, uploadDir);
    const destPath = path.join(__dirname, '..', uploadDir);

    if (!fs.existsSync(sourcePath)) {
      log(`   ⏭️  ${uploadDir} not in backup`, quiet);
      continue;
    }

    log(`📁 ${uploadDir}`, quiet);

    if (dryRun) {
      const files = getAllFiles(sourcePath);
      log(`   Would restore ${files.length} files`, quiet);
      continue;
    }

    try {
      fs.mkdirSync(destPath, { recursive: true });
      const files = getAllFiles(sourcePath);

      for (const file of files) {
        const relativePath = path.relative(sourcePath, file);
        const destFile = path.join(destPath, relativePath);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(file, destFile);
        restored += 1;
      }

      log(`   ✅ Restored ${files.length} files`, quiet);
    } catch (err) {
      errors.push({ dir: uploadDir, error: err.message });
      logError(`   ❌ ${uploadDir}: ${err.message}`, quiet);
    }
  }

  if (dryRun) {
    return { success: true, dryRun: true };
  }

  return {
    success: errors.length === 0,
    restored,
    filesRestored: restored,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function restoreConfig(backupPath, options = {}) {
  const { dryRun = false, quiet = false } = options;
  const configBackupPath = path.join(backupPath, 'config');

  log('\n⚙️  RESTORING CONFIGURATION', quiet);
  log('─'.repeat(40), quiet);

  if (!fs.existsSync(configBackupPath)) {
    return { success: false, skipped: true, error: 'Config backup not found' };
  }

  let restored = 0;
  const safeConfigs = ['config/default.json'];

  for (const configFile of safeConfigs) {
    const sourcePath = path.join(configBackupPath, configFile);
    const destPath = path.join(__dirname, '..', configFile);

    if (!fs.existsSync(sourcePath)) continue;

    if (dryRun) {
      log(`   Would restore ${configFile}`, quiet);
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      if (fs.existsSync(destPath)) {
        fs.copyFileSync(destPath, `${destPath}.bak.${Date.now()}`);
      }
      fs.copyFileSync(sourcePath, destPath);
      restored += 1;
      log(`   ✅ ${configFile}`, quiet);
    } catch (err) {
      logError(`   ❌ ${configFile}: ${err.message}`, quiet);
    }
  }

  return { success: restored > 0 || dryRun, restored, skipped: restored === 0 && !dryRun };
}

function evaluateRestoreSuccess(results, restoreType) {
  if (restoreType === 'database') {
    return results.database?.success === true;
  }
  if (restoreType === 'files') {
    return results.files?.success === true;
  }
  if (restoreType === 'config') {
    return results.config?.success === true;
  }
  if (restoreType === 'full') {
    const dbOk = results.database?.success === true;
    const filesOk = results.files?.success === true;
    return dbOk && filesOk;
  }
  return false;
}

function buildFailureMessage(results, restoreType) {
  const parts = [];
  if ((restoreType === 'database' || restoreType === 'full') && results.database && !results.database.success) {
    parts.push(`Database: ${results.database.error || 'failed'}`);
  }
  if ((restoreType === 'files' || restoreType === 'full') && results.files && !results.files.success) {
    parts.push(`Files: ${results.files.error || 'failed'}`);
  }
  if (restoreType === 'full' && results.config && results.config.error && !results.config.skipped) {
    parts.push(`Config: ${results.config.error}`);
  }
  return parts.join('; ') || 'Restore failed';
}

/**
 * API-friendly restore entry point (no interactive prompts).
 */
async function restoreFromBackupId(backupId, options = {}) {
  const {
    restoreType = 'database',
    skipVerify = false,
    force = false,
    quiet = true
  } = options;

  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      error: 'Backup not found',
      results: {}
    };
  }

  if (!skipVerify && !force) {
    const verification = await verifyBackup(backupId);
    if (!verification.valid) {
      return {
        success: false,
        error: verification.error || 'Backup verification failed',
        verification,
        results: {}
      };
    }
  }

  const results = {};

  if (restoreType === 'database' || restoreType === 'full') {
    results.database = await restoreDatabase(backupPath, { quiet });
  }

  if (restoreType === 'files' || restoreType === 'full') {
    results.files = await restoreFiles(backupPath, { quiet });
  }

  if (restoreType === 'full') {
    results.config = await restoreConfig(backupPath, { quiet });
  }

  const success = evaluateRestoreSuccess(results, restoreType);

  return {
    success,
    results,
    msg: success ? `Restore completed (${restoreType})` : buildFailureMessage(results, restoreType),
    requiresRestart: success && (restoreType === 'database' || restoreType === 'full')
  };
}

/**
 * CLI restore with confirmation and logging.
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

  let restoreType = 'full';
  if (databaseOnly) restoreType = 'database';
  else if (filesOnly) restoreType = 'files';
  else if (configOnly) restoreType = 'config';

  console.log('\n' + '='.repeat(60));
  console.log('🔄 HR-ERP RESTORE SYSTEM');
  console.log('='.repeat(60));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`📦 Backup ID: ${backupId}`);
  if (dryRun) console.log('🔍 MODE: DRY RUN');
  console.log('');

  const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup not found:', backupPath);
    listBackups().forEach((b) => console.log(`   - ${b.id}`));
    return { success: false, error: 'Backup not found', results: {} };
  }

  if (!skipVerify) {
    console.log('🔍 Verifying backup integrity...');
    const verification = await verifyBackup(backupId);
    if (!verification.valid) {
      console.error('❌ Verification failed:', verification.error || verification.errors);
      if (!force) {
        return { success: false, error: 'Verification failed', results: {} };
      }
      console.log('⚠️  Proceeding due to --force');
    } else {
      console.log(`✅ Verified ${verification.verified}/${verification.total} files`);
    }
  }

  if (!dryRun && !force) {
    console.log('\n⚠️  WARNING: This will OVERWRITE existing data!');
    const confirmed = await promptConfirmation('Are you sure you want to proceed?');
    if (!confirmed) {
      return { success: false, error: 'Cancelled by user', results: {} };
    }
  }

  const results = {};

  if (databaseOnly) {
    results.database = await restoreDatabase(backupPath, { dryRun });
  } else if (filesOnly) {
    results.files = await restoreFiles(backupPath, { dryRun });
  } else if (configOnly) {
    results.config = await restoreConfig(backupPath, { dryRun });
  } else {
    results.database = await restoreDatabase(backupPath, { dryRun });
    results.files = await restoreFiles(backupPath, { dryRun });
    results.config = await restoreConfig(backupPath, { dryRun });
  }

  const effectiveType = configOnly ? 'config' : databaseOnly ? 'database' : filesOnly ? 'files' : 'full';
  const success = dryRun ? true : evaluateRestoreSuccess(results, effectiveType);

  console.log('\n' + '='.repeat(60));
  console.log(success ? '✅ RESTORE COMPLETED' : '❌ RESTORE FAILED');
  console.log('='.repeat(60));
  if (results.database) console.log(`  Database: ${results.database.success ? '✅' : '❌'}`);
  if (results.files) console.log(`  Files: ${results.files.success ? '✅' : '❌'} (${results.files.restored || results.files.filesRestored || 0} files)`);
  if (results.config) console.log(`  Config: ${results.config.success ? '✅' : '❌'}`);
  console.log('='.repeat(60));
  if (success && !dryRun) {
    console.log('🔄 Restart the server (pm2 restart hr-erp-backend) to apply database changes.');
  }

  return { success, dryRun, results };
}

module.exports = {
  restore,
  restoreFromBackupId,
  restoreDatabase,
  restoreFiles,
  restoreConfig,
  verifyBackup,
  detectDatabaseBackupFormat,
  evaluateRestoreSuccess
};

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
  --dry-run          Preview without changes
  --skip-verify      Skip checksum verification
  --force            Skip confirmation / verification failures
`);
    process.exit(0);
  }

  restore(args[0], {
    databaseOnly: args.includes('--database-only'),
    filesOnly: args.includes('--files-only'),
    configOnly: args.includes('--config-only'),
    dryRun: args.includes('--dry-run'),
    skipVerify: args.includes('--skip-verify'),
    force: args.includes('--force')
  })
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((err) => {
      console.error('Restore failed:', err);
      process.exit(1);
    });
}
