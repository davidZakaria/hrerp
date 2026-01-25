/**
 * Backup API Routes
 * =================
 * Secure backup management endpoints for super_admin only.
 * 
 * Endpoints:
 * - POST /api/backup/create - Create a new backup
 * - GET /api/backup/list - List all backups
 * - GET /api/backup/:backupId - Get backup details
 * - POST /api/backup/:backupId/verify - Verify backup integrity
 * - DELETE /api/backup/:backupId - Delete a backup
 * - POST /api/backup/cleanup - Clean up old backups
 * - GET /api/backup/download/:backupId - Download backup (encrypted)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const multer = require('multer');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { createAuditLog } = require('./audit');
const {
  createBackup,
  listBackups,
  verifyBackup,
  cleanupOldBackups,
  BACKUP_CONFIG,
  formatBytes
} = require('../utils/backup');

// Configure multer for backup file uploads
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(BACKUP_CONFIG.backupDir, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `import-${Date.now()}-${file.originalname}`);
  }
});

const backupUpload = multer({
  storage: backupStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'), false);
    }
  }
});

/**
 * Middleware to check if user is super_admin or admin
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        msg: 'Authentication required. Please login.' 
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ 
        msg: 'User not found. Please login again.' 
      });
    }
    // Allow both super_admin and admin to access backup operations
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return res.status(403).json({ 
        msg: `Access denied. Admin privileges required. Your role: ${user.role}` 
      });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ msg: 'Server error during authorization' });
  }
};

/**
 * POST /api/backup/create
 * Create a new backup
 */
router.post('/create', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { encrypt = false } = req.body;
    
    console.log(`\n🔒 Backup requested by: ${req.adminUser.name} (${req.adminUser.email})`);
    
    // Create backup with optional encryption
    const result = await createBackup({
      encryptionKey: encrypt ? process.env.BACKUP_ENCRYPTION_KEY : null,
      performedBy: req.adminUser.email
    });
    
    if (result.success) {
      // Create audit log
      await createAuditLog({
        action: 'BACKUP_CREATED',
        performedBy: req.adminUser._id,
        targetResource: 'backup',
        targetResourceId: result.backupId,
        description: `Backup ${result.backupId} created by ${req.adminUser.name}`,
        details: {
          backupId: result.backupId,
          size: result.size,
          formattedSize: result.formattedSize,
          encrypted: result.encrypted,
          duration: result.duration,
          database: result.results.database?.success ? 'success' : 'failed',
          files: result.results.files?.totalFiles || 0,
          configFiles: result.results.config?.fileCount || 0
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      });
      
      res.json({
        success: true,
        msg: 'Backup created successfully',
        backup: {
          id: result.backupId,
          createdAt: result.createdAt,
          size: result.formattedSize,
          encrypted: result.encrypted,
          duration: `${(result.duration / 1000).toFixed(2)}s`,
          components: {
            database: result.results.database?.success || false,
            files: result.results.files?.totalFiles || 0,
            config: result.results.config?.fileCount || 0
          }
        }
      });
    } else {
      // Log failed backup attempt
      await createAuditLog({
        action: 'BACKUP_FAILED',
        performedBy: req.adminUser._id,
        targetResource: 'backup',
        description: `Backup creation failed: ${result.error}`,
        details: {
          error: result.error
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      });
      
      res.status(500).json({
        success: false,
        msg: 'Backup creation failed',
        error: result.error
      });
    }
  } catch (err) {
    console.error('Backup creation error:', err);
    res.status(500).json({
      success: false,
      msg: 'Server error during backup creation',
      error: err.message
    });
  }
});

/**
 * GET /api/backup/list
 * List all available backups
 */
router.get('/list', auth, requireSuperAdmin, async (req, res) => {
  try {
    const backups = listBackups();
    
    res.json({
      success: true,
      count: backups.length,
      backups: backups.map(b => ({
        id: b.id,
        createdAt: b.createdAt,
        size: b.formattedSize,
        fileCount: b.fileCount,
        encrypted: b.hasEncrypted,
        manifest: b.manifest ? {
          database: b.manifest.database?.success,
          files: b.manifest.files?.totalFiles,
          config: b.manifest.config?.fileCount
        } : null
      }))
    });
  } catch (err) {
    console.error('List backups error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error listing backups',
      error: err.message
    });
  }
});

