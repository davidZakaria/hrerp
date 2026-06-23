/**
 * Detailed Leaves & Absenteeism Report — monthly per-employee aggregation.
 * Implements whiteboard rules from FEATURE_DETAILED_LEAVES_REPORT.md.
 */
const { isWeekend } = require('./attendanceParser');
const { isHolidayDateKey } = require('./attendanceHolidays');
const { dateKeyFromDate, countLeaveDaysInRange } = require('./vacationDays');
const { formCoversDate } = require('./deductionCalculator');

const APPROVED_LEAVE_STATUSES = ['approved', 'manager_approved', 'manager_submitted'];

function roundDays(value) {
    return Math.round(Number(value) * 10000) / 10000;
}

function hasPunch(value) {
    return value != null && String(value).trim() !== '';
}

function hasAttendancePunch(record) {
    if (!record) return false;
    return hasPunch(record.clockIn) || hasPunch(record.clockOut);
}

function eachDayInRange(rangeStart, rangeEnd, callback) {
    const d = new Date(rangeStart);
    d.setHours(12, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(12, 0, 0, 0);
    while (d <= end) {
        callback(new Date(d));
        d.setDate(d.getDate() + 1);
    }
}

function buildAttendanceMap(attendanceRecords) {
    const map = new Map();
    for (const record of attendanceRecords) {
        const userId = String(record.user?._id || record.user);
        if (!map.has(userId)) map.set(userId, new Map());
        map.get(userId).set(dateKeyFromDate(record.date), record);
    }
    return map;
}

function buildFormsByUser(forms) {
    const map = new Map();
    for (const form of forms) {
        const userId = String(form.user?._id || form.user);
        if (!map.has(userId)) map.set(userId, []);
        map.get(userId).push(form);
    }
    return map;
}

function countFormDaysInMonth(form, monthStart, monthEnd) {
    if (form.type === 'vacation') {
        return countLeaveDaysInRange({
            startDate: form.startDate,
            endDate: form.endDate,
            isHalfDay: form.isHalfDay,
            rangeStart: monthStart,
            rangeEnd: monthEnd
        });
    }
    if (form.type === 'sick_leave') {
        return countLeaveDaysInRange({
            startDate: form.sickLeaveStartDate,
            endDate: form.sickLeaveEndDate,
            isHalfDay: false,
            rangeStart: monthStart,
            rangeEnd: monthEnd
        });
    }
    if (form.type === 'wfh' && form.wfhDate) {
        return countLeaveDaysInRange({
            startDate: form.wfhDate,
            endDate: form.wfhDate,
            isHalfDay: false,
            rangeStart: monthStart,
            rangeEnd: monthEnd
        });
    }
    if (form.type === 'mission') {
        return countLeaveDaysInRange({
            startDate: form.missionStartDate,
            endDate: form.missionEndDate,
            isHalfDay: false,
            rangeStart: monthStart,
            rangeEnd: monthEnd
        });
    }
    return 0;
}

/** WFH/mission excuse absence on workdays (aligned with deduction report waivers). */
function isExcusedByWfhOrMission(forms, day) {
    for (const form of forms) {
        if (!APPROVED_LEAVE_STATUSES.includes(form.status)) continue;
        if ((form.type === 'wfh' || form.type === 'mission') && formCoversDate(form, day)) {
            return true;
        }
    }
    return false;
}

function buildReason({ appAnnual, appCasual, appSick, hasWfh, hasMission, formReasons, variance, absentActual }) {
    if (variance === 0 && absentActual === 0) {
        return 'Perfect Attendance';
    }

    const parts = [];
    if (appAnnual > 0) parts.push('Annual Leave');
    if (appCasual > 0) parts.push('Casual Leave');
    if (appSick > 0) parts.push('Sick Leave');
    if (hasWfh) parts.push('Work From Home');
    if (hasMission) parts.push('Business Mission');

    const uniqueReasons = [...new Set(formReasons.map((r) => String(r).trim()).filter(Boolean))];
    if (uniqueReasons.length) {
        parts.push(...uniqueReasons);
    }

    let reason = parts.join(', ');
    if (variance > 0) {
        reason = reason ? `${reason}, Unexcused Absence Penalty` : 'Unexcused Absence Penalty';
    }
    return reason || '—';
}

/**
 * @param {Object} params
 * @param {Array} params.users
 * @param {Array} params.attendanceRecords
 * @param {Array} params.forms - approved leave forms overlapping the month
 * @param {Date} params.monthStart
 * @param {Date} params.monthEnd
 * @param {number} [params.annualQuota=15]
 * @param {number} [params.casualQuota=6]
 */
function buildDetailedLeavesReport({
    users,
    attendanceRecords,
    forms,
    monthStart,
    monthEnd,
    annualQuota = 15,
    casualQuota = 6
}) {
    const attendanceByUser = buildAttendanceMap(attendanceRecords);
    const formsByUser = buildFormsByUser(forms);
    const rows = [];

    for (const user of users) {
        const userId = String(user._id);
        const userAttendance = attendanceByUser.get(userId) || new Map();
        const userForms = formsByUser.get(userId) || [];

        let appAnnual = 0;
        let appCasual = 0;
        let appSick = 0;
        let hasWfh = false;
        let hasMission = false;
        const formReasons = [];

        for (const form of userForms) {
            if (!APPROVED_LEAVE_STATUSES.includes(form.status)) continue;
            const days = countFormDaysInMonth(form, monthStart, monthEnd);
            if (days <= 0 && form.type !== 'wfh' && form.type !== 'mission') continue;

            if (form.type === 'vacation' && form.vacationType === 'annual') {
                appAnnual += days;
                if (form.reason) formReasons.push(form.reason);
            } else if (form.type === 'vacation' && form.vacationType === 'casual') {
                appCasual += days;
                if (form.reason) formReasons.push(form.reason);
            } else if (form.type === 'sick_leave') {
                appSick += days;
                if (form.reason) formReasons.push(form.reason);
            } else if (form.type === 'wfh' && days > 0) {
                hasWfh = true;
                if (form.reason || form.wfhWorkingOn) formReasons.push(form.reason || form.wfhWorkingOn);
            } else if (form.type === 'mission' && days > 0) {
                hasMission = true;
                if (form.reason) formReasons.push(form.reason);
            }
        }

        appAnnual = roundDays(appAnnual);
        appCasual = roundDays(appCasual);
        appSick = roundDays(appSick);
        const totalApproved = roundDays(appAnnual + appCasual + appSick);

        let absentRaw = 0;
        let absentActual = 0;

        eachDayInRange(monthStart, monthEnd, (day) => {
            const dateKey = dateKeyFromDate(day);
            const record = userAttendance.get(dateKey);
            if (!hasAttendancePunch(record)) {
                absentRaw += 1;
                if (!isWeekend(day) && !isHolidayDateKey(dateKey)) {
                    if (!isExcusedByWfhOrMission(userForms, day)) {
                        absentActual += 1;
                    }
                }
            }
        });

        const variance = roundDays(absentActual - totalApproved);
        const deduction = variance > 0 ? roundDays(variance * 2) : 0;
        const reason = buildReason({
            appAnnual,
            appCasual,
            appSick,
            hasWfh,
            hasMission,
            formReasons,
            variance,
            absentActual
        });

        rows.push({
            employeeCode: user.employeeCode || '',
            name: user.name || '',
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            location: user.location || '',
            approvedAnnual: appAnnual,
            approvedCasual: appCasual,
            approvedSick: appSick,
            annualQuota,
            casualQuota,
            absentRaw,
            absentActual,
            variance,
            deduction,
            reason
        });
    }

    return { rows };
}

module.exports = {
    APPROVED_LEAVE_STATUSES,
    buildDetailedLeavesReport,
    isExcusedByWfhOrMission,
    countFormDaysInMonth
};
