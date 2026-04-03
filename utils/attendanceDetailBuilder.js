const {
    calculateMinutesEarlyExit,
    calculateAttendanceStatus,
    isWeekend,
    getDayName,
    getMonthString
} = require('./attendanceParser');
const { isHolidayDateKey } = require('./attendanceHolidays');
const { startOfDayLocal } = require('./attendanceDateRange');

function defaultSchedule() {
    return { startTime: '10:00', endTime: '19:00' };
}

function dateKeyLocal(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function monthYearLabel(d) {
    const x = new Date(d);
    return x.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function enumerateDaysInclusive(rangeStart, rangeEnd) {
    const days = [];
    let cur = startOfDayLocal(new Date(rangeStart));
    const end = startOfDayLocal(new Date(rangeEnd));
    while (cur <= end) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function roundMinutesToNearest15(minutes) {
    if (minutes == null || Number.isNaN(minutes)) return 0;
    return Math.round(minutes / 15) * 15;
}

function durationMinutesWork(clockIn, clockOut) {
    if (!clockIn || !clockOut) return null;
    const inParts = clockIn.split(':');
    const outParts = clockOut.split(':');
    if (inParts.length !== 2 || outParts.length !== 2) return null;
    const ih = parseInt(inParts[0], 10);
    const im = parseInt(inParts[1], 10);
    const oh = parseInt(outParts[0], 10);
    const om = parseInt(outParts[1], 10);
    if ([ih, im, oh, om].some(n => Number.isNaN(n))) return null;
    return (oh * 60 + om) - (ih * 60 + im);
}

function buildExceptionLabels(record, minutesEarlyExit) {
    const labels = [];
    if (record.missedClockIn) labels.push('Missing In-Punch');
    if (record.missedClockOut) labels.push('Missing Out-Punch');
    if ((record.minutesLate || 0) > 0) labels.push(`Late (${record.minutesLate} mins)`);
    if (minutesEarlyExit > 0) {
        labels.push(`Early Exit (${minutesEarlyExit} min${minutesEarlyExit === 1 ? '' : 's'})`);
    }
    if ((record.minutesOvertime || 0) > 0) labels.push(`Overtime (${record.minutesOvertime} mins)`);
    return labels;
}

function resolveDailyStatus(record, missedPunch) {
    if (record.status === 'on_leave') return 'on_leave';
    if (record.status === 'wfh') return 'wfh';
    if (record.status === 'excused' || record.isExcused) return 'excused';
    if (record.status === 'absent') return 'absent';
    if (missedPunch) return 'missed_punch';
    if (record.status === 'late') return 'late';
    return 'present';
}

function isEditedRecord(record) {
    return Array.isArray(record.adjustmentHistory) && record.adjustmentHistory.length > 0;
}

/**
 * @param {Object} user - user doc with workSchedule
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @param {Array} records - Attendance documents for user in range
 */
function buildDateRangeDetailRows(user, rangeStart, rangeEnd, records) {
    const ws = user.workSchedule || defaultSchedule();
    const scheduleLabel = `${ws.startTime} - ${ws.endTime}`;
    const byKey = {};
    for (const r of records) {
        byKey[dateKeyLocal(r.date)] = r;
    }

    const rows = [];
    const days = enumerateDaysInclusive(rangeStart, rangeEnd);

    for (const day of days) {
        const dateKey = dateKeyLocal(day);
        const dayName = getDayName(day);
        const monthLabel = monthYearLabel(day);

        if (isHolidayDateKey(dateKey)) {
            rows.push({
                date: dateKey,
                dayName,
                monthLabel,
                scheduledShift: scheduleLabel,
                clockIn: '',
                clockOut: '',
                rawMinutesWorked: null,
                roundedMinutesWorked: null,
                totalHoursDisplay: '—',
                dailyStatus: 'holiday',
                exceptionLabels: [],
                attendanceId: null,
                isSynthetic: true,
                isEdited: false
            });
            continue;
        }

        if (isWeekend(day)) {
            rows.push({
                date: dateKey,
                dayName,
                monthLabel,
                scheduledShift: scheduleLabel,
                clockIn: '',
                clockOut: '',
                rawMinutesWorked: null,
                roundedMinutesWorked: null,
                totalHoursDisplay: '—',
                dailyStatus: 'weekly_off',
                exceptionLabels: [],
                attendanceId: null,
                isSynthetic: true,
                isEdited: false
            });
            continue;
        }

        const record = byKey[dateKey];
        if (!record) {
            rows.push({
                date: dateKey,
                dayName,
                monthLabel,
                scheduledShift: scheduleLabel,
                clockIn: '',
                clockOut: '',
                rawMinutesWorked: null,
                roundedMinutesWorked: null,
                totalHoursDisplay: '—',
                dailyStatus: 'absent',
                exceptionLabels: [],
                attendanceId: null,
                isSynthetic: true,
                isEdited: false
            });
            continue;
        }

        const rawDur = durationMinutesWork(record.clockIn, record.clockOut);
        const rounded = rawDur != null && rawDur >= 0 ? roundMinutesToNearest15(rawDur) : null;
        const minutesEarlyExit = calculateMinutesEarlyExit(record.clockOut, ws.endTime);
        const missedPunch = !!(record.missedClockIn || record.missedClockOut);
        const exceptionLabels = buildExceptionLabels(record, minutesEarlyExit);
        const dailyStatus = resolveDailyStatus(record, missedPunch);

        const totalHoursDisplay = rounded != null
            ? `${(rounded / 60).toFixed(2)}h`
            : '—';

        rows.push({
            date: dateKey,
            dayName,
            monthLabel,
            scheduledShift: scheduleLabel,
            clockIn: record.clockIn || '',
            clockOut: record.clockOut || '',
            rawMinutesWorked: rawDur,
            roundedMinutesWorked: rounded,
            totalHoursDisplay,
            dailyStatus,
            exceptionLabels,
            attendanceId: record._id,
            isSynthetic: false,
            isEdited: isEditedRecord(record),
            adjustmentHistory: record.adjustmentHistory || [],
            recordStatus: record.status,
            minutesLate: record.minutesLate || 0,
            minutesOvertime: record.minutesOvertime || 0,
            minutesEarlyExit,
            missedClockIn: record.missedClockIn,
            missedClockOut: record.missedClockOut
        });
    }

    return rows;
}

function aggregateOrgKpis(records) {
    let totalPresent = 0;
    let totalAbsences = 0;
    let totalMinutesLate = 0;
    let pendingMissedPunches = 0;

    for (const r of records) {
        if (r.status === 'present') totalPresent++;
        else if (r.status === 'late') {
            totalPresent++;
            totalMinutesLate += r.minutesLate || 0;
        } else if (r.status === 'absent' && !r.isExcused) {
            totalAbsences++;
        }
        if (r.missedClockIn || r.missedClockOut || (r.fingerprintMissType && r.fingerprintMissType !== 'none')) {
            pendingMissedPunches++;
        }
    }

    return {
        totalPresent,
        totalAbsences,
        totalLateHours: Math.round((totalMinutesLate / 60) * 100) / 100,
        totalLateMinutes: totalMinutesLate,
        pendingMissedPunches
    };
}

function applyRecalcAttendance(att, user) {
    const ws = user.workSchedule || defaultSchedule();
    const calc = calculateAttendanceStatus(
        att.clockIn || '',
        att.clockOut || '',
        ws,
        15
    );
    att.status = calc.status;
    att.minutesLate = calc.minutesLate;
    att.minutesOvertime = calc.minutesOvertime;
    att.missedClockIn = calc.missedClockIn;
    att.missedClockOut = calc.missedClockOut;
    att.month = getMonthString(att.date);
}

module.exports = {
    roundMinutesToNearest15,
    durationMinutesWork,
    buildDateRangeDetailRows,
    aggregateOrgKpis,
    buildExceptionLabels,
    dateKeyLocal,
    applyRecalcAttendance,
    defaultSchedule
};
