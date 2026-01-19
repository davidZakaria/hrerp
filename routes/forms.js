const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createAuditLog } = require('./audit');
const { shouldResetExcuseRequests, getNextResetDate } = require('../utils/excuseResetHelper');

// Middleware to verify JWT token
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');

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
        fileSize: 15 * 1024 * 1024, // 15MB limit for medical documents
        files: 1 // Only one file at a time
    },
    fileFilter: fileFilter
});

// Cache for frequently accessed data
const cache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds for real-time updates

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

// Custom multer error handler
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                msg: 'File too large. Medical documents must be under 15MB. Please compress your file or use a smaller image/PDF.' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                msg: 'Too many files. Please upload only one medical document.' 
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                msg: 'Unexpected file field. Please use the correct file upload field.' 
            });
        }
        return res.status(400).json({ 
            msg: `File upload error: ${err.message}` 
        });
    }
    if (err.message && err.message.includes('Only PDF, DOC, DOCX, JPG, and PNG files are allowed')) {
        return res.status(400).json({ 
            msg: 'Invalid file type. Only PDF, Word documents (DOC/DOCX), and images (JPG/PNG) are allowed.' 
        });
    }
    next(err);
};

// Optimized form creation with better validation
router.post('/', auth, upload.single('medicalDocument'), handleMulterError, async (req, res) => {
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
            excuseType,
            sickLeaveStartDate,
            sickLeaveEndDate,
            reason,
            fromHour,
            toHour,
            wfhDescription,
            wfhHours,
            wfhDate,
            wfhWorkingOn,
            extraHoursDate,
            extraHoursWorked,
            extraHoursDescription
        } = req.body;

        // Enhanced validation
        const validFormTypes = ['vacation', 'excuse', 'wfh', 'sick_leave', 'extra_hours'];
        if (!validFormTypes.includes(type)) {
            return res.status(400).json({ msg: 'Invalid form type' });
        }

        // Extra Hours is only available for Marketing department
        if (type === 'extra_hours') {
            if (user.department.toLowerCase() !== 'marketing') {
                return res.status(403).json({ msg: 'Extra Hours reports are only available for the Marketing department' });
            }
            if (!extraHoursDate) {
                return res.status(400).json({ msg: 'Date is required for Extra Hours reports' });
            }
            if (!extraHoursWorked || extraHoursWorked <= 0) {
                return res.status(400).json({ msg: 'Number of extra hours worked is required' });
            }
            if (!extraHoursDescription || !extraHoursDescription.trim()) {
                return res.status(400).json({ msg: 'Please describe the work done during extra hours' });
            }
        }

        // WFH is only available for Marketing department
        if (type === 'wfh') {
            // Case-insensitive department check
            if (user.department.toLowerCase() !== 'marketing') {
                return res.status(403).json({ msg: 'Work from Home requests are only available for the Marketing department' });
            }
            // Validate required WFH fields
            if (!wfhDate) {
                return res.status(400).json({ msg: 'Date is required for Work from Home requests' });
            }
            if (!wfhWorkingOn || !wfhWorkingOn.trim()) {
                return res.status(400).json({ msg: 'Please specify what you will be working on' });
            }
        }

        // Type-specific validation
        if (type === 'vacation') {
            if (!startDate || !endDate || !vacationType) {
                return res.status(400).json({ msg: 'Start date, end date, and vacation type are required for vacation requests' });
            }
            if (vacationType !== 'annual') {
                return res.status(400).json({ msg: 'Only annual vacation leave is allowed. Unpaid vacation is no longer available.' });
            }
            if (new Date(startDate) > new Date(endDate)) {
                return res.status(400).json({ msg: 'Start date cannot be after end date' });
            }
        }

        if (type === 'excuse') {
            if (!excuseDate || !fromHour || !toHour || !excuseType) {
                return res.status(400).json({ msg: 'Date, from hour, to hour, and excuse type are required for excuse requests' });
            }
            
            // Get full user data including excuse requests
            const fullUser = await User.findById(req.user.id);
            
            // Calculate hours requested
            const fromTime = new Date(`2000-01-01T${fromHour}`);
            const toTime = new Date(`2000-01-01T${toHour}`);
            const hoursRequested = (toTime - fromTime) / (1000 * 60 * 60);
            
            if (excuseType === 'paid') {
                // For paid excuses: must be exactly 2 hours
                if (hoursRequested !== 2) {
                    return res.status(400).json({ 
                        msg: 'Paid excuse requests must be exactly 2 hours. You requested ' + hoursRequested.toFixed(1) + ' hours.' 
                    });
                }
                
                // Check if requests need to be reset (25th of each month)
                if (shouldResetExcuseRequests(fullUser.excuseRequestsResetDate)) {
                    fullUser.excuseRequestsLeft = 2;
                    fullUser.excuseRequestsResetDate = new Date();
                    await fullUser.save();
                    console.log(`🔄 Excuse requests reset for ${fullUser.name} (monthly reset on 25th)`);
                }
                
                if (fullUser.excuseRequestsLeft <= 0) {
                    return res.status(400).json({ 
                        msg: 'You have exhausted your 2 paid excuse requests for this month.' 
                    });
                }
            } else if (excuseType === 'unpaid') {
                // For unpaid excuses: check if user has at least 0.5 vacation days
                if (fullUser.vacationDaysLeft < 0.5) {
                    return res.status(400).json({ 
                        msg: `Insufficient vacation days for unpaid excuse. You need at least 0.5 days. Available: ${fullUser.vacationDaysLeft.toFixed(1)} days.`
                    });
                }
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
                excuseType,
                fromHour,
                toHour
            }),
            ...(type === 'sick_leave' && {
                sickLeaveStartDate: new Date(sickLeaveStartDate),
                sickLeaveEndDate: new Date(sickLeaveEndDate),
                medicalDocument: req.file?.path
            }),
            ...(type === 'wfh' && {
                wfhDate: new Date(wfhDate),
                wfhWorkingOn: wfhWorkingOn?.trim(),
                // Legacy fields for backward compatibility
                wfhDescription: wfhWorkingOn?.trim(),
                wfhHours: 8
            }),
            ...(type === 'extra_hours' && {
                extraHoursDate: new Date(extraHoursDate),
                extraHoursWorked: Number(extraHoursWorked),
                extraHoursDescription: extraHoursDescription?.trim()
            })
        };

        const form = new Form(formData);
        await form.save();

        // Populate user data for response
        await form.populate('user', 'name email department');

        // Clear relevant caches after form submission
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
            .populate('adminApprovedBy', 'name')
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

        // No caching for pending forms to ensure real-time accuracy

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
        const cacheKey = `excuse-requests-${req.user.id}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const user = await User.findById(req.user.id).select('excuseRequestsLeft excuseRequestsResetDate');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if requests need to be reset (25th of each month)
        if (shouldResetExcuseRequests(user.excuseRequestsResetDate)) {
            user.excuseRequestsLeft = 2;
            user.excuseRequestsResetDate = new Date();
            await user.save();
            console.log(`🔄 Excuse requests reset for user ${user._id} (monthly reset on 25th)`);
        }

        const result = { 
            excuseRequestsLeft: user.excuseRequestsLeft || 0,
            excuseRequestsResetDate: user.excuseRequestsResetDate,
            nextResetDate: getNextResetDate()
        };
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
        .populate('adminApprovedBy', 'name')
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
        console.log('Manager action request:', {
            managerId: req.user.id,
            formId: req.params.id,
            action: req.body.action,
            hasComment: !!req.body.managerComment
        });

        const manager = await User.findById(req.user.id);
        if (!manager) {
            return res.status(404).json({ msg: 'Manager not found' });
        }

        if (manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Not authorized - Manager role required' });
        }

        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.status(403).json({ msg: 'No departments assigned to manage' });
        }

        const { action, managerComment } = req.body;
        
        // Validate action parameter
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ msg: 'Invalid action. Must be "approve" or "reject"' });
        }

        const form = await Form.findById(req.params.id).populate('user');

        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        console.log('Processing form:', {
            formId: form._id,
            formType: form.type,
            formStatus: form.status,
            employeeName: form.user.name,
            employeeDepartment: form.user.department,
            hasMedicalDocument: !!form.medicalDocument
        });

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
            let statusMessage = form.status;
            if (form.status === 'manager_approved') {
                statusMessage = 'already approved by a manager';
            } else if (form.status === 'manager_rejected') {
                statusMessage = 'already rejected by a manager';
            } else if (form.status === 'approved') {
                statusMessage = 'already approved by admin';
            } else if (form.status === 'rejected') {
                statusMessage = 'already rejected by admin';
            }
            
            return res.status(400).json({ 
                msg: `This form has been ${statusMessage}. Please refresh the page to see the current status.`,
                currentStatus: form.status,
                formId: form._id,
                isAlreadyProcessed: true
            });
        }

        if (action === 'approve') {
            // For excuse forms, manager approval is final
            if (form.type === 'excuse') {
                const employee = await User.findById(form.user._id);
                
                // Log form details for debugging
                console.log(`📋 Processing excuse form approval:`);
                console.log(`   Form ID: ${form._id}`);
                console.log(`   Employee: ${employee.name}`);
                console.log(`   Excuse Type: ${form.excuseType}`);
                console.log(`   Employee vacation balance: ${employee.vacationDaysLeft}`);
                
                // For paid excuse requests, deduct from monthly allowance
                if (form.excuseType === 'paid') {
                    // Check if requests need to be reset (25th of each month)
                    if (shouldResetExcuseRequests(employee.excuseRequestsResetDate)) {
                        employee.excuseRequestsLeft = 2;
                        employee.excuseRequestsResetDate = new Date();
                        console.log(`🔄 Excuse requests reset for ${employee.name} during approval (monthly reset on 25th)`);
                    }
                    
                    // Check if employee has requests left
                    if (employee.excuseRequestsLeft <= 0) {
                        return res.status(400).json({ 
                            msg: `Cannot approve: Employee has exhausted their 2 paid excuse requests for this month`
                        });
                    }
                    
                    // Deduct one request
                    employee.excuseRequestsLeft = Math.max(0, employee.excuseRequestsLeft - 1);
                    await employee.save();
                } else if (form.excuseType === 'unpaid') {
                    // For unpaid excuses, deduct 0.5 vacation days
                    console.log(`🔍 Processing unpaid excuse for user ${employee.name}, current balance: ${employee.vacationDaysLeft}`);
                    
                    if (employee.vacationDaysLeft < 0.5) {
                        return res.status(400).json({ 
                            msg: `Cannot approve: Employee has insufficient vacation days. Available: ${employee.vacationDaysLeft}, Required: 0.5`
                        });
                    }
                    
                    // Store old balance for logging
                    const oldBalance = employee.vacationDaysLeft;
                    
                    // Deduct 0.5 days from vacation
                    employee.vacationDaysLeft = Math.max(0, employee.vacationDaysLeft - 0.5);
                    await employee.save();
                    
                    console.log(`✅ Unpaid excuse approved - Deducted 0.5 days from ${employee.name}`);
                    console.log(`   Old balance: ${oldBalance}, New balance: ${employee.vacationDaysLeft}`);
                } else {
                    // If excuseType is neither paid nor unpaid, log a warning
                    console.warn(`⚠️ WARNING: Excuse form has unknown excuseType: ${form.excuseType}`);
                }

                form.status = 'approved'; // Final approval for excuse forms (no admin approval needed)
                form.managerComment = managerComment || '';
                form.managerApprovedBy = req.user.id;
                form.managerApprovedAt = Date.now();
            } else {
                // For other form types (including sick_leave), manager approval still requires admin final approval
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
        }

        form.updatedAt = Date.now();
        await form.save();

        // Clear relevant caches after form action
        cache.delete(`forms-${form.user._id}`);
        cache.delete('forms-admin');

        console.log('Form action completed successfully:', {
            formId: form._id,
            newStatus: form.status,
            action: action,
            managerComment: form.managerComment
        });

        res.json({
            success: true,
            message: `Form ${action}d successfully`,
            form: form
        });
    } catch (err) {
        console.error('Manager action error:', {
            error: err.message,
            stack: err.stack,
            formId: req.params.id,
            managerId: req.user.id
        });
        res.status(500).json({ 
            msg: 'Server error while processing form action',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
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
            .populate('adminApprovedBy', 'name')
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
        .populate('adminApprovedBy', 'name')
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
router.put('/:id', auth, validateObjectId('id'), async (req, res) => {
    try {
        console.log('Admin form action request:', {
            adminId: req.user.id,
            formId: req.params.id,
            requestBody: req.body
        });

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Admin user not found' });
        }

        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized - Admin role required' });
        }

        const form = await Form.findById(req.params.id).populate('user');
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        console.log('Processing admin form action:', {
            formId: form._id,
            formType: form.type,
            currentStatus: form.status,
            employeeName: form.user?.name,
            employeeDepartment: form.user?.department
        });

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
            // Prevent actions on forms that are not in appropriate status
            if (status === 'approved' || status === 'rejected') {
                const validStatuses = ['pending', 'manager_approved', 'manager_submitted'];
                if (!validStatuses.includes(form.status)) {
                    return res.status(400).json({ 
                        msg: `Cannot ${status} form: Form is in ${form.status} status. Only forms with status: ${validStatuses.join(', ')} can be processed.`,
                        currentStatus: form.status,
                        formId: form._id
                    });
                }
            }
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
                form.vacationType === 'unpaid'
            ) {
                // Unpaid vacation is no longer allowed
                return res.status(400).json({ 
                    msg: 'Unpaid vacation requests are no longer allowed. Only annual vacation leave is available.'
                });
            } else if (
                form.type === 'excuse' &&
                (status === 'approved' || status === 'rejected') &&
                (form.status === 'pending' || form.status === 'manager_approved' || form.status === 'manager_submitted')
            ) {
                // Excuse forms should only be approved by managers, not admins
                return res.status(400).json({ 
                    msg: 'Excuse forms can only be approved or rejected by the employee\'s manager, not by admin. Please have the manager review this form.'
                });
            }
            // Note: Sick leave and WFH forms don't affect any day allowances

            form.status = status;
            form.adminComment = adminComment;
            form.adminApprovedBy = user._id;
            form.adminApprovedAt = new Date();
            form.updatedAt = Date.now();

            await form.save();
            
            // Clear relevant caches after admin form action
            cache.delete(`forms-${form.user._id}`);
            cache.delete('forms-admin');
            
            console.log('Admin form action completed successfully:', {
                formId: form._id,
                newStatus: form.status,
                adminComment: form.adminComment,
                actionPerformedBy: user.name
            });

            return res.json({
                success: true,
                message: `Form ${status} successfully`,
                form: form
            });
        }

        return res.status(403).json({ msg: 'Not authorized for this operation' });
    } catch (err) {
        console.error('Admin form action error:', {
            error: err.message,
            stack: err.stack,
            formId: req.params.id,
            adminId: req.user.id
        });
        res.status(500).json({ 
            msg: 'Server error while processing admin action',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Delete form (admin and super admin only)
router.delete('/:id', auth, validateObjectId('id'), async (req, res) => {
    try {
        console.log('🗑️ Delete form request received:', {
            formId: req.params.id,
            userId: req.user.id,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method
        });

        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('❌ User not found for delete request');
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role !== 'admin' && user.role !== 'super_admin') {
            console.log('❌ User not authorized for delete:', user.role);
            return res.status(403).json({ msg: 'Not authorized' });
        }

        console.log('✅ User authorized for delete:', {
            userName: user.name,
            userRole: user.role
        });

        const form = await Form.findByIdAndDelete(req.params.id);
        if (!form) {
            console.log('❌ Form not found for deletion:', req.params.id);
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Clear relevant caches after form deletion
        cache.delete('forms-admin');
        cache.delete(`forms-${form.user}`);
        
        // Clear all cache entries that might contain form data
        for (let key of cache.keys()) {
            if (key.includes('forms-admin') || key.includes('forms')) {
                cache.delete(key);
            }
        }

        console.log('✅ Form deleted successfully:', {
            formId: form._id,
            formType: form.type,
            deletedBy: user.name
        });

        res.json({ msg: 'Form deleted successfully' });
    } catch (err) {
        console.error('❌ Error in delete route:', err.message);
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

// Get any user's vacation days left (admin only) - optimized with lean()
router.get('/vacation-days/:userId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('role').lean();
        if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const user = await User.findById(req.params.userId).select('vacationDaysLeft').lean();
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ vacationDaysLeft: user.vacationDaysLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get any user's excuse hours left (admin only) - optimized with lean()
router.get('/excuse-hours/:userId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('role').lean();
        if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const user = await User.findById(req.params.userId).select('excuseRequestsLeft').lean();
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ excuseHoursLeft: user.excuseRequestsLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin: Get report of all users and their vacation days left (optimized batch query)
router.get('/vacation-days-report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('role').lean();
        if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        // Use lean() for faster queries - returns plain JS objects instead of Mongoose documents
        const users = await User.find(
            { status: 'active' }, 
            '_id name email department vacationDaysLeft excuseRequestsLeft'
        ).lean();
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin: Get approved vacation/excuse/sick leave forms for a specific month
router.get('/approved-by-month/:month', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('role').lean();
        if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        
        const { month } = req.params; // Format: YYYY-MM
        
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }
        
        // Calculate start and end of month
        const [year, monthNum] = month.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
        
        const approvedStatuses = ['approved', 'manager_approved', 'manager_submitted'];
        
        // Find all approved forms that overlap with the selected month
        const forms = await Form.find({
            status: { $in: approvedStatuses },
            $or: [
                // Vacation forms overlapping with month
                {
                    type: 'vacation',
                    startDate: { $lte: endOfMonth },
                    endDate: { $gte: startOfMonth }
                },
                // Sick leave forms overlapping with month
                {
                    type: 'sick_leave',
                    sickLeaveStartDate: { $lte: endOfMonth },
                    sickLeaveEndDate: { $gte: startOfMonth }
                },
                // Excuse forms within the month
                {
                    type: 'excuse',
                    excuseDate: { $gte: startOfMonth, $lte: endOfMonth }
                }
            ]
        })
        .populate('user', '_id name email department employeeCode')
        .select('type status user startDate endDate excuseDate fromHour toHour sickLeaveStartDate sickLeaveEndDate reason')
        .lean();
        
        res.json(forms);
    } catch (err) {
        console.error('Error fetching approved forms by month:', err.message);
        res.status(500).send('Server error');
    }
});

// Super Admin: Get all forms with full details
router.get('/all', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ msg: 'User not found. Please login again.' });
        }
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