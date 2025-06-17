const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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
router.get('/user/:userId', auth, async (req, res) => {
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

// Export the createAuditLog helper function
module.exports = { router, createAuditLog }; 