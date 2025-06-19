const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createAuditLog } = require('./audit');

// Middleware to verify JWT token
const auth = require('../middleware/auth');

// Optimized multer configuration with better error handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'medical-documents');
        // Ensure directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'medical-doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Enhanced file type checking
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file at a time
    },
    fileFilter: fileFilter
});

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
};

const setCachedData = (key, data) => {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
};

// Optimized form creation with better validation
router.post('/', auth, upload.single('medicalDocument'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email department role');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const {
            type,
            vacationType,
            startDate,
            endDate,
            excuseDate,
            sickLeaveStartDate,
            sickLeaveEndDate,
            reason,
            fromHour,
            toHour,
            wfhDescription,
            wfhHours
        } = req.body;

        // Enhanced validation
        const validFormTypes = ['vacation', 'excuse', 'wfh', 'sick_leave'];
        if (!validFormTypes.includes(type)) {
            return res.status(400).json({ msg: 'Invalid form type' });
        }

        // Type-specific validation
        if (type === 'vacation') {
            if (!startDate || !endDate || !vacationType) {
                return res.status(400).json({ msg: 'Start date, end date, and vacation type are required for vacation requests' });
            }
            if (new Date(startDate) > new Date(endDate)) {
                return res.status(400).json({ msg: 'Start date cannot be after end date' });
            }
        }

        if (type === 'excuse') {
            if (!excuseDate || !fromHour || !toHour) {
                return res.status(400).json({ msg: 'Date, from hour, and to hour are required for excuse requests' });
            }
        }

        if (type === 'sick_leave') {
            if (!sickLeaveStartDate || !sickLeaveEndDate) {
                return res.status(400).json({ msg: 'Start and end dates are required for sick leave' });
            }
            if (!req.file) {
                return res.status(400).json({ msg: 'Medical document is required for sick leave requests' });
            }
        }

        // Create form with optimized structure
        const formData = {
            user: req.user.id,
            type,
            reason: reason?.trim(),
            ...(type === 'vacation' && {
                vacationType,
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            }),
            ...(type === 'excuse' && {
                excuseDate: new Date(excuseDate),
                fromHour,
                toHour
            }),
            ...(type === 'sick_leave' && {
                sickLeaveStartDate: new Date(sickLeaveStartDate),
                sickLeaveEndDate: new Date(sickLeaveEndDate),
                medicalDocument: req.file?.path
            }),
            ...(type === 'wfh' && {
                wfhDescription: wfhDescription?.trim(),
                wfhHours: parseInt(wfhHours) || 8,
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            })
        };

        const form = new Form(formData);
        await form.save();

        // Populate user data for response
        await form.populate('user', 'name email department');

        // Clear relevant caches
        cache.delete(`forms-${req.user.id}`);
        cache.delete('forms-admin');
        
        res.status(201).json({ 
            msg: 'Form submitted successfully', 
            form,
            formId: form._id 
        });

    } catch (err) {
        console.error('Form creation error:', err);
        
        // Clean up uploaded file if form creation failed
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting file:', unlinkErr);
            });
        }

        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ msg: 'Validation error', errors });
        }

        res.status(500).json({ msg: 'Server error during form submission' });
    }
});

