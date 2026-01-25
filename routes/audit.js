const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const Audit = require('../models/Audit');
const User = require('../models/User');

// Helper function to create audit log
const createAuditLog = async (auditData) => {
  try {
    const audit = new Audit(auditData);
    await audit.save();
    return audit;
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

// Get all audit logs (Super Admin only)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin required.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.performedBy) filter.performedBy = req.query.performedBy;
    if (req.query.targetUser) filter.targetUser = req.query.targetUser;
    if (req.query.severity) filter.severity = req.query.severity;
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const audits = await Audit.find(filter)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Audit.countDocuments(filter);

    res.json({
      audits,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get audit statistics (Super Admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin required.' });
    }

    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: await Audit.countDocuments(),
      today: await Audit.countDocuments({
        timestamp: { $gte: new Date(today.toDateString()) }
      }),
      lastWeek: await Audit.countDocuments({
        timestamp: { $gte: lastWeek }
      }),
      lastMonth: await Audit.countDocuments({
        timestamp: { $gte: lastMonth }
      }),
      bySeverity: {
        LOW: await Audit.countDocuments({ severity: 'LOW' }),
        MEDIUM: await Audit.countDocuments({ severity: 'MEDIUM' }),
        HIGH: await Audit.countDocuments({ severity: 'HIGH' }),
        CRITICAL: await Audit.countDocuments({ severity: 'CRITICAL' })
      },
      byAction: await Audit.aggregate([
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      recentCritical: await Audit.find({ severity: 'CRITICAL' })
        .populate('performedBy', 'name email')
        .sort({ timestamp: -1 })
        .limit(5)
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get audit logs for a specific user (Super Admin only)
router.get('/user/:userId', auth, validateObjectId('userId'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin required.' });
    }

    const audits = await Audit.find({
      $or: [
        { performedBy: req.params.userId },
        { targetUser: req.params.userId }
      ]
    })
    .populate('performedBy', 'name email role')
    .populate('targetUser', 'name email')
    .sort({ timestamp: -1 })
    .limit(100);

    res.json(audits);
  } catch (err) {
    console.error('Error fetching user audit logs:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Download audit logs as CSV (Super Admin only)
router.get('/download', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin required.' });
    }

    // Build filter based on query parameters
    let filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.severity) filter.severity = req.query.severity;
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const audits = await Audit.find(filter)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email')
      .sort({ timestamp: -1 })
      .limit(10000); // Limit to prevent server overload

    // Create CSV content
    const csvHeaders = [
      'Timestamp',
      'Action',
      'Performed By',
      'Performer Role',
      'Target User',
      'Target Email',
      'Description',
      'Severity',
      'IP Address'
    ];

    const csvRows = audits.map(audit => [
      new Date(audit.timestamp).toLocaleString(),
      audit.action || '',
      audit.performedBy?.name || audit.performedBy || 'System',
      audit.performedBy?.role || 'N/A',
      audit.targetUser?.name || 'N/A',
      audit.targetUser?.email || 'N/A',
      (audit.description || '').replace(/"/g, '""'),
      audit.severity || 'LOW',
      audit.ipAddress || 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Set headers for file download
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Log the download action
    await createAuditLog({
      action: 'SUPER_ADMIN_ACTION',
      performedBy: user._id,
      targetResource: 'audit',
      description: `Audit logs downloaded by super admin ${user.name}`,
      details: {
        downloadedCount: audits.length,
        filters: filter,
        downloadDate: new Date()
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });

    res.send(csvContent);
  } catch (err) {
    console.error('Error downloading audit logs:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Clear old audit logs (Super Admin only)
router.post('/clear', auth, async (req, res) => {
  try {
    console.log('Clear audit logs request received:', req.body);
    
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Access denied. Super Admin required.' });
    }

    const { olderThanDays, confirmClear, deleteAll } = req.body;
    console.log('Request parameters:', { olderThanDays, confirmClear, deleteAll });

    if (!confirmClear) {
      return res.status(400).json({ msg: 'Confirmation required to clear audit logs' });
    }

    let deleteResult;
    let totalBefore = await Audit.countDocuments();
    console.log('Total audit logs before deletion:', totalBefore);

    if (deleteAll) {
      console.log('Deleting ALL audit logs...');
      // Delete ALL audit logs
      deleteResult = await Audit.deleteMany({});
      console.log('Delete ALL result:', deleteResult);
      
      // Log the clear action (this will be the only log left)
      await createAuditLog({
        action: 'SUPER_ADMIN_ACTION',
        performedBy: user._id,
        targetResource: 'audit',
        description: `ALL audit logs cleared by super admin ${user.name}. Deleted ${deleteResult.deletedCount} total logs.`,
        details: {
          deletedCount: deleteResult.deletedCount,
          deleteAll: true,
          totalBefore: totalBefore,
          clearDate: new Date()
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'CRITICAL'
      });
    } else {
      // Delete logs older than specified days
      const daysToKeep = olderThanDays || 90; // Default to keep 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      console.log(`Deleting logs older than ${daysToKeep} days (before ${cutoffDate.toISOString()})...`);

      // Get count before deletion
      const toDeleteCount = await Audit.countDocuments({
        timestamp: { $lt: cutoffDate }
      });
      console.log('Logs to be deleted:', toDeleteCount);

      // Delete old audit logs
      deleteResult = await Audit.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      console.log('Delete by date result:', deleteResult);

      // Log the clear action
      await createAuditLog({
        action: 'SUPER_ADMIN_ACTION',
        performedBy: user._id,
        targetResource: 'audit',
        description: `Audit logs cleared by super admin ${user.name}. Deleted ${deleteResult.deletedCount} logs older than ${daysToKeep} days.`,
        details: {
          deletedCount: deleteResult.deletedCount,
          daysToKeep: daysToKeep,
          cutoffDate: cutoffDate,
          totalBefore: totalBefore,
          totalAfter: await Audit.countDocuments(),
          clearDate: new Date()
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      });
    }

    const totalAfter = await Audit.countDocuments();
    console.log('Total audit logs after deletion:', totalAfter);
    console.log('Final delete result:', deleteResult);

    res.json({
      success: true,
      message: deleteAll 
        ? `Successfully cleared ALL ${deleteResult.deletedCount} audit logs`
        : `Successfully cleared ${deleteResult.deletedCount} audit logs older than ${olderThanDays || 90} days`,
      deletedCount: deleteResult.deletedCount,
      remainingCount: totalAfter,
      deleteAll: deleteAll || false
    });
  } catch (err) {
    console.error('Error clearing audit logs:', err);
    console.error('Full error stack:', err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Export the createAuditLog helper function
module.exports = { router, createAuditLog }; 