/**
 * GET /api/backup/:backupId
 * Get detailed backup information
 */
router.get('/:backupId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const backups = listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        msg: 'Backup not found'
      });
    }
    
    res.json({
      success: true,
      backup: {
        id: backup.id,
        createdAt: backup.createdAt,
        path: backup.path,
        size: backup.formattedSize,
        sizeBytes: backup.size,
        fileCount: backup.fileCount,
        encrypted: backup.hasEncrypted,
        manifest: backup.manifest
      }
    });
  } catch (err) {
    console.error('Get backup details error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error getting backup details',
      error: err.message
    });
  }
});

/**
 * POST /api/backup/:backupId/verify
 * Verify backup integrity
 */
router.post('/:backupId/verify', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    
    console.log(`\n🔍 Verifying backup: ${backupId}`);
    
    const result = await verifyBackup(backupId);
    
    // Create audit log
    await createAuditLog({
      action: 'BACKUP_VERIFIED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupId,
      description: `Backup ${backupId} verification: ${result.valid ? 'PASSED' : 'FAILED'}`,
      details: {
        backupId,
        valid: result.valid,
        verified: result.verified,
        total: result.total,
        errors: result.errors
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: result.valid ? 'LOW' : 'HIGH'
    });
    
    res.json({
      success: true,
      backupId,
      verification: result
    });
  } catch (err) {
    console.error('Verify backup error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error verifying backup',
      error: err.message
    });
  }
});

/**
 * DELETE /api/backup/:backupId
 * Delete a specific backup
 */
router.delete('/:backupId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        msg: 'Backup not found'
      });
    }
    
    // Get backup info before deletion
    const backups = listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    // Delete backup directory
    fs.rmSync(backupPath, { recursive: true, force: true });
    
    // Delete encrypted archive if exists
    const encryptedPath = `${backupPath}.tar.enc`;
    const zipEncPath = `${backupPath}.zip.enc`;
    if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);
    if (fs.existsSync(zipEncPath)) fs.unlinkSync(zipEncPath);
    
    // Create audit log
    await createAuditLog({
      action: 'BACKUP_DELETED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupId,
      description: `Backup ${backupId} deleted by ${req.adminUser.name}`,
      details: {
        backupId,
        size: backup?.formattedSize,
        createdAt: backup?.createdAt
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    });
    
    console.log(`🗑️  Backup ${backupId} deleted by ${req.adminUser.email}`);
    
    res.json({
      success: true,
      msg: `Backup ${backupId} deleted successfully`
    });
  } catch (err) {
    console.error('Delete backup error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error deleting backup',
      error: err.message
    });
  }
});

/**
 * POST /api/backup/cleanup
 * Clean up old backups based on retention policy
 */
router.post('/cleanup', auth, requireSuperAdmin, async (req, res) => {
  try {
    console.log(`\n🧹 Backup cleanup requested by: ${req.adminUser.email}`);
    
    const result = await cleanupOldBackups();
    
    // Create audit log
    await createAuditLog({
      action: 'BACKUP_CLEANUP',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      description: `Backup cleanup: ${result.cleaned} backups removed`,
      details: {
        cleaned: result.cleaned,
        remaining: result.remaining,
        retentionDays: BACKUP_CONFIG.retentionDays,
        maxBackups: BACKUP_CONFIG.maxBackups
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });
    
    res.json({
      success: true,
      msg: `Cleanup completed: ${result.cleaned} backups removed`,
      result
    });
  } catch (err) {
    console.error('Backup cleanup error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error during backup cleanup',
      error: err.message
    });
  }
});

/**
 * GET /api/backup/download/:backupId
 * Download backup manifest (for verification)
 */
router.get('/download/:backupId/manifest', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const manifestPath = path.join(BACKUP_CONFIG.backupDir, backupId, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({
        success: false,
        msg: 'Backup manifest not found'
      });
    }
    
    // Log download
    await createAuditLog({
      action: 'BACKUP_MANIFEST_DOWNLOADED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupId,
      description: `Backup manifest downloaded for ${backupId}`,
      details: { backupId },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'LOW'
    });
    
    res.download(manifestPath, `${backupId}-manifest.json`);
  } catch (err) {
    console.error('Download manifest error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error downloading manifest',
      error: err.message
    });
  }
});

