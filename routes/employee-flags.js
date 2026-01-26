const express = require('express');
const router = express.Router();
const EmployeeFlag = require('../models/EmployeeFlag');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { createAuditLog } = require('./audit');

// @route   POST /api/employee-flags
// @desc    Create a new employee flag (Manager only for their team)
// @access  Private (Manager, Admin, Super Admin)
router.post('/', auth, async (req, res) => {
    try {
        const { employeeId, type, reason } = req.body;

        // Validate required fields
        if (!employeeId || !type || !reason) {
            return res.status(400).json({ msg: 'Employee ID, type, and reason are required' });
        }

        // Validate type
        if (!['deduction', 'reward'].includes(type)) {
            return res.status(400).json({ msg: 'Type must be either "deduction" or "reward"' });
        }

        // Get the current user
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if user has permission to flag employees
        if (!['manager', 'admin', 'super_admin'].includes(currentUser.role)) {
            return res.status(403).json({ msg: 'Not authorized to flag employees' });
        }

        // Get the employee being flagged
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ msg: 'Employee not found' });
        }

        // Managers can only flag employees in their managed departments
        if (currentUser.role === 'manager') {
            if (!currentUser.managedDepartments || !currentUser.managedDepartments.includes(employee.department)) {
                return res.status(403).json({ msg: 'You can only flag employees in your managed departments' });
            }
        }

        // Create the flag
        const flag = new EmployeeFlag({
            employee: employeeId,
            flaggedBy: req.user.id,
            type,
            reason
        });

        await flag.save();

        // Populate the flag for response
        await flag.populate('employee', 'name email department');
        await flag.populate('flaggedBy', 'name email');

        // Create audit log
        await createAuditLog({
            action: 'EMPLOYEE_FLAG_CREATED',
            performedBy: req.user.id,
            targetResource: 'employee_flag',
            targetResourceId: flag._id,
            description: `${type === 'deduction' ? 'Deduction' : 'Reward'} flag created for ${employee.name}`,
            details: {
                employeeId,
                employeeName: employee.name,
                flagType: type,
                reason
            },
            severity: type === 'deduction' ? 'MEDIUM' : 'LOW'
        });

        res.status(201).json({
            success: true,
            msg: `${type === 'deduction' ? 'Deduction' : 'Reward'} flag created successfully`,
            flag
        });

    } catch (error) {
        console.error('Error creating employee flag:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   GET /api/employee-flags/my-flags
// @desc    Get current user's own flags
// @access  Private
router.get('/my-flags', auth, async (req, res) => {
    try {
        const flags = await EmployeeFlag.find({
            employee: req.user.id,
            isActive: true
        })
        .populate('flaggedBy', 'name email')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: flags.length,
            flags
        });

    } catch (error) {
        console.error('Error fetching user flags:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   GET /api/employee-flags/team
// @desc    Get flags for manager's team members
// @access  Private (Manager only)
router.get('/team', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (currentUser.role !== 'manager') {
            return res.status(403).json({ msg: 'Only managers can access team flags' });
        }

        if (!currentUser.managedDepartments || currentUser.managedDepartments.length === 0) {
            return res.json({
                success: true,
                count: 0,
                flags: []
            });
        }

        // Get all employees in managed departments
        const teamMembers = await User.find({
            department: { $in: currentUser.managedDepartments },
            status: 'active'
        }).select('_id');

        const teamMemberIds = teamMembers.map(m => m._id);

        // Get flags for these employees
        const flags = await EmployeeFlag.find({
            employee: { $in: teamMemberIds },
            isActive: true
        })
        .populate('employee', 'name email department')
        .populate('flaggedBy', 'name email')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: flags.length,
            flags
        });

    } catch (error) {
        console.error('Error fetching team flags:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   GET /api/employee-flags/all
// @desc    Get all flags (Admin/Super Admin only)
// @access  Private (Admin, Super Admin)
router.get('/all', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!['admin', 'super_admin'].includes(currentUser.role)) {
            return res.status(403).json({ msg: 'Only admins can access all flags' });
        }

        const { includeInactive } = req.query;
        const query = includeInactive === 'true' ? {} : { isActive: true };

        const flags = await EmployeeFlag.find(query)
            .populate('employee', 'name email department')
            .populate('flaggedBy', 'name email')
            .populate('deactivatedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: flags.length,
            flags
        });

    } catch (error) {
        console.error('Error fetching all flags:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   GET /api/employee-flags/employee/:employeeId
// @desc    Get flags for a specific employee
// @access  Private (Manager of employee's department, Admin, Super Admin)
router.get('/employee/:employeeId', auth, validateObjectId('employeeId'), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const currentUser = await User.findById(req.user.id);
        
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ msg: 'Employee not found' });
        }

        // Check permissions
        const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
        const isManagerOfEmployee = currentUser.role === 'manager' && 
            currentUser.managedDepartments?.includes(employee.department);
        const isSelf = req.user.id === employeeId;

        if (!isAdmin && !isManagerOfEmployee && !isSelf) {
            return res.status(403).json({ msg: 'Not authorized to view these flags' });
        }

        const flags = await EmployeeFlag.find({
            employee: employeeId,
            isActive: true
        })
        .populate('flaggedBy', 'name email')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: flags.length,
            flags
        });

    } catch (error) {
        console.error('Error fetching employee flags:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/employee-flags/:id
// @desc    Remove/deactivate a flag
// @access  Private (Flag creator, Admin, Super Admin)
router.delete('/:id', auth, validateObjectId('id'), async (req, res) => {
    try {
        const flag = await EmployeeFlag.findById(req.params.id)
            .populate('employee', 'name email department');
        
        if (!flag) {
            return res.status(404).json({ msg: 'Flag not found' });
        }

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check permissions: creator, admin, or super_admin can remove
        const isCreator = flag.flaggedBy.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ msg: 'Not authorized to remove this flag' });
        }

        // Deactivate the flag instead of deleting
        flag.isActive = false;
        flag.deactivatedAt = new Date();
        flag.deactivatedBy = req.user.id;
        await flag.save();

        // Create audit log
        await createAuditLog({
            action: 'EMPLOYEE_FLAG_REMOVED',
            performedBy: req.user.id,
            targetResource: 'employee_flag',
            targetResourceId: flag._id,
            description: `${flag.type === 'deduction' ? 'Deduction' : 'Reward'} flag removed for ${flag.employee.name}`,
            details: {
                employeeId: flag.employee._id,
                employeeName: flag.employee.name,
                flagType: flag.type,
                originalReason: flag.reason
            },
            severity: 'LOW'
        });

        res.json({
            success: true,
            msg: 'Flag removed successfully'
        });

    } catch (error) {
        console.error('Error removing flag:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// @route   GET /api/employee-flags/summary
// @desc    Get flag summary/statistics
// @access  Private (Admin, Super Admin)
router.get('/summary', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!['admin', 'super_admin'].includes(currentUser.role)) {
            return res.status(403).json({ msg: 'Only admins can access flag summary' });
        }

        const summary = await EmployeeFlag.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalActive = await EmployeeFlag.countDocuments({ isActive: true });
        const totalInactive = await EmployeeFlag.countDocuments({ isActive: false });

        const deductionCount = summary.find(s => s._id === 'deduction')?.count || 0;
        const rewardCount = summary.find(s => s._id === 'reward')?.count || 0;

        res.json({
            success: true,
            summary: {
                totalActive,
                totalInactive,
                deductions: deductionCount,
                rewards: rewardCount
            }
        });

    } catch (error) {
        console.error('Error fetching flag summary:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

module.exports = router;
