/**
 * Personal monthly snapshot for logged-in employee (current pay period).
 */
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Form = require('../models/Form');
const { buildOtReconciliationPayload } = require('./buildOtReconciliationPayload');
const { buildDetailedLeavesReport, APPROVED_LEAVE_STATUSES } = require('./detailedLeavesCalculator');
const { calculateShortfall } = require('./deductionCalculator');
const { isOvertimeEligibleWorkday } = require('./otReconciliation');
const { getSystemSettings } = require('./getSystemSettings');

function sumLatenessMinutes(attendanceRecords, user) {
    let total = 0;
    for (const record of attendanceRecords) {
        if (!isOvertimeEligibleWorkday(record.date)) continue;
        if (!record.clockIn || !String(record.clockIn).trim()) continue;
        const { minutesLate } = calculateShortfall({
            clockIn: record.clockIn,
            clockOut: record.clockOut,
            workSchedule: user.workSchedule
        });
        total += minutesLate;
    }
    return Math.round(total);
}

/**
 * @param {string} userId
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 */
async function buildEmployeeMonthlySnapshot(userId, rangeStart, rangeEnd) {
    const user = await User.findById(userId).select(
        'name employeeCode department jobTitle location workSchedule vacationDaysLeft casualDaysLeft excuseRequestsLeft'
    );
    if (!user) {
        return { error: 'User not found' };
    }

    const settings = await getSystemSettings();
    const annualQuota = settings.annualVacationDays ?? 15;
    const casualQuota = settings.casualVacationDays ?? 6;
    const excuseQuota = settings.monthlyExcuseRequests ?? 2;

    const [otPayload, attendanceRecords, leaveForms] = await Promise.all([
        buildOtReconciliationPayload(rangeStart, rangeEnd, { userId: user._id }),
        Attendance.find({
            user: user._id,
            date: { $gte: rangeStart, $lte: rangeEnd }
        }),
        Form.find({
            user: user._id,
            status: { $in: APPROVED_LEAVE_STATUSES },
            $or: [
                { type: 'vacation', endDate: { $gte: rangeStart }, startDate: { $lte: rangeEnd } },
                { type: 'sick_leave', sickLeaveEndDate: { $gte: rangeStart }, sickLeaveStartDate: { $lte: rangeEnd } },
                { type: 'wfh', wfhDate: { $gte: rangeStart, $lte: rangeEnd } },
                { type: 'mission', missionEndDate: { $gte: rangeStart }, missionStartDate: { $lte: rangeEnd } }
            ]
        })
    ]);

    const leavesReport = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords,
        forms: leaveForms,
        monthStart: rangeStart,
        monthEnd: rangeEnd,
        annualQuota,
        casualQuota
    });
    const leaves = leavesReport.rows[0] || {
        absentRaw: 0,
        absentActual: 0,
        variance: 0,
        deduction: 0,
        reason: '—'
    };

    const overtime = (otPayload.detailed || []).map((row) => ({
        otDate: row.otDate,
        otDateKey: row.otDateKey,
        requestedHours: row.requestedHours,
        approvedHours: row.approvedHours,
        actualPunchingHours: row.actualPunchingHours,
        finalPayableHours: row.finalPayableHours,
        variance: row.variance,
        otReason: row.otReason || 'No form submitted',
        hasOtFormSubmission: row.hasOtFormSubmission !== false && row.otReason !== 'No form submitted'
    }));

    const totalLatenessMinutes = sumLatenessMinutes(attendanceRecords, user);

    return {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        quotas: {
            annual: annualQuota,
            casual: casualQuota,
            excuse: excuseQuota
        },
        balances: {
            vacationDaysLeft: user.vacationDaysLeft ?? annualQuota,
            casualDaysLeft: user.casualDaysLeft ?? casualQuota,
            excuseRequestsLeft: user.excuseRequestsLeft ?? excuseQuota
        },
        overtime: {
            summary: otPayload.summary || {},
            rows: overtime,
            pendingCount: (otPayload.pendingManagerCount || 0) + (otPayload.pendingHrApprovalCount || 0)
        },
        absences: {
            absentRaw: leaves.absentRaw,
            absentActual: leaves.absentActual,
            variance: leaves.variance,
            deduction: leaves.deduction,
            reason: leaves.reason
        },
        shortfall: {
            totalLatenessMinutes
        }
    };
}

module.exports = { buildEmployeeMonthlySnapshot, sumLatenessMinutes };