// Optimized forms retrieval with pagination and filtering
router.get('/admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.type) filter.type = req.query.type;
        if (req.query.department) {
            const users = await User.find({ department: req.query.department }).select('_id');
            filter.user = { $in: users.map(u => u._id) };
        }

        // Check cache first
        const cacheKey = `forms-admin-${JSON.stringify(filter)}-${page}-${limit}`;
        const cachedForms = getCachedData(cacheKey);
        if (cachedForms) {
            return res.json(cachedForms);
        }

        // Use simple populate instead of complex aggregation for compatibility
        const forms = await Form.find(filter)
            .populate('user', 'name email department role')
            .populate('managerApprovedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Cache the results
        setCachedData(cacheKey, forms);
        
        res.json(forms);
    } catch (err) {
        console.error('Admin forms fetch error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Optimized pending forms for manager with better query
router.get('/manager/pending', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id).select('role managedDepartments');
        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.json([]); // No managed departments = no forms to show
        }

        // Check cache first
        const cacheKey = `manager-pending-${req.user.id}`;
        const cachedForms = getCachedData(cacheKey);
        if (cachedForms) {
            return res.json(cachedForms);
        }

        // Optimized aggregation pipeline
        const pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $match: {
                    status: 'pending',
                    'userInfo.department': { $in: manager.managedDepartments },
                    'userInfo._id': { $ne: manager._id } // Exclude manager's own forms
                }
            },
            {
                $project: {
                    type: 1,
                    startDate: 1,
                    endDate: 1,
                    excuseDate: 1,
                    sickLeaveStartDate: 1,
                    sickLeaveEndDate: 1,
                    reason: 1,
                    fromHour: 1,
                    toHour: 1,
                    medicalDocument: 1,
                    createdAt: 1,
                    'user._id': '$userInfo._id',
                    'user.name': '$userInfo.name',
                    'user.email': '$userInfo.email',
                    'user.department': '$userInfo.department'
                }
            },
            { $sort: { createdAt: -1 } }
        ];

        const forms = await Form.aggregate(pipeline);
        
        // Cache the results
        setCachedData(cacheKey, forms);

        res.json(forms);
    } catch (err) {
        console.error('Manager pending forms error:', err);
        res.status(500).send('Server error');
    }
});

