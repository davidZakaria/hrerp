const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Form = require('../models/Form');
const {
    parseXLSFile,
    calculateAttendanceStatus,
    getMonthString,
    validateXLSStructure
} = require('../utils/attendanceParser');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/attendance';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only .xls and .xlsx files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Cross-reference attendance date with approved forms
 * @param {Date} date - Attendance date
 * @param {String} userId - User ID
 * @returns {Object|null} Related form if date is covered
 */
async function crossReferenceWithForms(date, userId) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Check for approved forms that cover this date
        const approvedStatuses = ['approved', 'manager_approved', 'manager_submitted'];
        
        // Check vacation forms
        const vacationForm = await Form.findOne({
            user: userId,
            type: 'vacation',
            status: { $in: approvedStatuses },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        
        if (vacationForm) {
            return { form: vacationForm, status: 'on_leave' };
        }
        
        // Check sick leave forms
        const sickLeaveForm = await Form.findOne({
            user: userId,
            type: 'sick_leave',
            status: { $in: approvedStatuses },
            sickLeaveStartDate: { $lte: endOfDay },
            sickLeaveEndDate: { $gte: startOfDay }
        });
        
        if (sickLeaveForm) {
            return { form: sickLeaveForm, status: 'on_leave' };
        }
        
        // Check excuse forms (for the specific date)
        const excuseForm = await Form.findOne({
            user: userId,
            type: 'excuse',
            status: { $in: approvedStatuses },
            excuseDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if (excuseForm) {
            return { form: excuseForm, status: 'excused' };
        }
        
        return null;
    } catch (error) {
        console.error('Error cross-referencing with forms:', error);
        return null;
    }
}

/**
 * POST /api/attendance/upload
 * Upload multiple XLS files with attendance data
 * Admin only
 */
router.post('/upload', auth, upload.array('attendanceFiles', 10), async (req, res) => {
    try {
        // Check if user is admin
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            // Clean up uploaded files
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ msg: 'No files uploaded' });
        }
        
        console.log(`Processing ${req.files.length} attendance files...`);
        
        const results = {
            totalFiles: req.files.length,
            processedFiles: 0,
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            unmatchedCodes: [],
            errors: [],
            summary: []
        };
        
        // Process each file
        for (const file of req.files) {
            try {
                console.log(`\nProcessing file: ${file.originalname}`);
                
                // Validate file structure
                const validation = validateXLSStructure(file.path);
                if (!validation.isValid) {
                    results.errors.push({
                        file: file.originalname,
                        error: validation.message
                    });
                    continue;
                }
                
                // Parse the file
                const parseResult = parseXLSFile(file.path);
                
                if (!parseResult.success) {
                    results.errors.push({
                        file: file.originalname,
                        error: parseResult.error
                    });
                    continue;
                }
                
                results.processedFiles++;
                results.totalRecords += parseResult.totalRows;
                
                const fileResults = {
                    filename: file.originalname,
                    totalRows: parseResult.totalRows,
                    validRows: parseResult.validRows,
                    saved: 0,
                    skipped: 0,
                    errors: parseResult.errors
                };
                
                // Log first few errors for debugging
                if (parseResult.errors && parseResult.errors.length > 0) {
                    console.log('First 5 parsing errors:');
                    parseResult.errors.slice(0, 5).forEach(err => {
                        console.log(`  Row ${err.row}: ${err.error}`);
                        console.log(`  Data:`, err.data);
                    });
                }
                
                // Process each record
                for (const record of parseResult.data) {
                    try {
                        // Find user by employee code
                        const user = await User.findOne({ employeeCode: record.employeeCode });
                        
                        if (!user) {
                            results.unmatchedCodes.push({
                                code: record.employeeCode,
                                name: record.name,
                                file: file.originalname
                            });
                            fileResults.skipped++;
                            results.failedRecords++;
                            continue;
                        }
                        
                        // Get month string
                        const month = getMonthString(record.date);
                        
                        // Calculate attendance status
                        let status = 'present';
                        let minutesLate = 0;
                        let minutesOvertime = 0;
                        let missedClockIn = false;
                        let missedClockOut = false;
                        let isExcused = false;
                        let relatedForm = null;
                        
                        if (user.workSchedule && user.workSchedule.startTime) {
                            const attendanceStatus = calculateAttendanceStatus(
                                record.clockIn,
                                record.clockOut,
                                user.workSchedule,
                                15 // 15-minute grace period
                            );
                            status = attendanceStatus.status;
                            minutesLate = attendanceStatus.minutesLate;
                            minutesOvertime = attendanceStatus.minutesOvertime;
                            missedClockIn = attendanceStatus.missedClockIn;
                            missedClockOut = attendanceStatus.missedClockOut;
                        }
                        
                        // Cross-reference with approved forms
                        const formReference = await crossReferenceWithForms(record.date, user._id);
                        if (formReference) {
                            status = formReference.status;
                            isExcused = true;
                            relatedForm = formReference.form._id;
                        }
                        
                        // Check if attendance record already exists
                        const existingRecord = await Attendance.findOne({
                            user: user._id,
                            date: record.date
                        });
                        
                        if (existingRecord) {
                            // Update existing record
                            existingRecord.clockIn = record.clockIn;
                            existingRecord.clockOut = record.clockOut;
                            existingRecord.status = status;
                            existingRecord.minutesLate = minutesLate;
                            existingRecord.minutesOvertime = minutesOvertime;
                            existingRecord.missedClockIn = missedClockIn;
                            existingRecord.missedClockOut = missedClockOut;
                            existingRecord.isExcused = isExcused;
                            existingRecord.relatedForm = relatedForm;
                            existingRecord.uploadedBy = admin._id;
                            existingRecord.uploadedAt = new Date();
                            await existingRecord.save();
                        } else {
                            // Create new record
                            const attendanceRecord = new Attendance({
                                employeeCode: record.employeeCode,
                                user: user._id,
                                date: record.date,
                                clockIn: record.clockIn,
                                clockOut: record.clockOut,
                                status: status,
                                location: file.originalname, // Use filename as location identifier
                                minutesLate: minutesLate,
                                minutesOvertime: minutesOvertime,
                                missedClockIn: missedClockIn,
                                missedClockOut: missedClockOut,
                                isExcused: isExcused,
                                relatedForm: relatedForm,
                                month: month,
                                uploadedBy: admin._id
                            });
                            
                            await attendanceRecord.save();
                        }
                        
                        fileResults.saved++;
                        results.successfulRecords++;
                        
                    } catch (error) {
                        console.error(`Error processing record:`, error);
                        fileResults.errors.push({
                            employeeCode: record.employeeCode,
                            error: error.message
                        });
                        results.failedRecords++;
                    }
                }
                
                results.summary.push(fileResults);
                
                // Clean up the uploaded file
                fs.unlinkSync(file.path);
                
            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                results.errors.push({
                    file: file.originalname,
                    error: error.message
                });
            }
        }
        
        console.log('\nAttendance upload completed:', results);
        
        res.json({
            msg: 'Attendance upload completed',
            results: results
        });
        
    } catch (error) {
        console.error('Error uploading attendance:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ msg: 'Server error during upload', error: error.message });
    }
});

