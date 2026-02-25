const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Form = require('../models/Form');
const EmployeeFlag = require('../models/EmployeeFlag');
const JobApplication = require('../models/JobApplication');
const Evaluation = require('../models/Evaluation');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { createAuditLog } = require('./audit');
const Audit = require('../models/Audit');
const { validateObjectId } = require('../middleware/validateObjectId');

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

// Get employee summary for admin dashboard overview
router.get('/employee-summary', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all active employees (excluding super_admin for regular admins)
    const employeeFilter = admin.role === 'super_admin' 
      ? { status: 'active' }
      : { status: 'active', role: { $ne: 'super_admin' } };
    
    const employees = await User.find(employeeFilter).select('-password');
    const totalEmployees = employees.length;

    // Calculate average vacation days
    const totalVacationDays = employees.reduce((sum, emp) => sum + (emp.vacationDaysLeft || 0), 0);
    const averageVacationDays = totalEmployees > 0 ? (totalVacationDays / totalEmployees).toFixed(1) : 0;

    // Find employees with low vacation days (< 5 days)
    const lowVacationEmployees = employees
      .filter(emp => (emp.vacationDaysLeft || 0) < 5)
      .map(emp => ({
        _id: emp._id,
        name: emp.name,
        department: emp.department,
        vacationDaysLeft: emp.vacationDaysLeft || 0
      }))
      .sort((a, b) => a.vacationDaysLeft - b.vacationDaysLeft);

    // Get current month attendance records
    const attendanceRecords = await Attendance.find({ month: currentMonth });

    // Build attendance stats per user
    const userAttendanceMap = {};
    attendanceRecords.forEach(record => {
      const odId = record.odId;
      if (!userAttendanceMap[odId]) {
        userAttendanceMap[odId] = {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          totalDeductions: 0
        };
      }
      userAttendanceMap[odId].totalDays++;
      
      if (record.status === 'present' || record.status === 'late' || record.status === 'wfh') {
        userAttendanceMap[odId].presentDays++;
      }
      if (record.status === 'absent') {
        userAttendanceMap[odId].absentDays++;
      }
      if (record.status === 'late') {
        userAttendanceMap[odId].lateDays++;
      }
      userAttendanceMap[odId].totalDeductions += record.fingerprintDeduction || 0;
    });

    // Find employees with high absences (3+ this month)
    const highAbsenceEmployees = employees
      .filter(emp => {
        const stats = userAttendanceMap[emp.odId];
        return stats && stats.absentDays >= 3;
      })
      .map(emp => ({
        _id: emp._id,
        name: emp.name,
        department: emp.department,
        odId: emp.odId,
        absences: userAttendanceMap[emp.odId]?.absentDays || 0
      }))
      .sort((a, b) => b.absences - a.absences);

    // Find employees with fingerprint deductions
    const deductionEmployees = employees
      .filter(emp => {
        const stats = userAttendanceMap[emp.odId];
        return stats && stats.totalDeductions > 0;
      })
      .map(emp => ({
        _id: emp._id,
        name: emp.name,
        department: emp.department,
        odId: emp.odId,
        deductions: userAttendanceMap[emp.odId]?.totalDeductions || 0
      }))
      .sort((a, b) => b.deductions - a.deductions);

    // Calculate overall attendance rate
    let totalPresentDays = 0;
    let totalWorkDays = 0;
    Object.values(userAttendanceMap).forEach(stats => {
      totalPresentDays += stats.presentDays;
      totalWorkDays += stats.totalDays;
    });
    const attendanceRate = totalWorkDays > 0 
      ? ((totalPresentDays / totalWorkDays) * 100).toFixed(1) 
      : 100;

    // Calculate total deductions
    const totalDeductions = Object.values(userAttendanceMap)
      .reduce((sum, stats) => sum + stats.totalDeductions, 0);

    // Build complete employee list with all stats
    const allEmployeesData = employees.map(emp => {
      const stats = userAttendanceMap[emp.odId] || {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalDeductions: 0
      };
      
      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        role: emp.role,
        odId: emp.odId,
        vacationDaysLeft: emp.vacationDaysLeft || 0,
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        lateDays: stats.lateDays,
        totalDays: stats.totalDays,
        deductions: stats.totalDeductions,
        attendanceRate: stats.totalDays > 0 
          ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1)
          : '-'
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentMonth,
      totalEmployees,
      averageVacationDays: parseFloat(averageVacationDays),
      attendanceRate: parseFloat(attendanceRate),
      totalDeductions,
      allEmployees: allEmployeesData,
      lowVacationEmployees,
      highAbsenceEmployees,
      deductionEmployees,
      summary: {
        lowVacationCount: lowVacationEmployees.length,
        highAbsenceCount: highAbsenceEmployees.length,
        deductionCount: deductionEmployees.length
      }
    });
  } catch (err) {
    console.error('Employee summary error:', err.message);
    res.status(500).json({ msg: 'Server error fetching employee summary' });
  }
});

