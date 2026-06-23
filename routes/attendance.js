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
const { parseDateRangeQuery, monthToRange } = require('../utils/attendanceDateRange');
const { buildOtReconciliationPayload } = require('../utils/buildOtReconciliationPayload');
const {
    buildDateRangeDetailRows,
    aggregateOrgKpis,
    applyRecalcAttendance
} = require('../utils/attendanceDetailBuilder');
const {
    fingerprintDeductionDays,
    missingPunchPenalty,
    buildDeductionReport,
    APPROVED_WAIVER_STATUSES,
    WAIVER_FORM_TYPES
} = require('../utils/deductionCalculator');
const { getSystemSettings } = require('../utils/getSystemSettings');
const {
    buildDetailedLeavesReport,
    APPROVED_LEAVE_STATUSES
} = require('../utils/detailedLeavesCalculator');
const { getEffectiveManagedDepartmentsForQueries } = require('../utils/effectiveManagedDepartments');

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
 * Calculate fingerprint deduction based on the number of misses (new 3-pillar tiers).
 * 1st/2nd = warning (0), 3rd = 0.25, 4th = 0.50, 5th = 0.75, 6th+ = 1.0
 */
function calculateFingerprintDeduction(missCount) {
    return fingerprintDeductionDays(missCount);
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
    if (missType === 'both') {
        return {
            deduction: 0,
            missCount: user.fingerprintMissCount,
            totalMonthlyDeduction: user.totalFingerprintDeduction,
            label: 'Full absence (Pillar C)'
        };
    }

    await checkAndResetFingerprintCount(user, currentMonth);

    user.fingerprintMissCount += 1;
    const penalty = missingPunchPenalty(user.fingerprintMissCount);
    const deduction = penalty.days;
    user.totalFingerprintDeduction += deduction;

    await user.save();

    console.log(`  Fingerprint miss for ${user.name}: type=${missType}, count=${user.fingerprintMissCount}, deduction=${deduction} days (${penalty.label})`);

    return {
        deduction,
        missCount: user.fingerprintMissCount,
        totalMonthlyDeduction: user.totalFingerprintDeduction,
        label: penalty.label
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

        const missionForm = await Form.findOne({
            user: userId,
            type: 'mission',
            status: { $in: approvedStatuses },
            missionStartDate: { $lte: endOfDay },
            missionEndDate: { $gte: startOfDay }
        });

        if (missionForm) {
            return { form: missionForm, status: 'on_leave' };
        }

        return null;
    } catch (error) {
        console.error('Error cross-referencing with forms:', error);
        return null;
    }
}

/**
 * Group attendance records by user and compute per-user stats + overtime summary (admin/manager reports).
 */
