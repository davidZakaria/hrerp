const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = require('../middleware/auth');

// Submit a new form
router.post('/', auth, async (req, res) => {
    try {
        const { type, startDate, endDate, reason, vacationType, fromHour, toHour } = req.body;
        
        // Duplicate vacation form check
        if (type === 'vacation' && startDate && endDate) {
            const overlap = await Form.findOne({
                user: req.user.id,
                type: 'vacation',
                $or: [
                    // Overlap: new start is between existing start and end
                    { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
                ],
                status: { $in: ['pending', 'approved', 'manager_approved'] }
            });
            if (overlap) {
                return res.status(400).json({ msg: 'You already have a vacation request for these dates.' });
            }
        }

        const newForm = new Form({
            user: req.user.id,
            type,
            startDate,
            endDate,
            reason,
            vacationType,
            fromHour,
            toHour
        });

        const form = await newForm.save();
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get pending forms for manager (only from managed departments)
router.get('/manager/pending', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.json([]); // No managed departments = no forms to show
        }

        // Find team members in managed departments first
        const teamMembers = await User.find({
            department: { $in: manager.managedDepartments },
            role: 'employee',
            status: 'active'
        }).select('_id');

        const teamMemberIds = teamMembers.map(member => member._id);

        // Find forms from team members only
        const forms = await Form.find({
            status: 'pending',
            user: { $in: teamMemberIds }
        })
        .populate('user', 'name email department')
        .sort({ createdAt: -1 });

        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all forms from manager's team (all statuses)
router.get('/manager/team-forms', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.json([]); // No managed departments = no forms to show
        }

        // Find team members in managed departments first
        const teamMembers = await User.find({
            department: { $in: manager.managedDepartments },
            role: 'employee',
            status: 'active'
        }).select('_id');

        const teamMemberIds = teamMembers.map(member => member._id);

        // Find all forms from team members
        const forms = await Form.find({
            user: { $in: teamMemberIds }
        })
        .populate('user', 'name email department')
        .populate('managerApprovedBy', 'name')
        .sort({ createdAt: -1 });

        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Manager approve/reject form (Enhanced security)
router.put('/manager/:id', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.status(403).json({ msg: 'No departments assigned to manage' });
        }

        const { action, managerComment } = req.body;
        const form = await Form.findById(req.params.id).populate('user');

        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Double-check: Ensure the form's user is an active employee in manager's departments
        const isTeamMember = await User.findOne({
            _id: form.user._id,
            department: { $in: manager.managedDepartments },
            role: 'employee',
            status: 'active'
        });

        if (!isTeamMember) {
            return res.status(403).json({ msg: 'Not authorized - User is not in your managed departments' });
        }

        // Only allow action on pending forms
        if (form.status !== 'pending') {
            return res.status(400).json({ msg: 'Form is not in pending status' });
        }

        if (action === 'approve') {
            form.status = 'manager_approved';
            form.managerComment = managerComment || '';
            form.managerApprovedBy = req.user.id;
            form.managerApprovedAt = Date.now();
        } else if (action === 'reject') {
            form.status = 'manager_rejected';
            form.managerComment = managerComment || 'Rejected by manager';
            form.managerApprovedBy = req.user.id;
            form.managerApprovedAt = Date.now();
        } else {
            return res.status(400).json({ msg: 'Invalid action. Must be "approve" or "reject"' });
        }

        form.updatedAt = Date.now();
        await form.save();

        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all forms for admin (now includes manager-approved forms)
router.get('/admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const forms = await Form.find()
            .populate('user', 'name email department')
            .populate('managerApprovedBy', 'name')
            .sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get user's own forms
router.get('/my-forms', auth, async (req, res) => {
    try {
        const forms = await Form.find({ user: req.user.id })
            .populate('managerApprovedBy', 'name')
            .sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update form status (admin only - now handles manager-approved forms)
router.put('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const { status, adminComment } = req.body;
        const form = await Form.findById(req.params.id);

        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Check remaining vacation days before approving annual vacation
        if (
            form.type === 'vacation' &&
            form.vacationType === 'annual' &&
            status === 'approved' &&
            (form.status === 'pending' || form.status === 'manager_approved')
        ) {
            // Calculate number of days (inclusive)
            const start = new Date(form.startDate);
            const end = new Date(form.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const employee = await User.findById(form.user);
            
            // Check if employee has enough vacation days
            if (employee && (employee.vacationDaysLeft || 0) < days) {
                return res.status(400).json({ 
                    msg: `Cannot approve: Employee has insufficient vacation days (${employee.vacationDaysLeft} remaining, ${days} requested)`
                });
            }

            if (employee) {
                employee.vacationDaysLeft = Math.max(0, (employee.vacationDaysLeft || 21) - days);
                await employee.save();
            }
        } else if (
            form.type === 'vacation' &&
            form.vacationType === 'unpaid' &&
            status === 'approved' &&
            (form.status === 'pending' || form.status === 'manager_approved')
        ) {
            // For unpaid vacation, we don't need to check or deduct vacation days
            // Just approve it without affecting the balance
            console.log('Approving unpaid vacation without deducting days');
        }

        form.status = status;
        form.adminComment = adminComment;
        form.updatedAt = Date.now();

        await form.save();
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete form (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const form = await Form.findByIdAndDelete(req.params.id);
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }
        res.json({ msg: 'Form deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get current user's vacation days left
router.get('/vacation-days', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ vacationDaysLeft: user.vacationDaysLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get any user's vacation days left (admin only)
router.get('/vacation-days/:userId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (admin.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ vacationDaysLeft: user.vacationDaysLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin: Get report of all users and their vacation days left
router.get('/vacation-days-report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (admin.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const users = await User.find({}, 'name email department vacationDaysLeft');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Super Admin: Get all forms with full details
router.get('/all', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized as super admin' });
        }
        const forms = await Form.find()
            .populate('user', 'name email department')
            .sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Super Admin: Correct or modify any form
router.put('/super/:formId', auth, async (req, res) => {
    try {
        const superAdmin = await User.findById(req.user.id);
        if (superAdmin.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized as super admin' });
        }

        const form = await Form.findById(req.params.formId);
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        const {
            type,
            vacationType,
            startDate,
            endDate,
            reason,
            status,
            fromHour,
            toHour,
            modificationReason
        } = req.body;

        // Store original values for history
        const originalForm = { ...form.toObject() };

        // Update form fields
        if (type) form.type = type;
        if (vacationType) form.vacationType = vacationType;
        if (startDate) form.startDate = startDate;
        if (endDate) form.endDate = endDate;
        if (reason) form.reason = reason;
        if (status) form.status = status;
        if (fromHour) form.fromHour = fromHour;
        if (toHour) form.toHour = toHour;

        // Handle vacation days adjustment if needed
        if (form.type === 'vacation' && form.vacationType === 'annual' && status === 'approved') {
            const employee = await User.findById(form.user);
            if (employee) {
                const start = new Date(form.startDate);
                const end = new Date(form.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                
                // Add modification to employee history
                employee.modificationHistory.push({
                    field: 'vacationDaysLeft',
                    oldValue: employee.vacationDaysLeft,
                    newValue: Math.max(0, employee.vacationDaysLeft - days),
                    modifiedBy: superAdmin._id,
                    reason: `Vacation days adjusted due to form correction: ${modificationReason}`
                });

                employee.vacationDaysLeft = Math.max(0, employee.vacationDaysLeft - days);
                await employee.save();
            }
        }

        // Add modification note
        form.modificationHistory = form.modificationHistory || [];
        form.modificationHistory.push({
            modifiedBy: superAdmin._id,
            modifiedAt: Date.now(),
            reason: modificationReason,
            changes: {
                before: originalForm,
                after: req.body
            }
        });

        await form.save();
        res.json({ msg: 'Form corrected successfully', form });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Super Admin: Get form modification history
router.get('/history/:formId', auth, async (req, res) => {
    try {
        const superAdmin = await User.findById(req.user.id);
        if (superAdmin.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized as super admin' });
        }

        const form = await Form.findById(req.params.formId)
            .populate('modificationHistory.modifiedBy', 'name email');
        
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        res.json(form.modificationHistory);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 