/**
 * GET /api/backup/config
 * Get backup configuration
 */
router.get('/config/settings', auth, requireSuperAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        backupDir: BACKUP_CONFIG.backupDir,
        retentionDays: BACKUP_CONFIG.retentionDays,
        maxBackups: BACKUP_CONFIG.maxBackups,
        uploadDirs: BACKUP_CONFIG.uploadDirs,
        encryptionAvailable: !!process.env.BACKUP_ENCRYPTION_KEY
      }
    });
  } catch (err) {
    console.error('Get config error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error getting backup configuration',
      error: err.message
    });
  }
});

/**
 * GET /api/backup/export/:backupId
 * Export/Download backup as a ZIP file
 */
router.get('/export/:backupId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        msg: 'Backup not found'
      });
    }
    
    console.log(`📦 Exporting backup: ${backupId}`);
    
    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupId}.zip"`);
    
    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, msg: 'Error creating archive' });
      }
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add backup directory to archive
    archive.directory(backupPath, backupId);
    
    // Finalize archive
    await archive.finalize();
    
    // Create audit log (after response is sent)
    await createAuditLog({
      action: 'BACKUP_EXPORTED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupId,
      description: `Backup ${backupId} exported/downloaded by ${req.adminUser.name}`,
      details: { backupId },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });
    
    console.log(`✅ Backup exported: ${backupId}`);
    
  } catch (err) {
    console.error('Export backup error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        msg: 'Error exporting backup',
        error: err.message
      });
    }
  }
});

/**
 * POST /api/backup/import
 * Import/Upload a backup ZIP file
 */
router.post('/import', auth, requireSuperAdmin, backupUpload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: 'No backup file uploaded'
      });
    }
    
    const uploadedFile = req.file.path;
    console.log(`📤 Importing backup from: ${req.file.originalname}`);
    
    // Extract the zip file
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(uploadedFile);
    
    // Get the backup folder name from zip
    const zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      fs.unlinkSync(uploadedFile);
      return res.status(400).json({
        success: false,
        msg: 'Empty or invalid backup file'
      });
    }
    
    // Find the root backup folder name
    let backupFolderName = zipEntries[0].entryName.split('/')[0];
    
    // Check if backup with this ID already exists
    const targetPath = path.join(BACKUP_CONFIG.backupDir, backupFolderName);
    if (fs.existsSync(targetPath)) {
      // Generate new backup ID to avoid conflict
      const timestamp = Date.now();
      backupFolderName = `imported-${timestamp}-${backupFolderName}`;
    }
    
    // Extract to backups directory
    const extractPath = BACKUP_CONFIG.backupDir;
    zip.extractAllTo(extractPath, true);
    
    // Rename if needed
    const extractedPath = path.join(extractPath, zipEntries[0].entryName.split('/')[0]);
    const finalPath = path.join(extractPath, backupFolderName);
    
    if (extractedPath !== finalPath && fs.existsSync(extractedPath)) {
      fs.renameSync(extractedPath, finalPath);
    }
    
    // Clean up uploaded file
    fs.unlinkSync(uploadedFile);
    
    // Verify the imported backup has a manifest
    const manifestPath = path.join(finalPath, 'manifest.json');
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    
    // Create audit log
    await createAuditLog({
      action: 'BACKUP_IMPORTED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupFolderName,
      description: `Backup imported from ${req.file.originalname} by ${req.adminUser.name}`,
      details: {
        originalFilename: req.file.originalname,
        backupId: backupFolderName,
        hasManifest: !!manifest
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    });
    
    console.log(`✅ Backup imported: ${backupFolderName}`);
    
    res.json({
      success: true,
      msg: 'Backup imported successfully',
      backup: {
        id: backupFolderName,
        originalFilename: req.file.originalname,
        hasManifest: !!manifest,
        manifest: manifest ? {
          createdAt: manifest.createdAt,
          database: manifest.database?.success,
          files: manifest.files?.totalFiles
        } : null
      }
    });
    
  } catch (err) {
    console.error('Import backup error:', err);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      msg: 'Error importing backup',
      error: err.message
    });
  }
});