function buildReportAndOvertimeFromRecords(attendanceRecords) {
    const userAttendanceMap = {};

    for (const record of attendanceRecords) {
        if (!record.user || !record.user._id) continue;
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

    return { report, overtimeSummary };
}

/**
 * Manager team report: all team members with zeros, filled from attendance in date range.
 */
async function buildTeamReportPayload(manager, rangeStart, rangeEnd) {
    const emptyOvertime = {
        totalOvertimeMinutes: 0,
        totalOvertimeHours: 0,
        employeesWithOvertime: []
    };
    const emptyKpi = {
        totalPresent: 0,
        totalAbsences: 0,
        totalLateHours: 0,
        totalLateMinutes: 0,
        pendingMissedPunches: 0
    };

    const effectiveManaged = getEffectiveManagedDepartmentsForQueries(manager);
    if (effectiveManaged.length === 0) {
        return { report: [], overtimeSummary: emptyOvertime, kpi: emptyKpi };
    }

    const teamMembers = await User.find({
        department: { $in: effectiveManaged },
        role: 'employee',
        status: 'active'
    }).select('name email employeeCode department workSchedule');

    if (teamMembers.length === 0) {
        return { report: [], overtimeSummary: emptyOvertime, kpi: emptyKpi };
    }

    const teamMemberIds = teamMembers.map(u => u._id);
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

    const attendanceRecords = await Attendance.find({
        date: { $gte: rangeStart, $lte: rangeEnd },
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

    const kpi = aggregateOrgKpis(attendanceRecords);
    return { report, overtimeSummary, kpi };
}

/**
 * GET /api/attendance/zkteco-status
 * Returns whether ZKTeco real-time push is enabled (for frontend banner)
 * Admin only
 */
router.get('/zkteco-status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        res.json({ zktecoEnabled: process.env.ZKTECO_ENABLED !== 'false' });
    } catch (err) {
        console.error('Error getting zkteco status:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

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

        const settings = await getSystemSettings();
        const graceMinutes = settings.latenessGracePeriodMinutes;
        
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
                
                // Validate (don't block - attempt parse; include note in results for debugging)
                const validation = validateXLSStructure(file.path);
                if (!validation.isValid) {
                    console.log(`  Validation note: ${validation.message}`);
                    results.errors.push({
                        file: file.originalname,
                        error: `${validation.message} (parsing was still attempted)`
                    });
                }
                
                // Always attempt to parse - we'll get useful errors if structure is wrong
                const parseResult = parseXLSFile(file.path);
                
                results.processedFiles++;
                
                if (!parseResult.success) {
                    results.errors.push({ file: file.originalname, error: parseResult.error });
                    results.summary.push({
                        filename: file.originalname,
                        totalRows: 0,
                        validRows: 0,
                        saved: 0,
                        skipped: 0,
                        weekendSkipped: 0,
                        errors: parseResult.errors || [{ row: 0, error: parseResult.error, data: null }],
                        sampleKeys: null
                    });
                    try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
                    continue;
                }
                
                results.totalRecords += parseResult.totalRows;
                
                const fileResults = {
                    filename: file.originalname,
                    totalRows: parseResult.totalRows,
                    validRows: parseResult.validRows,
                    saved: 0,
                    skipped: 0,
                    weekendSkipped: 0,
                    errors: parseResult.errors,
                    sampleKeys: parseResult.data?.[0] ? null : (parseResult.errors?.[0]?.data ? Object.keys(parseResult.errors[0].data) : null)
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
                        
                        // Find user by employee code (flexible: try raw, EMP prefix, zero-padded)
                        const code = String(record.employeeCode || '').trim();
                        let user = await User.findOne({ employeeCode: code });
                        if (!user) {
                            const variants = [
                                code,
                                'EMP' + code,
                                'EMP' + code.padStart(4, '0'),
                                code.padStart(4, '0'),
                                code.padStart(3, '0')
                            ].filter((v, i, a) => a.indexOf(v) === i);
                            for (const v of variants) {
                                user = await User.findOne({ employeeCode: v });
                                if (user) break;
                            }
                        }
                        
                        if (!user) {
                            const alreadyListed = results.unmatchedCodes.some(
                                u => u.code === record.employeeCode && u.file === file.originalname
                            );
                            if (!alreadyListed) {
                                results.unmatchedCodes.push({
                                    code: record.employeeCode,
                                    name: record.name,
                                    file: file.originalname
                                });
                            }
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
                            graceMinutes,
                            record.date
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
                        
                        // Apply deduction for single missing punch only (both missing = Pillar C absence)
                        if (
                            (fingerprintMissType === 'clock_in' || fingerprintMissType === 'clock_out') &&
                            status !== 'wfh' &&
                            !isExcused
                        ) {
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
                            // Update existing record (clockIn/clockOut can be null for absent)
                            existingRecord.clockIn = record.clockIn || '';
                            existingRecord.clockOut = record.clockOut || '';
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
                            existingRecord.source = 'manual';
                            await existingRecord.save();
                        } else {
                            // Create new record
                            const attendanceRecord = new Attendance({
                                employeeCode: record.employeeCode,
                                user: user._id,
                                date: record.date,
                                clockIn: record.clockIn || '',
                                clockOut: record.clockOut || '',
                                status: status,
                                location: file.originalname, // Use filename as location identifier
                                source: 'manual',
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
 * POST /api/attendance/recalc-overtime
 * Recompute minutesOvertime using 8h workday fingerprint rule (admin/super_admin).
 */
router.post('/recalc-overtime', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;

        const records = await Attendance.find({
            date: { $gte: rangeStart, $lte: rangeEnd },
            clockIn: { $exists: true, $ne: '' },
            clockOut: { $exists: true, $ne: '' }
        }).populate('user', 'workSchedule');

        const settings = await getSystemSettings();
        let updated = 0;
        for (const att of records) {
            if (!att.user) continue;
            applyRecalcAttendance(att, att.user, settings.latenessGracePeriodMinutes);
            await att.save();
            updated++;
        }

        res.json({
            msg: 'Overtime recalculated',
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            recordsUpdated: updated
        });
    } catch (error) {
        console.error('Error recalculating overtime:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/ot-reconciliation
 * Fingerprint OT (8h workday) merged with approved Overtime Request forms.
 */
router.get('/ot-reconciliation', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const payload = await buildOtReconciliationPayload(rangeStart, rangeEnd);
        res.json(payload);
    } catch (error) {
        console.error('Error getting OT reconciliation report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/deduction-report
 * 3-pillar deduction report: missing punches, time shortfall, full absence.
 */
router.get('/deduction-report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;

        const extendedStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1, 0, 0, 0, 0);

        const [users, attendanceRecords, waiverForms, otForms] = await Promise.all([
            User.find({ employeeCode: { $exists: true, $ne: '' } })
                .select('name department employeeCode workSchedule jobTitle location')
                .sort({ name: 1 }),
            Attendance.find({
                date: { $gte: extendedStart, $lte: rangeEnd }
            }).populate('user', 'name department employeeCode workSchedule jobTitle location'),
            Form.find({
                type: { $in: WAIVER_FORM_TYPES },
                status: { $in: APPROVED_WAIVER_STATUSES },
                $or: [
                    { type: 'vacation', endDate: { $gte: extendedStart }, startDate: { $lte: rangeEnd } },
                    { type: 'sick_leave', sickLeaveEndDate: { $gte: extendedStart }, sickLeaveStartDate: { $lte: rangeEnd } },
                    { type: 'wfh', wfhDate: { $gte: extendedStart, $lte: rangeEnd } },
                    { type: 'mission', missionEndDate: { $gte: extendedStart }, missionStartDate: { $lte: rangeEnd } }
                ]
            }).populate('user', 'name department employeeCode'),
            Form.find({
                type: 'extra_hours',
                status: 'approved',
                extraHoursDate: { $gte: rangeStart, $lte: rangeEnd }
            }).populate('user', 'name department employeeCode')
        ]);

        const settings = await getSystemSettings();
        const report = buildDeductionReport({
            users,
            attendanceRecords,
            waiverForms,
            otForms,
            rangeStart,
            rangeEnd,
            policy: {
                graceMinutes: settings.latenessGracePeriodMinutes,
                shiftMinutes: settings.standardShiftHours * 60,
                shiftHours: settings.standardShiftHours
            }
        });

        res.json({
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            ...report
        });
    } catch (error) {
        console.error('Error getting deduction report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/detailed-leaves-report
 * Monthly detailed leaves & absenteeism report (whiteboard rules).
 * Query: month=YYYY-MM (preferred) or startDate/endDate covering one calendar month.
 */
router.get('/detailed-leaves-report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        let rangeStart;
        let rangeEnd;
        let monthLabel = req.query.month;

        if (monthLabel) {
            if (!/^\d{4}-\d{2}$/.test(monthLabel)) {
                return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
            }
            const range = monthToRange(monthLabel);
            if (!range) {
                return res.status(400).json({ msg: 'Invalid month' });
            }
            rangeStart = range.rangeStart;
            rangeEnd = range.rangeEnd;
        } else {
            const parsed = parseDateRangeQuery(req.query);
            if (parsed.error) {
                return res.status(400).json({ msg: parsed.error });
            }
            rangeStart = parsed.rangeStart;
            rangeEnd = parsed.rangeEnd;
            const y = rangeStart.getFullYear();
            const m = String(rangeStart.getMonth() + 1).padStart(2, '0');
            monthLabel = `${y}-${m}`;
        }

        const settings = await getSystemSettings();
        const annualQuota = settings.annualVacationDays ?? 15;
        const casualQuota = settings.casualVacationDays ?? 6;

        const [users, attendanceRecords, forms] = await Promise.all([
            User.find({ employeeCode: { $exists: true, $ne: '' } })
                .select('name department employeeCode jobTitle location')
                .sort({ name: 1 }),
            Attendance.find({
                date: { $gte: rangeStart, $lte: rangeEnd }
            }).populate('user', 'name employeeCode'),
            Form.find({
                status: { $in: APPROVED_LEAVE_STATUSES },
                $or: [
                    {
                        type: 'vacation',
                        endDate: { $gte: rangeStart },
                        startDate: { $lte: rangeEnd }
                    },
                    {
                        type: 'sick_leave',
                        sickLeaveEndDate: { $gte: rangeStart },
                        sickLeaveStartDate: { $lte: rangeEnd }
                    },
                    {
                        type: 'wfh',
                        wfhDate: { $gte: rangeStart, $lte: rangeEnd }
                    },
                    {
                        type: 'mission',
                        missionEndDate: { $gte: rangeStart },
                        missionStartDate: { $lte: rangeEnd }
                    }
                ]
            }).populate('user', 'name employeeCode')
        ]);

        const report = buildDetailedLeavesReport({
            users,
            attendanceRecords,
            forms,
            monthStart: rangeStart,
            monthEnd: rangeEnd,
            annualQuota,
            casualQuota
        });

        res.json({
            month: monthLabel,
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            annualQuota,
            casualQuota,
            ...report
        });
    } catch (error) {
        console.error('Error getting detailed leaves report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/report
 * Admin summary for arbitrary date range (query: startDate, endDate ISO).
 */
router.get('/report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const attendanceRecords = await Attendance.getAllInDateRange(rangeStart, rangeEnd);
        const { report, overtimeSummary } = buildReportAndOvertimeFromRecords(attendanceRecords);
        const kpi = aggregateOrgKpis(attendanceRecords);
        res.json({
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            totalEmployees: report.length,
            kpi,
            overtimeSummary,
            report
        });
    } catch (error) {
        console.error('Error getting attendance report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
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

        const { month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }

        const mr = monthToRange(month);
        if (!mr) {
            return res.status(400).json({ msg: 'Invalid month' });
        }

        const attendanceRecords = await Attendance.getAllInDateRange(mr.rangeStart, mr.rangeEnd);
        const { report, overtimeSummary } = buildReportAndOvertimeFromRecords(attendanceRecords);
        const kpi = aggregateOrgKpis(attendanceRecords);

        res.json({
            month,
            startDate: mr.rangeStart.toISOString(),
            endDate: mr.rangeEnd.toISOString(),
            totalEmployees: report.length,
            kpi,
            overtimeSummary,
            report
        });
    } catch (error) {
        console.error('Error getting monthly report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/team-report
 * Manager team summary for date range (query: startDate, endDate ISO).
 */
router.get('/team-report', auth, async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (!manager || manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Access denied. Manager only.' });
        }
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const { report, overtimeSummary, kpi } = await buildTeamReportPayload(manager, rangeStart, rangeEnd);
        res.json({
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            totalEmployees: report.length,
            kpi,
            overtimeSummary,
            report
        });
    } catch (error) {
        console.error('Error getting team attendance report:', error);
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

        const { month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ msg: 'Invalid month format. Use YYYY-MM' });
        }

        const mr = monthToRange(month);
        if (!mr) {
            return res.status(400).json({ msg: 'Invalid month' });
        }

        const { report, overtimeSummary, kpi } = await buildTeamReportPayload(manager, mr.rangeStart, mr.rangeEnd);
        res.json({
            month,
            startDate: mr.rangeStart.toISOString(),
            endDate: mr.rangeEnd.toISOString(),
            totalEmployees: report.length,
            kpi,
            overtimeSummary,
            report
        });
    } catch (error) {
        console.error('Error getting team attendance report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * PATCH /api/attendance/:attendanceId/fix-punch
 * Admin/super_admin only — manual punch correction with audit trail.
 */
router.patch('/:attendanceId/fix-punch', auth, validateObjectId('attendanceId'), async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        const { clockIn, clockOut, reason } = req.body;
        if (!reason || !String(reason).trim()) {
            return res.status(400).json({ msg: 'Reason is required for compliance' });
        }
        if (clockIn === undefined && clockOut === undefined) {
            return res.status(400).json({ msg: 'Provide clockIn and/or clockOut' });
        }

        const att = await Attendance.findById(req.params.attendanceId);
        if (!att) {
            return res.status(404).json({ msg: 'Attendance record not found' });
        }

        const user = await User.findById(att.user);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const previousValues = {
            clockIn: att.clockIn,
            clockOut: att.clockOut,
            status: att.status,
            minutesLate: att.minutesLate,
            minutesOvertime: att.minutesOvertime,
            missedClockIn: att.missedClockIn,
            missedClockOut: att.missedClockOut
        };

        const fieldsChanged = [];
        if (clockIn !== undefined) {
            att.clockIn = clockIn;
            fieldsChanged.push('clockIn');
        }
        if (clockOut !== undefined) {
            att.clockOut = clockOut;
            fieldsChanged.push('clockOut');
        }

        att.source = 'manual';
        const settings = await getSystemSettings();
        applyRecalcAttendance(att, user, settings.latenessGracePeriodMinutes);

        att.adjustmentHistory.push({
            at: new Date(),
            by: req.user.id,
            reason: String(reason).trim(),
            fieldsChanged,
            previousValues
        });
        att.lastAdjustedAt = new Date();
        att.lastAdjustedBy = req.user.id;

        await att.save();

        const populated = await Attendance.findById(att._id)
            .populate('relatedForm', 'type status startDate endDate excuseDate');

        res.json({ msg: 'Attendance updated', attendance: populated });
    } catch (error) {
        console.error('Error fixing punch:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/employee/:userId/detail
 * Admin — full calendar rows + stats for date range.
 */
router.get('/employee/:userId/detail', auth, validateObjectId('userId'), async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const records = await Attendance.getAttendanceInDateRange(userId, rangeStart, rangeEnd);
        const stats = await Attendance.getUserStatsInRange(userId, rangeStart, rangeEnd);
        const detailRows = buildDateRangeDetailRows(user, rangeStart, rangeEnd, records);
        res.json({
            user,
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            records,
            stats,
            detailRows
        });
    } catch (error) {
        console.error('Error getting employee detail:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/team-employee/:userId/detail
 * Manager — same as employee detail for team member.
 */
router.get('/team-employee/:userId/detail', auth, validateObjectId('userId'), async (req, res) => {
    try {
        const manager = await User.findById(req.user.id);
        if (!manager || manager.role !== 'manager') {
            return res.status(403).json({ msg: 'Access denied. Manager only.' });
        }
        const effectiveManaged = getEffectiveManagedDepartmentsForQueries(manager);
        if (effectiveManaged.length === 0) {
            return res.status(403).json({ msg: 'No managed departments assigned.' });
        }
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (!effectiveManaged.includes(user.department) || user.role !== 'employee') {
            return res.status(403).json({ msg: 'Employee is not in your managed departments.' });
        }
        const records = await Attendance.getAttendanceInDateRange(userId, rangeStart, rangeEnd);
        const stats = await Attendance.getUserStatsInRange(userId, rangeStart, rangeEnd);
        const detailRows = buildDateRangeDetailRows(user, rangeStart, rangeEnd, records);
        res.json({
            user,
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            records,
            stats,
            detailRows
        });
    } catch (error) {
        console.error('Error getting team employee detail:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

async function sendMyAttendanceDateRange(req, res) {
    try {
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const records = await Attendance.getAttendanceInDateRange(req.user.id, rangeStart, rangeEnd);
        const stats = await Attendance.getUserStatsInRange(req.user.id, rangeStart, rangeEnd);
        const detailRows = buildDateRangeDetailRows(user, rangeStart, rangeEnd, records);
        res.json({
            user,
            startDate: rangeStart.toISOString(),
            endDate: rangeEnd.toISOString(),
            records,
            stats,
            detailRows
        });
    } catch (error) {
        console.error('Error getting my attendance detail:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

/**
 * GET /api/attendance/my-ot-report?startDate=&endDate=
 * Logged-in user — own OT reconciliation rows for the selected range.
 */
router.get('/my-ot-report', auth, async (req, res) => {
    try {
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const payload = await buildOtReconciliationPayload(rangeStart, rangeEnd, {
            userId: req.user.id
        });
        res.json(payload);
    } catch (error) {
        console.error('Error getting employee OT report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/my-monthly-snapshot?startDate=&endDate=
 * Logged-in employee — personal OT, absences, and shortfall for the pay period.
 */
router.get('/my-monthly-snapshot', auth, async (req, res) => {
    try {
        const parsed = parseDateRangeQuery(req.query);
        if (parsed.error) {
            return res.status(400).json({ msg: parsed.error });
        }
        const { rangeStart, rangeEnd } = parsed;
        const { buildEmployeeMonthlySnapshot } = require('../utils/buildEmployeeMonthlySnapshot');
        const snapshot = await buildEmployeeMonthlySnapshot(req.user.id, rangeStart, rangeEnd);
        if (snapshot.error) {
            return res.status(404).json({ msg: snapshot.error });
        }
        res.json(snapshot);
    } catch (error) {
        console.error('Error getting employee monthly snapshot:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

/**
 * GET /api/attendance/my-attendance?startDate=&endDate=
 * Logged-in employee — own records, stats, and detail rows for range.
 */
router.get('/my-attendance', auth, sendMyAttendanceDateRange);

/**
 * GET /api/attendance/my-attendance/detail?startDate=&endDate=
 * Alias — same response as GET /my-attendance (range query).
 */
router.get('/my-attendance/detail', auth, sendMyAttendanceDateRange);

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
        const effectiveManaged = getEffectiveManagedDepartmentsForQueries(manager);
        if (effectiveManaged.length === 0) {
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
        if (!effectiveManaged.includes(user.department) || user.role !== 'employee') {
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

