const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createAuditLog } = require('./audit');

// Manual excuse hours reset (Admin and Super Admin only)
router.post('/reset', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized - Admin or Super Admin role required' });
    }

    console.log(`Manual excuse hours reset initiated by ${admin.name} (${admin.email})`);
    
    const result = await User.updateMany(
      { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
      { $set: { excuseHoursLeft: 2 } }
    );

    console.log(`Manual excuse hours reset completed. Updated ${result.modifiedCount} users.`);

    // Create audit log in database
    await createAuditLog({
      action: 'MANUAL_EXCUSE_HOURS_RESET',
      performedBy: admin._id,
      targetResource: 'user',
      description: `Manual reset of excuse hours for all users performed by ${admin.name}`,
      details: {
        usersUpdated: result.modifiedCount,
        resetValue: 2,
        resetDate: new Date(),
        initiatedBy: admin.name,
        initiatedByEmail: admin.email
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });

    console.log(`Audit log created for manual excuse hours reset affecting ${result.modifiedCount} users.`);

    res.json({ 
      success: true,
      message: `Excuse hours successfully reset for ${result.modifiedCount} users`,
      usersUpdated: result.modifiedCount,
      resetValue: 2
    });

  } catch (error) {
    console.error('Error during manual excuse hours reset:', error);
    
    // Log the error in audit as well
    try {
      const admin = await User.findById(req.user.id);
      await createAuditLog({
        action: 'MANUAL_EXCUSE_HOURS_RESET',
        performedBy: admin._id,
        targetResource: 'user',
        description: `Failed manual excuse hours reset attempted by ${admin.name}`,
        details: {
          error: error.message,
          failureDate: new Date(),
          attemptedBy: admin.name,
          attemptedByEmail: admin.email
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      });
    } catch (auditError) {
      console.error('Failed to create audit log for reset error:', auditError);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error during excuse hours reset',
      error: error.message 
    });
  }
});

// Get excuse hours status for all users (Admin and Super Admin only)
router.get('/status', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized - Admin or Super Admin role required' });
    }

    const users = await User.find(
      { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
      'name email department role excuseHoursLeft'
    );

    const stats = {
      totalUsers: users.length,
      usersWithFullHours: users.filter(u => u.excuseHoursLeft === 2).length,
      usersWithPartialHours: users.filter(u => u.excuseHoursLeft > 0 && u.excuseHoursLeft < 2).length,
      usersWithNoHours: users.filter(u => u.excuseHoursLeft === 0).length,
      averageHoursLeft: users.reduce((sum, u) => sum + u.excuseHoursLeft, 0) / users.length
    };

    res.json({
      success: true,
      statistics: stats,
      users: users
    });

  } catch (error) {
    console.error('Error getting excuse hours status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving excuse hours status',
      error: error.message 
    });
  }
});

module.exports = router; 