// Create new user (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { name, email, password, department, role, status, managedDepartments, employeeCode } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Check if employeeCode already exists (if provided)
    if (employeeCode) {
      const existingCode = await User.findOne({ employeeCode });
      if (existingCode) {
        return res.status(400).json({ msg: 'Biometric code already in use by another user' });
      }
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
      managedDepartments: (role === 'manager' && managedDepartments) ? managedDepartments : [],
      employeeCode: employeeCode || undefined
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
        managedDepartments: user.managedDepartments,
        employeeCode: user.employeeCode
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
router.put('/:userId/status', auth, validateObjectId('userId'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { status } = req.body;
    if (!['active', 'pending', 'inactive', 'draft'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Super admin cannot be deactivated
    if (user.role === 'super_admin' && status !== 'active') {
      return res.status(400).json({ msg: 'Super admin account cannot be deactivated' });
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
router.put('/:userId/vacation-days', auth, validateObjectId('userId'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
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
    
    // Store old value for audit logging
    const oldVacationDays = user.vacationDaysLeft;
    
    // Update vacation days
    user.vacationDaysLeft = vacationDaysLeft;
    await user.save();
    
    // Create audit log for vacation days modification
    await createAuditLog({
      action: 'VACATION_DAYS_MODIFIED',
      performedBy: admin._id,
      targetUser: user._id,
      targetResource: 'user',
      targetResourceId: user._id,
      description: `Vacation days for ${user.name} (${user.email}) changed from ${oldVacationDays} to ${vacationDaysLeft} by admin ${admin.name}`,
      oldValues: {
        vacationDaysLeft: oldVacationDays
      },
      newValues: {
        vacationDaysLeft: vacationDaysLeft
      },
      details: {
        targetUserName: user.name,
        targetUserEmail: user.email,
        targetUserDepartment: user.department,
        adminName: admin.name,
        adminEmail: admin.email,
        changeAmount: vacationDaysLeft - oldVacationDays
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });
    
    res.json({ msg: 'Vacation days updated', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Super Admin: Update any user - MUST be before PUT /:userId so /super/123 is not matched as userId="super"
router.put('/super/:userId', auth, validateObjectId('userId'), async (req, res) => {
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
      modificationReason,
      password,
      employeeCode,
      managedDepartments
    } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Validate role
    const validRoles = ['employee', 'manager', 'admin', 'super_admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ msg: 'Invalid role. Must be employee, manager, admin, or super_admin.' });
    }

    // Check if email is already taken by another user
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already in use by another user' });
      }
    }

    // Check if employeeCode is already taken by another user
    if (employeeCode !== undefined && employeeCode !== user.employeeCode) {
      const existingCode = await User.findOne({ employeeCode, _id: { $ne: user._id } });
      if (existingCode) {
        return res.status(400).json({ msg: 'Biometric code already in use by another user' });
      }
    }

    // Create modification history entry
    const modifications = [];
    if (name !== undefined && name !== user.name) modifications.push({ field: 'name', oldValue: user.name, newValue: name });
    if (email !== undefined && email !== user.email) modifications.push({ field: 'email', oldValue: user.email, newValue: email });
    if (department !== undefined && department !== user.department) modifications.push({ field: 'department', oldValue: user.department, newValue: department });
    if (role !== undefined && role !== user.role) modifications.push({ field: 'role', oldValue: user.role, newValue: role });
    if (vacationDaysLeft !== undefined && vacationDaysLeft !== user.vacationDaysLeft) modifications.push({ field: 'vacationDaysLeft', oldValue: user.vacationDaysLeft, newValue: vacationDaysLeft });
    if (status !== undefined && status !== user.status) modifications.push({ field: 'status', oldValue: user.status, newValue: status });
    if (password && password.trim().length >= 6) modifications.push({ field: 'password', oldValue: '***', newValue: '*** (changed)' });
    if (employeeCode !== undefined && employeeCode !== user.employeeCode) modifications.push({ field: 'employeeCode', oldValue: user.employeeCode || 'Not set', newValue: employeeCode || 'Removed' });

    // Update user fields - only update if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (department !== undefined) user.department = department;
    if (role !== undefined) user.role = role;
    const oldVacationDays = user.vacationDaysLeft;
    if (vacationDaysLeft !== undefined) user.vacationDaysLeft = vacationDaysLeft;

    // Managed departments - always update when role is manager (handles department assignment changes)
    const targetRole = role !== undefined ? role : user.role;
    if (targetRole === 'manager') {
      const sanitizedDepts = Array.isArray(managedDepartments)
        ? managedDepartments.filter(d => typeof d === 'string' && d.trim())
        : [];
      const newManagedDepts = sanitizedDepts.length > 0 ? sanitizedDepts : [(department || user.department)].filter(Boolean);
      const oldDepts = JSON.stringify((user.managedDepartments || []).sort());
      const newDepts = JSON.stringify(newManagedDepts.sort());
      if (oldDepts !== newDepts) modifications.push({ field: 'managedDepartments', oldValue: user.managedDepartments, newValue: newManagedDepts });
      user.managedDepartments = newManagedDepts;
    } else {
      user.managedDepartments = [];
    }

    // Never deactivate super_admin
    if (status !== undefined) {
      if (user.role !== 'super_admin' || status === 'active') {
        user.status = status;
      } else if (user.role === 'super_admin') {
        user.status = 'active';
      }
    }

    // Update employeeCode
    if (employeeCode !== undefined) {
      user.employeeCode = employeeCode || undefined;
    }

    // Update password if provided
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Add modifications to history
    modifications.forEach(mod => {
      user.modificationHistory.push({
        ...mod,
        modifiedBy: superAdmin._id,
        reason: modificationReason
      });
    });

    await user.save();

    // Audit log for vacation days if changed
    if (vacationDaysLeft !== undefined && vacationDaysLeft !== oldVacationDays) {
      await createAuditLog({
        action: 'VACATION_DAYS_MODIFIED',
        performedBy: superAdmin._id,
        targetUser: user._id,
        targetResource: 'user',
        targetResourceId: user._id,
        description: `Vacation days for ${user.name} (${user.email}) changed from ${oldVacationDays} to ${vacationDaysLeft} by super admin ${superAdmin.name}`,
        oldValues: { vacationDaysLeft: oldVacationDays },
        newValues: { vacationDaysLeft },
        details: { targetUserName: user.name, adminName: superAdmin.name, modificationReason },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH'
      });
    }

    res.json({ msg: 'User updated successfully', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error('Super admin user update error:', err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

// Update user (admin only) - MAIN UPDATE ROUTE
router.put('/:userId', auth, validateObjectId('userId'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { name, email, department, role, managedDepartments, password, status, employeeCode } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Validate role if provided
    const validRoles = ['employee', 'manager', 'admin', 'super_admin'];
    if (role !== undefined && !validRoles.includes(role)) {
      return res.status(400).json({ msg: 'Invalid role. Must be employee, manager, admin, or super_admin.' });
    }

    // Regular admins cannot set or change users to super_admin
    if (admin.role !== 'super_admin' && role === 'super_admin') {
      return res.status(403).json({ msg: 'Only super admins can assign the super admin role' });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already in use by another user' });
      }
    }

    // Check if employeeCode is already taken by another user
    if (employeeCode && employeeCode !== user.employeeCode) {
      const existingCode = await User.findOne({ employeeCode, _id: { $ne: user._id } });
      if (existingCode) {
        return res.status(400).json({ msg: 'Biometric code already in use by another user' });
      }
    }

    // Update user fields
    user.name = name;
    user.email = email;
    user.department = department;
    user.role = role;
    // Managed departments: when role is manager, sanitize and use provided array or fallback to [department]
    if (role === 'manager') {
      const sanitized = Array.isArray(managedDepartments)
        ? managedDepartments.filter(d => typeof d === 'string' && d.trim())
        : [];
      user.managedDepartments = sanitized.length > 0 ? sanitized : (department ? [department] : []);
    } else {
      user.managedDepartments = [];
    }
    
    // Update employeeCode (biometric code)
    if (employeeCode !== undefined) {
      user.employeeCode = employeeCode || undefined;
    }
    
    // Update status if provided (never deactivate super_admin)
    if (status && ['active', 'inactive', 'pending'].includes(status)) {
      if (user.role !== 'super_admin' || status === 'active') {
        user.status = status;
      }
    }
    
    // Update password if provided (admin can reset user password)
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

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

// Delete user (admin only) - full cascade delete
router.delete('/:userId', auth, validateObjectId('userId'), async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Block deletion of super_admin
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    if (user.role === 'super_admin') {
      if (superAdminCount <= 1) {
        return res.status(400).json({ msg: 'Cannot delete the last super admin' });
      }
      return res.status(400).json({ msg: 'Super admin cannot be deleted' });
    }

    const userId = user._id;

    // 1. Get forms for medical document paths
    const forms = await Form.find({ user: userId }).select('medicalDocument');
    for (const form of forms) {
      if (form.medicalDocument) {
        try {
          const fullPath = path.isAbsolute(form.medicalDocument)
            ? form.medicalDocument
            : path.join(__dirname, '..', form.medicalDocument);
          await fs.unlink(fullPath);
        } catch (e) {
          if (e.code !== 'ENOENT') console.warn('Failed to delete medical doc:', form.medicalDocument, e.message);
        }
      }
    }

    // 2. Delete EmployeeFlags (employee or flaggedBy)
    await EmployeeFlag.deleteMany({ $or: [{ employee: userId }, { flaggedBy: userId }] });

    // 3. Delete Evaluations where user is evaluator
    await Evaluation.deleteMany({ evaluator: userId });

    // 4. Clear assignedInterviewer on JobApplications (don't delete applications - they're external applicants)
    await JobApplication.updateMany(
      { assignedInterviewer: userId },
      { $unset: { assignedInterviewer: 1 } }
    );

    // 5. Delete Attendance records
    await Attendance.deleteMany({ user: userId });

    // 6. Delete Forms
    await Form.deleteMany({ user: userId });

    // 7. Audit log before delete
    await createAuditLog({
      action: 'USER_DELETED',
      performedBy: admin._id,
      targetUser: userId,
      description: `User deleted: ${user.name} (${user.email})`,
      details: {
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        department: user.department,
        role: user.role
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    });

    // 8. Delete user
    await User.findByIdAndDelete(userId);

    const deletedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      employeeCode: user.employeeCode,
      department: user.department
    };
    res.json({ msg: 'User deleted successfully', user: deletedUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Super Admin: Get all users with full details
router.get('/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'User not found. Please login again.', requestedId: req.user.id });
    }
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

// Super Admin: Get modification history for a user
router.get('/history/:userId', auth, validateObjectId('userId'), async (req, res) => {
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