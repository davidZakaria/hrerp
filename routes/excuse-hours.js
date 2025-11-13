const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createAuditLog } = require('./audit');

// Manual excuse requests reset (Admin and Super Admin only)
router.post('/reset', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized - Admin or Super Admin role required' });
    }

    console.log(`Manual excuse requests reset initiated by ${admin.name} (${admin.email})`);
    
    const result = await User.updateMany(
      { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
      { $set: { excuseRequestsLeft: 2, excuseRequestsResetDate: new Date() } }
    );

    console.log(`Manual excuse requests reset completed. Updated ${result.modifiedCount} users.`);

    // Create audit log in database
    await createAuditLog({
      action: 'MANUAL_EXCUSE_REQUESTS_RESET',
      performedBy: admin._id,
      targetResource: 'user',
      description: `Manual reset of excuse requests for all users performed by ${admin.name}`,
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

    console.log(`Audit log created for manual excuse requests reset affecting ${result.modifiedCount} users.`);

    res.json({ 
      success: true,
      message: `Excuse requests successfully reset for ${result.modifiedCount} users`,
      usersUpdated: result.modifiedCount,
      resetValue: 2
    });

  } catch (error) {
    console.error('Error during manual excuse requests reset:', error);
    
    // Log the error in audit as well
    try {
      const admin = await User.findById(req.user.id);
      await createAuditLog({
        action: 'MANUAL_EXCUSE_REQUESTS_RESET',
        performedBy: admin._id,
        targetResource: 'user',
        description: `Failed manual excuse requests reset attempted by ${admin.name}`,
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
      message: 'Error during excuse requests reset',
      error: error.message 
    });
  }
});

// Get excuse requests status for all users (Admin and Super Admin only)
router.get('/status', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized - Admin or Super Admin role required' });
    }

    const users = await User.find(
      { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
      'name email department role excuseRequestsLeft excuseRequestsResetDate'
    );

    const stats = {
      totalUsers: users.length,
      usersWithFullRequests: users.filter(u => (u.excuseRequestsLeft || 0) === 2).length,
      usersWithPartialRequests: users.filter(u => (u.excuseRequestsLeft || 0) > 0 && (u.excuseRequestsLeft || 0) < 2).length,
      usersWithNoRequests: users.filter(u => (u.excuseRequestsLeft || 0) === 0).length,
      averageRequestsLeft: users.reduce((sum, u) => sum + (u.excuseRequestsLeft || 0), 0) / users.length
    };

    res.json({
      success: true,
      statistics: stats,
      users: users
    });

  } catch (error) {
    console.error('Error getting excuse requests status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving excuse requests status',
      error: error.message 
    });
  }
});

module.exports = router; 