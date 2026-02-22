const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
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
    validateXLSStructure,
    isWeekend,
    getDayName
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
 * Calculate fingerprint deduction based on the number of misses
 * Progressive deduction system:
 * - 1st miss: 0.25 day
 * - 2nd miss: 0.5 day
 * - 3rd miss: 0.75 day
 * - 4th+ miss: 1 full day each
 * @param {Number} missCount - Total number of misses (1-based)
 * @returns {Number} Deduction amount in days
 */
function calculateFingerprintDeduction(missCount) {
    if (missCount <= 0) return 0;
    if (missCount === 1) return 0.25;
    if (missCount === 2) return 0.5;
    if (missCount === 3) return 0.75;
    return 1; // 4th and beyond: 1 full day each
}

/**
 * Check and reset user's fingerprint miss count if it's a new month
 * @param {Object} user - User document
 * @param {String} currentMonth - Current month in YYYY-MM format
 * @returns {Object} Updated user document
 */
async function checkAndResetFingerprintCount(user, currentMonth) {
    if (user.fingerprintMissResetMonth !== currentMonth) {
        // New month - reset the counter
        user.fingerprintMissCount = 0;
        user.totalFingerprintDeduction = 0;
        user.fingerprintMissResetMonth = currentMonth;
        await user.save();
        console.log(`  Reset fingerprint count for ${user.name} for month ${currentMonth}`);
    }
    return user;
}

/**
 * Process fingerprint miss and calculate deduction
 * @param {Object} user - User document
 * @param {String} missType - Type of miss ('clock_in', 'clock_out', or 'both')
 * @param {String} currentMonth - Current month in YYYY-MM format
 * @returns {Object} {deduction, missCount}
 */