/**
 * POST /api/backup/:backupId/restore
 * Restore from a backup (database only or full)
 */
router.post('/:backupId/restore', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const { restoreType = 'database' } = req.body; // 'database', 'files', or 'full'
    
    const backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        msg: 'Backup not found'
      });
    }
    
    console.log(`🔄 Restoring backup: ${backupId} (type: ${restoreType})`);
    
    const results = {
      database: null,
      files: null
    };
    
    // Restore database
    if (restoreType === 'database' || restoreType === 'full') {
      const dbBackupPath = path.join(backupPath, 'database');
      
      if (fs.existsSync(dbBackupPath)) {
        try {
          const mongoose = require('mongoose');
          
          // Find JSON files in database backup
          const jsonFiles = fs.readdirSync(dbBackupPath).filter(f => f.endsWith('.json'));
          
          if (jsonFiles.length > 0) {
            let restoredCollections = 0;
            let totalDocuments = 0;
            
            for (const file of jsonFiles) {
              const collectionName = path.basename(file, '.json');
              const filePath = path.join(dbBackupPath, file);
              
              try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                if (Array.isArray(data) && data.length > 0) {
                  // Drop existing collection
                  try {
                    await mongoose.connection.db.collection(collectionName).drop();
                  } catch (e) {
                    // Collection might not exist, ignore
                  }
                  
                  // Insert data
                  await mongoose.connection.db.collection(collectionName).insertMany(data);
                  restoredCollections++;
                  totalDocuments += data.length;
                  console.log(`  📄 Restored ${collectionName}: ${data.length} documents`);
                }
              } catch (collErr) {
                console.warn(`  ⚠️ Error restoring ${collectionName}:`, collErr.message);
              }
            }
            
            results.database = {
              success: true,
              collections: restoredCollections,
              documents: totalDocuments
            };
          } else {
            results.database = {
              success: false,
              error: 'No database files found in backup'
            };
          }
        } catch (dbErr) {
          results.database = {
            success: false,
            error: dbErr.message
          };
        }
      } else {
        results.database = {
          success: false,
          error: 'Database backup folder not found'
        };
      }
    }
    
    // Restore files
    if (restoreType === 'files' || restoreType === 'full') {
      const filesBackupPath = path.join(backupPath, 'files');
      
      if (fs.existsSync(filesBackupPath)) {
        try {
          let restoredFiles = 0;
          
          // Copy files back to uploads directory
          const copyDir = (src, dest) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true });
            }
            
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);
              
              if (entry.isDirectory()) {
                copyDir(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
                restoredFiles++;
              }
            }
          };
          
          // Restore each upload directory
          for (const uploadDir of BACKUP_CONFIG.uploadDirs) {
            const srcPath = path.join(filesBackupPath, uploadDir);
            const destPath = path.join(__dirname, '..', uploadDir);
            
            if (fs.existsSync(srcPath)) {
              copyDir(srcPath, destPath);
              console.log(`  📁 Restored ${uploadDir}`);
            }
          }
          
          results.files = {
            success: true,
            filesRestored: restoredFiles
          };
        } catch (fileErr) {
          results.files = {
            success: false,
            error: fileErr.message
          };
        }
      } else {
        results.files = {
          success: false,
          error: 'Files backup folder not found'
        };
      }
    }
    
    // Create audit log
    await createAuditLog({
      action: 'BACKUP_RESTORED',
      performedBy: req.adminUser._id,
      targetResource: 'backup',
      targetResourceId: backupId,
      description: `Backup ${backupId} restored (${restoreType}) by ${req.adminUser.name}`,
      details: {
        backupId,
        restoreType,
        results
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'CRITICAL'
    });
    
    console.log(`✅ Restore completed for: ${backupId}`);
    
    res.json({
      success: true,
      msg: `Backup restored successfully (${restoreType})`,
      results
    });
    
  } catch (err) {
    console.error('Restore backup error:', err);
    res.status(500).json({
      success: false,
      msg: 'Error restoring backup',
      error: err.message
    });
  }
});

module.exports = router;
