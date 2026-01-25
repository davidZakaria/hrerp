const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JobApplication = require('../models/JobApplication');
const Evaluation = require('../models/Evaluation');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const cvParser = require('../utils/cvParser');
const { createAuditLog } = require('./audit');

// Configure multer for resume uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/resumes';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});

// Rate limiting middleware (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_APPLICATIONS_PER_IP = 100; // Increased for testing - change back to 3 in production

const rateLimitMiddleware = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, [now]);
        return next();
    }
    
    const timestamps = rateLimitMap.get(ip).filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (timestamps.length >= MAX_APPLICATIONS_PER_IP) {
        return res.status(429).json({ 
            msg: 'Too many applications from this IP. Please try again later.' 
        });
    }
    
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    next();
};

// Clean up rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (let [ip, timestamps] of rateLimitMap.entries()) {
        const validTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
        if (validTimestamps.length === 0) {
            rateLimitMap.delete(ip);
        } else {
            rateLimitMap.set(ip, validTimestamps);
        }
    }
}, RATE_LIMIT_WINDOW);

// PUBLIC ROUTE: Parse CV/Resume for auto-fill
router.post('/parse-resume', rateLimitMiddleware, upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No resume file uploaded' });
        }

        const filePath = req.file.path;
        let parsedData = {};

        // Only parse PDFs for now
        if (req.file.mimetype === 'application/pdf') {
            try {
                parsedData = await cvParser.parsePDF(filePath);
            } catch (parseError) {
                console.error('CV parsing error:', parseError);
                // Return empty data if parsing fails
                parsedData = {
                    email: '',
                    phoneNumber: '',
                    linkedinProfile: '',
                    fullName: '',
                    educationBackground: [],
                    professionalBackground: []
                };
            }
        }

        res.json({
            msg: 'Resume uploaded successfully',
            fileName: req.file.filename,
            filePath: req.file.path,
            parsedData: parsedData
        });

    } catch (err) {
        console.error('Resume upload error:', err);
        res.status(500).json({ msg: 'Error uploading resume' });
    }
});