async function processFingerprintMiss(user, missType, currentMonth) {
    // Ensure count is reset for new month
    await checkAndResetFingerprintCount(user, currentMonth);
    
    // Each miss (clock_in or clock_out) counts as one occurrence
    const missesToAdd = missType === 'both' ? 2 : 1;
    let totalDeduction = 0;
    
    for (let i = 0; i < missesToAdd; i++) {
        user.fingerprintMissCount += 1;
        const deduction = calculateFingerprintDeduction(user.fingerprintMissCount);
        totalDeduction += deduction;
        user.totalFingerprintDeduction += deduction;
    }
    
    await user.save();
    
    console.log(`  Fingerprint miss for ${user.name}: type=${missType}, count=${user.fingerprintMissCount}, deduction=${totalDeduction} days`);
    
    return {
        deduction: totalDeduction,
        missCount: user.fingerprintMissCount,
        totalMonthlyDeduction: user.totalFingerprintDeduction
    };
}

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
        
        // Check WFH (Work From Home) forms for Marketing department
        const wfhForm = await Form.findOne({
            user: userId,
            type: 'wfh',
            status: { $in: approvedStatuses },
            wfhDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if (wfhForm) {
            return { form: wfhForm, status: 'wfh' };
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
            weekendSkipped: 0,
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
                    weekendSkipped: 0,
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
                        // Skip weekend days (Friday and Saturday)
                        if (isWeekend(record.date)) {
                            console.log(`  Skipping weekend: ${record.date} (${getDayName(record.date)}) for ${record.employeeCode}`);
                            fileResults.weekendSkipped++;
                            results.weekendSkipped++;
                            continue;
                        }
                        
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
                        let missedClockIn = !record.clockIn;
                        let missedClockOut = !record.clockOut;
                        let isExcused = false;
                        let relatedForm = null;
                        
                        // Default work schedule if user doesn't have one configured
                        // Standard Egyptian office hours: 10:00 AM - 7:00 PM
                        const defaultWorkSchedule = {
                            startTime: '10:00',
                            endTime: '19:00'
                        };
                        
                        // Use user's work schedule or default
                        const workSchedule = (user.workSchedule && user.workSchedule.startTime) 
                            ? user.workSchedule 
                            : defaultWorkSchedule;
                        
                        // Calculate attendance status using work schedule
                        const attendanceStatus = calculateAttendanceStatus(
                            record.clockIn,
                            record.clockOut,
                            workSchedule,
                            15 // 15-minute grace period
                        );
                        status = attendanceStatus.status;
                        minutesLate = attendanceStatus.minutesLate;
                        minutesOvertime = attendanceStatus.minutesOvertime;
                        missedClockIn = attendanceStatus.missedClockIn;
                        missedClockOut = attendanceStatus.missedClockOut;
                        
                        // Cross-reference with approved forms FIRST (before fingerprint deduction)
                        // This ensures WFH days don't get fingerprint deductions
                        const formReference = await crossReferenceWithForms(record.date, user._id);
                        if (formReference) {
                            status = formReference.status;
                            isExcused = true;
                            relatedForm = formReference.form._id;
                        }
                        
                        // Process fingerprint misses and calculate deduction
                        let fingerprintDeduction = 0;
                        let fingerprintMissType = 'none';
                        
                        if (missedClockIn && missedClockOut) {
                            fingerprintMissType = 'both';
                        } else if (missedClockIn) {
                            fingerprintMissType = 'clock_in';
                        } else if (missedClockOut) {
                            fingerprintMissType = 'clock_out';
                        }
                        
                        // Apply deduction if there was a fingerprint miss
                        // SKIP deduction for WFH days - employee working from home doesn't need to clock in/out
                        if (fingerprintMissType !== 'none' && status !== 'wfh') {
                            const missResult = await processFingerprintMiss(user, fingerprintMissType, month);
                            fingerprintDeduction = missResult.deduction;
                        } else if (status === 'wfh') {
                            console.log(`  Skipping fingerprint deduction for ${user.name} - WFH day`);
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
                            existingRecord.fingerprintDeduction = fingerprintDeduction;
                            existingRecord.fingerprintMissType = fingerprintMissType;
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
                                fingerprintDeduction: fingerprintDeduction,
                                fingerprintMissType: fingerprintMissType,
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
                        wfh: 0,
                        unexcusedAbsences: 0,
                        totalMinutesLate: 0,
                        totalMinutesOvertime: 0,
                        totalFingerprintDeduction: 0,
                        fingerprintMisses: 0
                    }
                };
            }
            
            userAttendanceMap[userId].records.push(record);
            userAttendanceMap[userId].stats.totalDays++;
            
            // Update statistics
            const stats = userAttendanceMap[userId].stats;
            stats.totalMinutesLate += record.minutesLate || 0;
            stats.totalMinutesOvertime += record.minutesOvertime || 0;
            stats.totalFingerprintDeduction += record.fingerprintDeduction || 0;
            
            if (record.fingerprintMissType && record.fingerprintMissType !== 'none') {
                stats.fingerprintMisses++;
            }
            
            // Count present (includes both on-time and late arrivals)
            if (record.status === 'present') {
                stats.present++;
            } else if (record.status === 'late') {
                stats.present++; // Late employees ARE present
                stats.late++;
            } else if (record.status === 'absent') {
                stats.absent++;
                if (!record.isExcused) {
                    stats.unexcusedAbsences++;
                }
            } else if (record.status === 'excused') {
                stats.excused++;
            } else if (record.status === 'on_leave') {
                stats.onLeave++;
            } else if (record.status === 'wfh') {
                stats.wfh++;
            }
        }
        
        // Convert map to array
        const report = Object.values(userAttendanceMap);
        
        // Calculate overtime summary for admin
        const overtimeSummary = {
            totalOvertimeMinutes: 0,
            totalOvertimeHours: 0,
            employeesWithOvertime: []
        };
        
        for (const emp of report) {
            if (emp.stats.totalMinutesOvertime > 0) {
                overtimeSummary.totalOvertimeMinutes += emp.stats.totalMinutesOvertime;
                overtimeSummary.employeesWithOvertime.push({
                    name: emp.user.name,
                    department: emp.user.department,
                    employeeCode: emp.user.employeeCode,
                    overtimeMinutes: emp.stats.totalMinutesOvertime,
                    overtimeHours: Math.round((emp.stats.totalMinutesOvertime / 60) * 100) / 100
                });
            }
        }
        
        overtimeSummary.totalOvertimeHours = Math.round((overtimeSummary.totalOvertimeMinutes / 60) * 100) / 100;
        
        // Sort employees by overtime (highest first)
        overtimeSummary.employeesWithOvertime.sort((a, b) => b.overtimeMinutes - a.overtimeMinutes);
        
        res.json({
            month: month,
            totalEmployees: report.length,
            overtimeSummary: overtimeSummary,
            report: report
        });
        
    } catch (error) {
        console.error('Error getting monthly report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/team-report/:month
 * Get team members' attendance for a specific month
 * Manager only - returns attendance for employees in managed departments
 */
router.get('/team-report/:month', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (!manager || manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Access denied. Manager only.' });
        }
        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.status(403).json({ msg: 'No managed departments assigned.' });
        }

        const { month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }

        // Get ALL team members (employees in managed departments) with full details
        const teamMembers = await User.find({
            department: { $in: manager.managedDepartments },
            role: 'employee',
            status: 'active'
        }).select('name email employeeCode department workSchedule');

        if (teamMembers.length === 0) {
            return res.json({
                month,
                totalEmployees: 0,
                overtimeSummary: { totalOvertimeMinutes: 0, totalOvertimeHours: 0, employeesWithOvertime: [] },
                report: []
            });
        }

        const teamMemberIds = teamMembers.map(u => u._id);

        // Initialize report with ALL team members (zeros for those without attendance data)
        const userAttendanceMap = {};
        for (const member of teamMembers) {
            const userId = member._id.toString();
            userAttendanceMap[userId] = {
                user: {
                    id: member._id,
                    name: member.name,
                    email: member.email,
                    employeeCode: member.employeeCode,
                    department: member.department,
                    workSchedule: member.workSchedule
                },
                records: [],
                stats: {
                    totalDays: 0,
                    present: 0,
                    late: 0,
                    absent: 0,
                    excused: 0,
                    onLeave: 0,
                    wfh: 0,
                    unexcusedAbsences: 0,
                    totalMinutesLate: 0,
                    totalMinutesOvertime: 0,
                    totalFingerprintDeduction: 0,
                    fingerprintMisses: 0
                }
            };
        }

        // Get attendance records and fill in stats for team members who have data
        const attendanceRecords = await Attendance.find({
            month,
            user: { $in: teamMemberIds }
        })
            .populate('relatedForm', 'type status')
            .sort({ date: 1 });

        for (const record of attendanceRecords) {
            const userId = record.user.toString();
            if (!userAttendanceMap[userId]) continue;
            userAttendanceMap[userId].records.push(record);
            userAttendanceMap[userId].stats.totalDays++;
            const stats = userAttendanceMap[userId].stats;
            stats.totalMinutesLate += record.minutesLate || 0;
            stats.totalMinutesOvertime += record.minutesOvertime || 0;
            stats.totalFingerprintDeduction += record.fingerprintDeduction || 0;
            if (record.fingerprintMissType && record.fingerprintMissType !== 'none') {
                stats.fingerprintMisses++;
            }
            if (record.status === 'present') {
                stats.present++;
            } else if (record.status === 'late') {
                stats.present++;
                stats.late++;
            } else if (record.status === 'absent') {
                stats.absent++;
                if (!record.isExcused) stats.unexcusedAbsences++;
            } else if (record.status === 'excused') {
                stats.excused++;
            } else if (record.status === 'on_leave') {
                stats.onLeave++;
            } else if (record.status === 'wfh') {
                stats.wfh++;
            }
        }

        const report = Object.values(userAttendanceMap);
        const overtimeSummary = {
            totalOvertimeMinutes: 0,
            totalOvertimeHours: 0,
            employeesWithOvertime: []
        };
        for (const emp of report) {
            if (emp.stats.totalMinutesOvertime > 0) {
                overtimeSummary.totalOvertimeMinutes += emp.stats.totalMinutesOvertime;
                overtimeSummary.employeesWithOvertime.push({
                    name: emp.user.name,
                    department: emp.user.department,
                    employeeCode: emp.user.employeeCode,
                    overtimeMinutes: emp.stats.totalMinutesOvertime,
                    overtimeHours: Math.round((emp.stats.totalMinutesOvertime / 60) * 100) / 100
                });
            }
        }
        overtimeSummary.totalOvertimeHours = Math.round((overtimeSummary.totalOvertimeMinutes / 60) * 100) / 100;
        overtimeSummary.employeesWithOvertime.sort((a, b) => b.overtimeMinutes - a.overtimeMinutes);

        res.json({ month, totalEmployees: report.length, overtimeSummary, report });
    } catch (error) {
        console.error('Error getting team attendance report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/team-employee/:userId/:month
 * Get specific team member's attendance for a month
 * Manager only - must verify employee is in managed departments
 */
router.get('/team-employee/:userId/:month', auth, validateObjectId('userId'), async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (!manager || manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Access denied. Manager only.' });
        }
        if (!manager.managedDepartments || manager.managedDepartments.length === 0) {
            return res.status(403).json({ msg: 'No managed departments assigned.' });
        }

        const { userId, month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (!manager.managedDepartments.includes(user.department) || user.role !== 'employee') {
            return res.status(403).json({ msg: 'Employee is not in your managed departments.' });
        }

        const records = await Attendance.getMonthlyAttendance(userId, month);
        const stats = await Attendance.getUserStats(userId, month);

        res.json({ user, month, records, stats });
    } catch (error) {
        console.error('Error getting team employee attendance:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/employee/:userId/:month
 * Get specific employee's attendance for a month
 * Admin only
 */
router.get('/employee/:userId/:month', auth, validateObjectId('userId'), async (req, res) => {
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

/**
 * GET /api/attendance/data-summary/:month
 * Get detailed data summary for verification
 * Admin only
 */
router.get('/data-summary/:month', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        
        const { month } = req.params;
        
        // Get all users with employee codes
        const users = await User.find({ 
            employeeCode: { $exists: true, $ne: null } 
        }).select('name employeeCode department');
        
        // Get all attendance records for the month
        const records = await Attendance.find({ month: month })
            .populate('user', 'name employeeCode department')
            .sort({ date: 1 });
        
        // Build detailed summary per employee
        const employeeSummaries = [];
        
        for (const user of users) {
            const userRecords = records.filter(r => 
                r.user && r.user._id.toString() === user._id.toString()
            );
            
            if (userRecords.length === 0) continue;
            
            const summary = {
                user: {
                    id: user._id,
                    name: user.name,
                    employeeCode: user.employeeCode,
                    department: user.department
                },
                totalRecords: userRecords.length,
                daysWithClockIn: 0,
                daysWithClockOut: 0,
                daysMissedClockIn: 0,
                daysMissedClockOut: 0,
                daysPresent: 0,
                daysLate: 0,
                daysAbsent: 0,
                totalMinutesLate: 0,
                totalMinutesOvertime: 0,
                totalDeduction: 0,
                dailyRecords: []
            };
            
            for (const record of userRecords) {
                const dayData = {
                    date: record.date,
                    day: getDayName(record.date),
                    clockIn: record.clockIn || null,
                    clockOut: record.clockOut || null,
                    status: record.status,
                    minutesLate: record.minutesLate || 0,
                    minutesOvertime: record.minutesOvertime || 0,
                    deduction: record.fingerprintDeduction || 0,
                    missedClockIn: record.missedClockIn || false,
                    missedClockOut: record.missedClockOut || false
                };
                
                summary.dailyRecords.push(dayData);
                
                if (record.clockIn) summary.daysWithClockIn++;
                if (record.clockOut) summary.daysWithClockOut++;
                if (record.missedClockIn) summary.daysMissedClockIn++;
                if (record.missedClockOut) summary.daysMissedClockOut++;
                
                if (record.status === 'present') {
                    summary.daysPresent++;
                } else if (record.status === 'late') {
                    summary.daysPresent++;
                    summary.daysLate++;
                } else if (record.status === 'absent') {
                    summary.daysAbsent++;
                }
                
                summary.totalMinutesLate += record.minutesLate || 0;
                summary.totalMinutesOvertime += record.minutesOvertime || 0;
                summary.totalDeduction += record.fingerprintDeduction || 0;
            }
            
            employeeSummaries.push(summary);
        }
        
        res.json({
            month,
            totalEmployeesWithData: employeeSummaries.length,
            summaries: employeeSummaries
        });
        
    } catch (error) {
        console.error('Error getting data summary:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

module.exports = router;