/**
 * GET /api/attendance/monthly-report/:month
 * Get all employees' attendance for a specific month
 * Admin only
 */
router.get('/monthly-report/:month', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        
        const { month } = req.params; // Format: YYYY-MM
        
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }
        
        // Get all attendance records for the month
        const attendanceRecords = await Attendance.getAllMonthlyAttendance(month);
        
        // Group by user and calculate statistics
        const userAttendanceMap = {};
        
        for (const record of attendanceRecords) {
            const userId = record.user._id.toString();
            
            if (!userAttendanceMap[userId]) {
                userAttendanceMap[userId] = {
                    user: {
                        id: record.user._id,
                        name: record.user.name,
                        email: record.user.email,
                        employeeCode: record.user.employeeCode,
                        department: record.user.department,
                        workSchedule: record.user.workSchedule
                    },
                    records: [],
                    stats: {
                        totalDays: 0,
                        present: 0,
                        late: 0,
                        absent: 0,
                        excused: 0,
                        onLeave: 0,
                        unexcusedAbsences: 0,
                        totalMinutesLate: 0
                    }
                };
            }
            
            userAttendanceMap[userId].records.push(record);
            userAttendanceMap[userId].stats.totalDays++;
            
            // Update statistics
            const stats = userAttendanceMap[userId].stats;
            stats.totalMinutesLate += record.minutesLate || 0;
            
            if (record.status === 'present') stats.present++;
            else if (record.status === 'late') stats.late++;
            else if (record.status === 'absent') stats.absent++;
            else if (record.status === 'excused') stats.excused++;
            else if (record.status === 'on_leave') stats.onLeave++;
            
            if (record.isExcused) {
                stats.excused++;
            } else if (record.status === 'absent') {
                stats.unexcusedAbsences++;
            }
        }
        
        // Convert map to array
        const report = Object.values(userAttendanceMap);
        
        res.json({
            month: month,
            totalEmployees: report.length,
            report: report
        });
        
    } catch (error) {
        console.error('Error getting monthly report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/employee/:userId/:month
 * Get specific employee's attendance for a month
 * Admin only
 */
router.get('/employee/:userId/:month', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        
        const { userId, month } = req.params;
        
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }
        
        // Get user
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Get attendance records
        const records = await Attendance.getMonthlyAttendance(userId, month);
        
        // Calculate statistics
        const stats = await Attendance.getUserStats(userId, month);
        
        res.json({
            user: user,
            month: month,
            records: records,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error getting employee attendance:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/my-attendance/:month
 * Get logged-in employee's own attendance for a month
 */
router.get('/my-attendance/:month', auth, async (req, res) => {
    try {
        const { month } = req.params;
        
        // Validate month format
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }
        
        // Get user
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        // Get attendance records
        const records = await Attendance.getMonthlyAttendance(req.user.id, month);
        
        // Calculate statistics
        const stats = await Attendance.getUserStats(req.user.id, month);
        
        res.json({
            user: user,
            month: month,
            records: records,
            stats: stats
        });
        
    } catch (error) {
        console.error('Error getting my attendance:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/months
 * Get list of available attendance months
 */
router.get('/months', auth, async (req, res) => {
    try {
        // Get distinct months from attendance collection
        const months = await Attendance.distinct('month');
        
        // Sort in descending order (most recent first)
        months.sort().reverse();
        
        res.json({ months });
        
    } catch (error) {
        console.error('Error getting available months:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

module.exports = router;