// PUBLIC ROUTE: Submit job application
router.post('/', rateLimitMiddleware, async (req, res) => {
    try {
        const {
            fullName,
            dateOfBirth,
            address,
            email,
            phoneNumber,
            linkedinProfile,
            positionAppliedFor,
            currentSalary,
            expectedSalary,
            dateAvailableToStart,
            educationBackground,
            professionalBackground,
            reference,
            resumeFilePath,
            resumeFileName
        } = req.body;

        // Validate required fields
        if (!fullName || !dateOfBirth || !address || !email || !phoneNumber || 
            !positionAppliedFor || !expectedSalary || !dateAvailableToStart || 
            !resumeFilePath) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        // Check for duplicate application (same email within 30 days)
        // TEMPORARILY DISABLED FOR TESTING - Re-enable in production!
        /*
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const existingApplication = await JobApplication.findOne({
            email: email.toLowerCase(),
            appliedAt: { $gte: thirtyDaysAgo }
        });

        if (existingApplication) {
            return res.status(400).json({ 
                msg: 'You have already submitted an application recently. Please wait before applying again.' 
            });
        }
        */

        // Create job application
        const jobApplication = new JobApplication({
            fullName,
            dateOfBirth,
            address,
            email: email.toLowerCase(),
            phoneNumber,
            linkedinProfile,
            positionAppliedFor,
            currentSalary,
            expectedSalary,
            dateAvailableToStart,
            educationBackground: Array.isArray(educationBackground) ? educationBackground : [],
            professionalBackground: Array.isArray(professionalBackground) ? professionalBackground : [],
            reference,
            resumeFilePath,
            resumeFileName,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        await jobApplication.save();

        // Create audit log
        await createAuditLog({
            action: 'JOB_APPLICATION_SUBMITTED',
            performedBy: null,
            description: `New job application submitted for ${positionAppliedFor} by ${fullName}`,
            details: {
                applicationId: jobApplication._id,
                position: positionAppliedFor,
                email: email
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'LOW'
        });

        res.json({
            msg: 'Application submitted successfully! We will review your application and contact you soon.',
            applicationId: jobApplication._id
        });

    } catch (err) {
        console.error('Job application submission error:', err);
        res.status(500).json({ msg: 'Error submitting application' });
    }
});

// ADMIN/MANAGER: Get all job applications
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        let query = {};
        
        // Managers only see applications assigned to them
        if (user.role === 'manager') {
            query.assignedInterviewer = req.user.id;
        }

        const applications = await JobApplication.find(query)
            .populate('assignedInterviewer', 'name email')
            .sort({ appliedAt: -1 });

        res.json(applications);

    } catch (err) {
        console.error('Error fetching applications:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ADMIN: Assign interviewer to application
router.put('/:id/assign-interviewer', auth, validateObjectId('id'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Only admins can assign interviewers' });
        }

        const { interviewerId } = req.body;

        if (!interviewerId) {
            return res.status(400).json({ msg: 'Please provide interviewer ID' });
        }

        // Verify interviewer exists and is a manager
        const interviewer = await User.findById(interviewerId);
        if (!interviewer || interviewer.role !== 'manager') {
            return res.status(400).json({ msg: 'Invalid interviewer. Must be a manager.' });
        }

        const application = await JobApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        application.assignedInterviewer = interviewerId;
        application.status = 'under_review';
        await application.save();

        // Create audit log
        await createAuditLog({
            action: 'INTERVIEWER_ASSIGNED',
            performedBy: req.user.id,
            description: `Interviewer ${interviewer.name} assigned to application ${application._id}`,
            details: {
                applicationId: application._id,
                interviewerId: interviewerId,
                candidateName: application.fullName
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'MEDIUM'
        });

        res.json({ 
            msg: 'Interviewer assigned successfully',
            application: await JobApplication.findById(application._id).populate('assignedInterviewer', 'name email')
        });

    } catch (err) {
        console.error('Error assigning interviewer:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ADMIN/MANAGER: Submit evaluation
router.post('/:id/evaluate', auth, validateObjectId('id'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const application = await JobApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Check authorization
        if (user.role === 'manager' && application.assignedInterviewer?.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'You are not assigned to evaluate this application' });
        }

        const {
            department,
            experience,
            education,
            communication,
            presentable,
            fitTheCulture,
            overallImpression,
            comment
        } = req.body;

        // Validate required fields
        if (!department || !experience || !education || !communication || 
            !presentable || !fitTheCulture || !overallImpression) {
            return res.status(400).json({ msg: 'Please provide all required evaluation fields' });
        }

        const evaluatorRole = (user.role === 'admin' || user.role === 'super_admin') ? 'admin' : 'manager';

        // Check if evaluation already exists
        const existingEvaluation = await Evaluation.findOne({
            jobApplication: req.params.id,
            evaluatorRole: evaluatorRole
        });

        if (existingEvaluation) {
            return res.status(400).json({ msg: `${evaluatorRole} evaluation already submitted for this application` });
        }

        // Create evaluation
        const evaluation = new Evaluation({
            jobApplication: req.params.id,
            evaluator: req.user.id,
            evaluatorRole: evaluatorRole,
            candidateName: application.fullName,
            department,
            position: application.positionAppliedFor,
            experience,
            education,
            communication,
            presentable,
            fitTheCulture,
            overallImpression,
            comment: comment || ''
        });

        await evaluation.save();

        // Update application status
        if (evaluatorRole === 'admin') {
            application.adminEvaluationCompleted = true;
        } else {
            application.technicalEvaluationCompleted = true;
        }

        // If both evaluations are complete, mark as evaluated
        if (application.adminEvaluationCompleted && application.technicalEvaluationCompleted) {
            application.status = 'evaluated';
        }

        await application.save();

        // Create audit log
        await createAuditLog({
            action: 'EVALUATION_SUBMITTED',
            performedBy: req.user.id,
            description: `${evaluatorRole} evaluation submitted for application ${application._id}`,
            details: {
                applicationId: application._id,
                candidateName: application.fullName,
                overallImpression: overallImpression
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'MEDIUM'
        });

        res.json({
            msg: 'Evaluation submitted successfully',
            evaluation: evaluation
        });

    } catch (err) {
        console.error('Error submitting evaluation:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ADMIN/MANAGER: Get evaluations for an application
router.get('/:id/evaluations', auth, validateObjectId('id'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const application = await JobApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Managers can only view evaluations for applications assigned to them
        if (user.role === 'manager' && application.assignedInterviewer?.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'You are not authorized to view these evaluations' });
        }

        const evaluations = await Evaluation.find({ jobApplication: req.params.id })
            .populate('evaluator', 'name email role')
            .sort({ createdAt: -1 });

        res.json(evaluations);

    } catch (err) {
        console.error('Error fetching evaluations:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ADMIN: Get application statistics
router.get('/stats/overview', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const totalApplications = await JobApplication.countDocuments();
        const pendingApplications = await JobApplication.countDocuments({ status: 'pending' });
        const underReview = await JobApplication.countDocuments({ status: 'under_review' });
        const evaluated = await JobApplication.countDocuments({ status: 'evaluated' });
        const accepted = await JobApplication.countDocuments({ status: 'accepted' });
        const rejected = await JobApplication.countDocuments({ status: 'rejected' });

        res.json({
            totalApplications,
            pendingApplications,
            underReview,
            evaluated,
            accepted,
            rejected
        });

    } catch (err) {
        console.error('Error fetching statistics:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;