// Optimized vacation days endpoint with caching
router.get('/vacation-days', auth, async (req, res) => {
    try {
        const cacheKey = `vacation-days-${req.user.id}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const user = await User.findById(req.user.id).select('vacationDaysLeft');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const result = { vacationDaysLeft: user.vacationDaysLeft };
        setCachedData(cacheKey, result);
        
        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Optimized excuse hours endpoint with caching
router.get('/excuse-hours', auth, async (req, res) => {
    try {
        const cacheKey = `excuse-hours-${req.user.id}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const user = await User.findById(req.user.id).select('excuseHoursLeft');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const result = { excuseHoursLeft: user.excuseHoursLeft };
        setCachedData(cacheKey, result);
        
        res.json(result);
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

        // Find all forms from team members and manager's own forms
        const forms = await Form.find({
            $or: [
                { user: { $in: teamMemberIds } }, // Team member forms
                { user: manager._id, status: 'manager_submitted' }, // Manager's own submissions
                { user: manager._id, status: 'approved' }, // Manager's approved forms
                { user: manager._id, status: 'rejected' } // Manager's rejected forms
            ]
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
            // For excuse forms, manager approval is final
            if (form.type === 'excuse') {
                // Handle excuse form approval - deduct from excuse hours allowance immediately
                const fromTime = new Date(`2000-01-01T${form.fromHour}`);
                const toTime = new Date(`2000-01-01T${form.toHour}`);
                const hoursRequested = (toTime - fromTime) / (1000 * 60 * 60);
                const employee = await User.findById(form.user._id);
                
                // Check if employee has enough excuse hours
                if (employee && (employee.excuseHoursLeft || 0) < hoursRequested) {
                    return res.status(400).json({ 
                        msg: `Cannot approve: Employee has insufficient excuse hours (${employee.excuseHoursLeft} hours remaining, ${hoursRequested.toFixed(1)} hours requested)`
                    });
                }

                if (employee) {
                    employee.excuseHoursLeft = Math.max(0, (employee.excuseHoursLeft || 2) - hoursRequested);
                    await employee.save();
                }

                form.status = 'approved'; // Final approval for excuse forms
                form.managerComment = managerComment || '';
                form.managerApprovedBy = req.user.id;
                form.managerApprovedAt = Date.now();
            } else {
                // For other form types, manager approval still requires admin final approval
                form.status = 'manager_approved';
                form.managerComment = managerComment || '';
                form.managerApprovedBy = req.user.id;
                form.managerApprovedAt = Date.now();
            }
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

// Get user's own forms
router.get('/my-forms', auth, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        console.log('My-forms request from user:', {
            userId: req.user.id,
            userName: currentUser?.name,
            userRole: currentUser?.role,
            userDepartments: currentUser?.managedDepartments
        });

        const forms = await Form.find({ user: req.user.id })
            .populate('managerApprovedBy', 'name')
            .populate('user', 'name email department')
            .sort({ createdAt: -1 });
        
        console.log('Found personal forms:', {
            count: forms.length,
            formIds: forms.map(f => f._id),
            formTypes: forms.map(f => f.type),
            submittedBy: forms.map(f => f.user?.name)
        });

        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get manager's personal forms only (separate from team management)
router.get('/manager/personal-forms', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (!manager || manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        console.log('Manager personal forms request:', {
            managerId: manager._id,
            managerName: manager.name,
            managedDepartments: manager.managedDepartments
        });

        // Get ONLY the manager's own submitted forms
        const personalForms = await Form.find({ 
            user: manager._id  // Only forms submitted by the manager themselves
        })
        .populate('managerApprovedBy', 'name')
        .populate('user', 'name email department')
        .sort({ createdAt: -1 });

        console.log('Manager personal forms found:', {
            count: personalForms.length,
            forms: personalForms.map(f => ({
                id: f._id,
                type: f.type,
                submittedBy: f.user?.name,
                status: f.status
            }))
        });

        res.json(personalForms);
    } catch (err) {
        console.error('Error fetching manager personal forms:', err.message);
        res.status(500).send('Server error');
    }
});

// Update form status (admin only - now handles manager-approved forms) + Super admin form editing
router.put('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const form = await Form.findById(req.params.id);
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Check if this is a super admin form edit request
        const { type, startDate, endDate, days, reason, status, adminComment } = req.body;
        
        // Super admin can edit form data directly
        if (user.role === 'super_admin' && (type || startDate || endDate || days || reason)) {
            // Update form fields if provided
            if (type) form.type = type;
            if (startDate) form.startDate = startDate;
            if (endDate) form.endDate = endDate;
            if (days) form.days = parseInt(days);
            if (reason) form.reason = reason;
            if (status) form.status = status;
            if (adminComment) form.adminComment = adminComment;
            
            form.updatedAt = Date.now();
            await form.save();
            
            return res.json({ msg: 'Form updated successfully', form });
        }

        // Original admin approval/rejection logic for regular admin users
        if (user.role === 'admin') {
            // Check remaining vacation days before approving annual vacation
            if (
                form.type === 'vacation' &&
                form.vacationType === 'annual' &&
                status === 'approved' &&
                (form.status === 'pending' || form.status === 'manager_approved' || form.status === 'manager_submitted')
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
                    const oldVacationDays = employee.vacationDaysLeft;
                    employee.vacationDaysLeft = Math.max(0, (employee.vacationDaysLeft || 21) - days);
                    await employee.save();
                    
                    // Create audit log for automatic vacation days deduction
                    const admin = await User.findById(req.user.id);
                    await createAuditLog({
                        action: 'VACATION_DAYS_MODIFIED',
                        performedBy: admin._id,
                        targetUser: employee._id,
                        targetResource: 'user',
                        targetResourceId: employee._id,
                        description: `Vacation days automatically deducted for ${employee.name}: ${days} days deducted due to approved annual vacation (Form ID: ${form._id})`,
                        oldValues: {
                            vacationDaysLeft: oldVacationDays
                        },
                        newValues: {
                            vacationDaysLeft: employee.vacationDaysLeft
                        },
                        details: {
                            targetUserName: employee.name,
                            targetUserEmail: employee.email,
                            targetUserDepartment: employee.department,
                            adminName: admin.name,
                            adminEmail: admin.email,
                            changeAmount: -(days),
                            formId: form._id,
                            formType: 'vacation',
                            vacationType: 'annual',
                            vacationStartDate: form.startDate,
                            vacationEndDate: form.endDate,
                            daysDeducted: days,
                            reason: 'Automatic deduction upon vacation approval'
                        },
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('User-Agent'),
                        severity: 'MEDIUM'
                    });
                }
            } else if (
                form.type === 'vacation' &&
                form.vacationType === 'unpaid' &&
                status === 'approved' &&
                (form.status === 'pending' || form.status === 'manager_approved' || form.status === 'manager_submitted')
            ) {
                // For unpaid vacation, we don't need to check or deduct vacation days
                // Just approve it without affecting the balance
                console.log('Approving unpaid vacation without deducting days');
            } else if (
                form.type === 'excuse' &&
                status === 'approved' &&
                (form.status === 'pending' || form.status === 'manager_approved' || form.status === 'manager_submitted')
            ) {
                // Handle excuse form approval - deduct from excuse hours allowance
                const fromTime = new Date(`2000-01-01T${form.fromHour}`);
                const toTime = new Date(`2000-01-01T${form.toHour}`);
                const hoursRequested = (toTime - fromTime) / (1000 * 60 * 60);
                const employee = await User.findById(form.user);
                
                // Check if employee has enough excuse hours
                if (employee && (employee.excuseHoursLeft || 0) < hoursRequested) {
                    return res.status(400).json({ 
                        msg: `Cannot approve: Employee has insufficient excuse hours (${employee.excuseHoursLeft} hours remaining, ${hoursRequested.toFixed(1)} hours requested)`
                    });
                }

                if (employee) {
                    employee.excuseHoursLeft = Math.max(0, (employee.excuseHoursLeft || 2) - hoursRequested);
                    await employee.save();
                }
            }
            // Note: Sick leave and WFH forms don't affect any day allowances

            form.status = status;
            form.adminComment = adminComment;
            form.updatedAt = Date.now();

            await form.save();
            return res.json(form);
        }

        return res.status(403).json({ msg: 'Not authorized for this operation' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete form (admin and super admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin' && user.role !== 'super_admin') {
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

// Get current user's excuse hours left
router.get('/excuse-hours', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ excuseHoursLeft: user.excuseHoursLeft });
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

// Get any user's excuse hours left (admin only)
router.get('/excuse-hours/:userId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (admin.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ excuseHoursLeft: user.excuseHoursLeft });
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
        const users = await User.find({}, 'name email department vacationDaysLeft excuseHoursLeft');
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

// Serve uploaded medical documents (with proper authorization)
router.get('/document/:filename', auth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '..', 'uploads', 'medical-documents', filename);
        const fs = require('fs');
        
        console.log('Document request:', {
            filename,
            filePath,
            fileExists: fs.existsSync(filePath)
        });
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found on filesystem:', filePath);
            return res.status(404).json({ msg: 'Document not found on filesystem' });
        }

        // Find the form that contains this medical document
        // Try multiple search patterns to handle different path formats
        let form = await Form.findOne({ 
            medicalDocument: { $regex: filename + '$' } 
        }).populate('user', 'name email department');
        
        // If not found, try with escaped backslashes (Windows paths)
        if (!form) {
            form = await Form.findOne({ 
                medicalDocument: { $regex: filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' } 
            }).populate('user', 'name email department');
        }
        
        // If still not found, try a broader search
        if (!form) {
            form = await Form.findOne({ 
                medicalDocument: { $regex: filename } 
            }).populate('user', 'name email department');
        }
        
        console.log('Form search result:', {
            searchPattern: filename + '$',
            formFound: !!form,
            formId: form?._id,
            medicalDocumentPath: form?.medicalDocument
        });

        if (!form) {
            // Let's also check what forms with medical documents exist
            const allFormsWithDocs = await Form.find({ 
                medicalDocument: { $exists: true, $ne: null } 
            }, 'medicalDocument').limit(5);
            
            console.log('Available medical documents in database:', 
                allFormsWithDocs.map(f => f.medicalDocument)
            );
            
            return res.status(404).json({ 
                msg: 'Document not associated with any form',
                requestedFile: filename,
                availableFiles: allFormsWithDocs.map(f => f.medicalDocument)
            });
        }

        // Get the requesting user
        const requestingUser = await User.findById(req.user.id);
        if (!requestingUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Authorization check
        let authorized = false;

        if (requestingUser.role === 'super_admin' || requestingUser.role === 'admin') {
            // Super admins and admins can view all documents
            authorized = true;
        } else if (requestingUser.role === 'manager') {
            // Managers can only view documents from their managed departments
            if (requestingUser.managedDepartments && 
                requestingUser.managedDepartments.includes(form.user.department)) {
                authorized = true;
            }
        } else if (requestingUser._id.toString() === form.user._id.toString()) {
            // Users can view their own documents
            authorized = true;
        }

        if (!authorized) {
            return res.status(403).json({ msg: 'Not authorized to view this document' });
        }

        // Set appropriate headers for file download
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.pdf') {
            contentType = 'application/pdf';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.doc') {
            contentType = 'application/msword';
        } else if (ext === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${form.user.name}-medical-document${ext}"`
        });

        res.sendFile(filePath);
    } catch (err) {
        console.error('Error serving document:', err.message);
        res.status(500).json({ msg: 'Server error while retrieving document' });
    }
});

// Get medical document info for a specific form (managers and admins only)
router.get('/document-info/:formId', auth, async (req, res) => {
    try {
        const requestingUser = await User.findById(req.user.id);
        if (!requestingUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const form = await Form.findById(req.params.formId).populate('user', 'name email department');
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Authorization check
        let authorized = false;

        if (requestingUser.role === 'super_admin' || requestingUser.role === 'admin') {
            authorized = true;
        } else if (requestingUser.role === 'manager') {
            if (requestingUser.managedDepartments && 
                requestingUser.managedDepartments.includes(form.user.department)) {
                authorized = true;
            }
        } else if (requestingUser._id.toString() === form.user._id.toString()) {
            authorized = true;
        }

        if (!authorized) {
            return res.status(403).json({ msg: 'Not authorized to view this form' });
        }

        if (!form.medicalDocument) {
            return res.status(404).json({ msg: 'No medical document attached to this form' });
        }

        // Extract filename from path
        const filename = path.basename(form.medicalDocument);
        const ext = path.extname(filename).toLowerCase();
        
        res.json({
            hasDocument: true,
            filename: filename,
            downloadUrl: `/api/forms/document/${filename}`,
            fileType: ext,
            submittedBy: form.user.name,
            submittedAt: form.createdAt
        });
    } catch (err) {
        console.error('Error getting document info:', err.message);
        res.status(500).json({ msg: 'Server error while retrieving document info' });
    }
});

// Debug endpoint to check medical documents in database (admin only)
router.get('/debug/medical-documents', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const forms = await Form.find({ 
            medicalDocument: { $exists: true, $ne: null } 
        }).populate('user', 'name email department').sort({ createdAt: -1 });

        const fs = require('fs');
        const documentsInfo = forms.map(form => {
            const filename = form.medicalDocument ? form.medicalDocument.split(/[/\\]/).pop() : null;
            const filePath = filename ? path.join(__dirname, '..', 'uploads', 'medical-documents', filename) : null;
            
            return {
                formId: form._id,
                userId: form.user._id,
                userName: form.user.name,
                medicalDocumentPath: form.medicalDocument,
                extractedFilename: filename,
                fileExists: filePath ? fs.existsSync(filePath) : false,
                submittedAt: form.createdAt
            };
        });

        res.json({
            totalFormsWithDocuments: forms.length,
            documents: documentsInfo
        });
    } catch (err) {
        console.error('Error in debug endpoint:', err.message);
        res.status(500).json({ msg: 'Server error while retrieving debug info' });
    }
});

module.exports = router; 