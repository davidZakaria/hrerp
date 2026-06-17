/**
 * OT Variance Reconciliation — fingerprint OT (8h workday rule) + form approval.
 */
const { isHolidayDateKey } = require('./attendanceHolidays');

function isWeekendLocal(date) {
    const d = new Date(date);
    const day = d.getDay();
    return day === 5 || day === 6;
}

const STANDARD_WORK_MINUTES = 8 * 60;

function roundHours(hours) {
    return Math.round(hours * 100) / 100;
}

function dateKeyFromDate(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    // Noon local avoids UTC midnight shifting the calendar day across timezones
    d.setHours(12, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function punchDurationMinutes(clockIn, clockOut) {
    if (!clockIn || !clockOut) return null;
    const inParts = clockIn.split(':');
    const outParts = clockOut.split(':');
    if (inParts.length !== 2 || outParts.length !== 2) return null;
    const ih = parseInt(inParts[0], 10);
    const im = parseInt(inParts[1], 10);
    const oh = parseInt(outParts[0], 10);
    const om = parseInt(outParts[1], 10);
    if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return null;
    const diff = (oh * 60 + om) - (ih * 60 + im);
    return diff > 0 ? diff : 0;
}

function isOvertimeEligibleWorkday(date) {
    if (!date) return false;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    if (isWeekendLocal(d)) return false;
    if (isHolidayDateKey(dateKeyFromDate(d))) return false;
    return true;
}

/**
 * OT = minutes worked beyond fixed 8-hour standard (workdays only).
 */
function calculateFingerprintOtMinutes(clockIn, clockOut, date) {
    if (!isOvertimeEligibleWorkday(date)) return 0;
    const duration = punchDurationMinutes(clockIn, clockOut);
    if (duration == null || duration <= STANDARD_WORK_MINUTES) return 0;
    return duration - STANDARD_WORK_MINUTES;
}

function calculateFingerprintOtHours(clockIn, clockOut, date) {
    return roundHours(calculateFingerprintOtMinutes(clockIn, clockOut, date) / 60);
}

function getFingerprintOtForAttendance(attendanceRecord) {
    if (!attendanceRecord) {
        return { minutes: 0, hours: 0 };
    }
    const minutes = calculateFingerprintOtMinutes(
        attendanceRecord.clockIn,
        attendanceRecord.clockOut,
        attendanceRecord.date
    );
    return { minutes, hours: roundHours(minutes / 60) };
}

function reconcileOvertime(actualPunchingHours, approvedHours) {
    const actual = Number(actualPunchingHours) || 0;
    const approved = Number(approvedHours) || 0;
    const variance = roundHours(actual - approved);
    const finalPayableHours = roundHours(Math.min(actual, approved));

    let varianceFlag = 'neutral';
    if (variance > 0) varianceFlag = 'positive';
    if (variance < 0) varianceFlag = 'negative';

    return {
        actualPunchingHours: roundHours(actual),
        approvedHours: roundHours(approved),
        variance,
        finalPayableHours,
        varianceFlag
    };
}

function buildOtReconciliationRow({ form, attendanceRecord, user, actualHours, otDate, rowKey }) {
    const fp = attendanceRecord
        ? getFingerprintOtForAttendance(attendanceRecord)
        : { minutes: 0, hours: actualHours != null ? Number(actualHours) : 0 };
    const actual = actualHours != null ? Number(actualHours) : fp.hours;
    const approvedHours = form
        ? (form.approvedHours ?? form.extraHoursWorked ?? 0)
        : 0;
    const calc = reconcileOvertime(actual, approvedHours);

    const totalPunchedMinutes = attendanceRecord
        ? punchDurationMinutes(attendanceRecord.clockIn, attendanceRecord.clockOut)
        : null;

    return {
        rowKey: rowKey || `${user._id}_${dateKeyFromDate(otDate)}`,
        formId: form?._id || null,
        employeeCode: user.employeeCode || '',
        employeeName: user.name,
        department: user.department,
        jobTitle: user.jobTitle || '',
        location: user.location || '',
        otDate,
        otDateKey: dateKeyFromDate(otDate),
        requestedHours: form?.extraHoursWorked ?? null,
        hasApprovedForm: !!form,
        clockIn: attendanceRecord?.clockIn || null,
        clockOut: attendanceRecord?.clockOut || null,
        totalPunchedHours: totalPunchedMinutes != null
            ? roundHours(totalPunchedMinutes / 60)
            : null,
        otMinutes: fp.minutes,
        isWorkday: isOvertimeEligibleWorkday(otDate),
        ...calc
    };
}

function otReconciliationDateKey(userId, date) {
    return `${userId}_${dateKeyFromDate(date)}`;
}

module.exports = {
    STANDARD_WORK_MINUTES,
    reconcileOvertime,
    buildOtReconciliationRow,
    roundHours,
    punchDurationMinutes,
    isOvertimeEligibleWorkday,
    calculateFingerprintOtMinutes,
    calculateFingerprintOtHours,
    getFingerprintOtForAttendance,
    otReconciliationDateKey,
    dateKeyFromDate
};
