const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { createAuditLog } = require('./audit');
const Audit = require('../models/Audit');

// Get all users (for admin)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create new user (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { name, email, password, department, role, status, managedDepartments } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      department,
      role: role || 'employee',
      status: status || 'active',
      vacationDaysLeft: 21,
      excuseHoursLeft: 2,
      managedDepartments: (role === 'manager' && managedDepartments) ? managedDepartments : []
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    
    // Create audit log
    await createAuditLog({
      action: 'USER_CREATED',
      performedBy: admin._id,
      targetUser: user._id,
      targetResource: 'user',
      targetResourceId: user._id,
      description: `User ${user.name} (${user.email}) created by admin ${admin.name}`,
      details: {
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        status: user.status,
        managedDepartments: user.managedDepartments
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });
    
    res.json({ msg: 'User created successfully', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update user status (approve/reject pending users) - MOVED BEFORE GENERAL UPDATE
router.put('/:userId/status', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { status } = req.body;
    if (!['active', 'pending', 'inactive'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ msg: 'User status updated successfully', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Update an employee's vacation days left - MOVED BEFORE GENERAL UPDATE  
router.put('/:userId/vacation-days', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const { vacationDaysLeft } = req.body;
    if (typeof vacationDaysLeft !== 'number' || vacationDaysLeft < 0) {
      return res.status(400).json({ msg: 'Invalid vacation days value' });
    }
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    user.vacationDaysLeft = vacationDaysLeft;
    await user.save();
    res.json({ msg: 'Vacation days updated', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update user (admin only) - MAIN UPDATE ROUTE
router.put('/:userId', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { name, email, department, role, managedDepartments } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already in use by another user' });
      }
    }

    // Update user fields
    user.name = name;
    user.email = email;
    user.department = department;
    user.role = role;
    user.managedDepartments = (role === 'manager' && managedDepartments) ? managedDepartments : [];

    await user.save();
    
    // Create audit log
    await createAuditLog({
      action: 'USER_UPDATED',
      performedBy: admin._id,
      targetUser: user._id,
      targetResource: 'user',
      targetResourceId: user._id,
      description: `User ${user.name} (${user.email}) updated by admin ${admin.name}`,
      details: {
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        managedDepartments: user.managedDepartments
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });
    
    res.json({ msg: 'User updated successfully', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete user (admin only)
router.delete('/:userId', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Super Admin: Get all users with full details
router.get('/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized as super admin' });
    }
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Super Admin: Update any user
router.put('/super/:userId', auth, async (req, res) => {
  try {
    const superAdmin = await User.findById(req.user.id);
    if (superAdmin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized as super admin' });
    }

    const {
      name,
      email,
      department,
      role,
      vacationDaysLeft,
      status,
      modificationReason
    } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Create modification history entry
    const modifications = [];
    if (name !== user.name) modifications.push({ field: 'name', oldValue: user.name, newValue: name });
    if (email !== user.email) modifications.push({ field: 'email', oldValue: user.email, newValue: email });
    if (department !== user.department) modifications.push({ field: 'department', oldValue: user.department, newValue: department });
    if (role !== user.role) modifications.push({ field: 'role', oldValue: user.role, newValue: role });
    if (vacationDaysLeft !== user.vacationDaysLeft) modifications.push({ field: 'vacationDaysLeft', oldValue: user.vacationDaysLeft, newValue: vacationDaysLeft });
    if (status !== user.status) modifications.push({ field: 'status', oldValue: user.status, newValue: status });

    // Update user fields
    user.name = name;
    user.email = email;
    user.department = department;
    user.role = role;
    user.vacationDaysLeft = vacationDaysLeft;
    user.status = status;

    // Add modifications to history
    modifications.forEach(mod => {
      user.modificationHistory.push({
        ...mod,
        modifiedBy: superAdmin._id,
        reason: modificationReason
      });
    });

    await user.save();
    res.json({ msg: 'User updated successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Super Admin: Get modification history for a user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const superAdmin = await User.findById(req.user.id);
    if (superAdmin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized as super admin' });
    }

    const user = await User.findById(req.params.userId)
      .populate('modificationHistory.modifiedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user.modificationHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create Super Admin (Initial Setup)
router.post('/create-super-admin', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if a super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            return res.status(400).json({ msg: 'Super admin already exists' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new super admin user
        user = new User({
            name: name || 'Super Admin',
            email,
            password,
            role: 'super_admin',
            department: 'Administration',
            status: 'active',
            vacationDaysLeft: 21
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get team members for manager
router.get('/team-members', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        // Find users in departments that this manager manages
        const teamMembers = await User.find({
            department: { $in: manager.managedDepartments },
            role: 'employee',
            status: 'active'
        }).select('name email department vacationDaysLeft role');

        res.json(teamMembers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Manual excuse hours reset (Admin and Super Admin only)
router.post('/reset-excuse-hours', auth, async (req, res) => {
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

module.exports = router; 