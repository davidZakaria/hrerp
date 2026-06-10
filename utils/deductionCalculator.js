/**
 * 3-Pillar Deduction Calculator
 * A: Missing punch (progressive monthly tiers)
 * B: Time shortfall (15-min combined grace, minute-exact / 480)
 * C: Full absence (no punches, no waiver)
 */
const {
    calculateMinutesEarlyExit
} = require('./attendanceParser');
const {
    dateKeyFromDate,
    isOvertimeEligibleWorkday,
    getFingerprintOtForAttendance,
    reconcileOvertime
} = require('./otReconciliation');

const GRACE_MINUTES = 15;
const STANDARD_SHIFT_MINUTES = 8 * 60;
const DEFAULT_WORK_SCHEDULE = { startTime: '10:00', endTime: '19:00' };

const APPROVED_WAIVER_STATUSES = ['approved', 'manager_approved', 'manager_submitted'];
const WAIVER_FORM_TYPES = ['vacation', 'sick_leave', 'wfh', 'mission'];

function roundDays(days) {
    return Math.round(days * 10000) / 10000;
}

function hasPunch(value) {
    return value != null && String(value).trim() !== '';
}

function timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const parts = String(hhmm).split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

function rawMinutesLate(clockIn, scheduledStart) {
    if (!hasPunch(clockIn) || !scheduledStart) return 0;
    const inMin = timeToMinutes(clockIn);
    const startMin = timeToMinutes(scheduledStart);
    if (inMin == null || startMin == null) return 0;
    const diff = inMin - startMin;
    return diff > 0 ? diff : 0;
}

function getWorkSchedule(user) {
    if (user?.workSchedule?.startTime && user?.workSchedule?.endTime) {
        return user.workSchedule;
    }
    return DEFAULT_WORK_SCHEDULE;
}

/**
 * Pillar B: combined late + early shortfall with 15-min daily grace.
 * If total > 15, deduct ALL minutes (including the grace window).
 */
function calculateShortfall({ clockIn, clockOut, workSchedule }) {
    const schedule = workSchedule || DEFAULT_WORK_SCHEDULE;
    const minutesLate = rawMinutesLate(clockIn, schedule.startTime);
    const minutesEarly = calculateMinutesEarlyExit(clockOut, schedule.endTime);
    const totalShortfallMinutes = minutesLate + minutesEarly;

    if (totalShortfallMinutes <= GRACE_MINUTES) {
        return {
            minutesLate,
            minutesEarly,
            totalShortfallMinutes,
            deductableMinutes: 0,
            deductionDays: 0
        };
    }

    const deductableMinutes = totalShortfallMinutes;
    return {
        minutesLate,
        minutesEarly,
        totalShortfallMinutes,
        deductableMinutes,
        deductionDays: roundDays(deductableMinutes / STANDARD_SHIFT_MINUTES)
    };
}

/**
 * Pillar A progressive penalty by monthly occurrence (1-based).
 */
function missingPunchPenalty(occurrence) {
    const n = Number(occurrence) || 0;
    if (n <= 0) return { days: 0, label: '' };
    if (n === 1) return { days: 0, label: '1st Time - Warning' };
    if (n === 2) return { days: 0, label: '2nd Time - Verbal Warning' };
    if (n === 3) return { days: 0.25, label: '3rd Time - 1/4 Day' };
    if (n === 4) return { days: 0.5, label: '4th Time - 1/2 Day' };
    if (n === 5) return { days: 0.75, label: '5th Time - 3/4 Day' };
    return { days: 1, label: `${n}th Time - 1 Day` };
}

function fingerprintDeductionDays(missCount) {
    return missingPunchPenalty(missCount).days;
}

function isSingleMissRecord(record) {
    if (!record) return false;
    const hasIn = hasPunch(record.clockIn);
    const hasOut = hasPunch(record.clockOut);
    return (hasIn && !hasOut) || (!hasIn && hasOut);
}

function isFullAbsenceRecord(record) {
    if (!record) return true;
    return !hasPunch(record.clockIn) && !hasPunch(record.clockOut);
}

function monthKeyFromDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function eachWorkdayInRange(rangeStart, rangeEnd, callback) {
    const d = new Date(rangeStart);
    d.setHours(12, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(12, 0, 0, 0);
    while (d <= end) {
        if (isOvertimeEligibleWorkday(d)) {
            callback(new Date(d));
        }
        d.setDate(d.getDate() + 1);
    }
}

function formCoversDate(form, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    if (form.type === 'vacation') {
        return form.startDate <= dayEnd && form.endDate >= dayStart;
    }
    if (form.type === 'sick_leave') {
        return form.sickLeaveStartDate <= dayEnd && form.sickLeaveEndDate >= dayStart;
    }
    if (form.type === 'wfh') {
        const wfh = new Date(form.wfhDate);
        return wfh >= dayStart && wfh <= dayEnd;
    }
    if (form.type === 'mission') {
        return form.missionStartDate <= dayEnd && form.missionEndDate >= dayStart;
    }
    return false;
}

function isWaivedByForms(forms, date) {
    return forms.some((f) => formCoversDate(f, date));
}

function isWaivedByAttendance(record) {
    if (!record) return false;
    if (record.isExcused) return true;
    return ['on_leave', 'wfh', 'excused'].includes(record.status);
}

function buildMissOccurrenceMap(recordsByUserId) {
    const map = new Map();

    for (const [userId, records] of recordsByUserId.entries()) {
        const byMonth = {};
        for (const rec of records) {
            if (!isSingleMissRecord(rec)) continue;
            const month = monthKeyFromDate(rec.date);
            if (!byMonth[month]) byMonth[month] = [];
            byMonth[month].push(rec);
        }
        for (const month of Object.keys(byMonth)) {
            byMonth[month].sort((a, b) => new Date(a.date) - new Date(b.date));
            byMonth[month].forEach((rec, idx) => {
                const key = `${userId}_${dateKeyFromDate(rec.date)}`;
                map.set(key, idx + 1);
            });
        }
    }
    return map;
}

function classifyDay({ date, record, user, waiverForms, missOccurrence }) {
    const workSchedule = getWorkSchedule(user);
    const waivedByForm = isWaivedByForms(waiverForms, date);
    const waivedByAtt = isWaivedByAttendance(record);
    const waived = waivedByForm || waivedByAtt;

    const base = {
        date,
        dateKey: dateKeyFromDate(date),
        waived,
        waiverReason: waivedByForm ? 'form' : (waivedByAtt ? 'attendance' : null),
        pillar: 'none',
        missLabel: '',
        missOccurrence: null,
        shortfallMinutes: 0,
        minutesLate: 0,
        minutesEarly: 0,
        pillarADays: 0,
        pillarBDays: 0,
        pillarCDays: 0,
        deductionDays: 0
    };

    if (waived) {
        return base;
    }

    const hasIn = record ? hasPunch(record.clockIn) : false;
    const hasOut = record ? hasPunch(record.clockOut) : false;

    if (!hasIn && !hasOut) {
        return {
            ...base,
            pillar: 'C',
            pillarCDays: 1,
            deductionDays: 1
        };
    }

    if (!hasIn || !hasOut) {
        const penalty = missingPunchPenalty(missOccurrence || 1);
        const missType = !hasIn ? 'clock_in' : 'clock_out';
        return {
            ...base,
            pillar: 'A',
            missOccurrence: missOccurrence || 1,
            missLabel: penalty.label,
            missType,
            pillarADays: penalty.days,
            deductionDays: penalty.days
        };
    }

    const shortfall = calculateShortfall({
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        workSchedule
    });

    return {
        ...base,
        pillar: shortfall.deductionDays > 0 ? 'B' : 'none',
        shortfallMinutes: shortfall.totalShortfallMinutes,
        minutesLate: shortfall.minutesLate,
        minutesEarly: shortfall.minutesEarly,
        pillarBDays: shortfall.deductionDays,
        deductionDays: shortfall.deductionDays
    };
}

function buildDeductionDayRow({ user, classification, record }) {
    return {
        rowKey: `${user._id}_${classification.dateKey}`,
        employeeId: user._id,
        employeeCode: user.employeeCode || '',
        employeeName: user.name || '',
        department: user.department || '',
        jobTitle: '',
        location: '',
        date: classification.date,
        dateKey: classification.dateKey,
        pillar: classification.pillar,
        missLabel: classification.missLabel || '',
        missOccurrence: classification.missOccurrence,
        missType: classification.missType || '',
        shortfallMinutes: classification.shortfallMinutes,
        minutesLate: classification.minutesLate,
        minutesEarly: classification.minutesEarly,
        absenceDays: classification.pillarCDays,
        waived: classification.waived,
        pillarADays: classification.pillarADays,
        pillarBDays: classification.pillarBDays,
        pillarCDays: classification.pillarCDays,
        deductionDays: classification.deductionDays,
        clockIn: record?.clockIn || '',
        clockOut: record?.clockOut || '',
        status: record?.status || (record ? 'present' : 'absent')
    };
}

function aggregateEmployeeTotals(detailedRows, otByUserId) {
    const map = new Map();

    for (const row of detailedRows) {
        const key = String(row.employeeId);
        if (!map.has(key)) {
            map.set(key, {
                employeeId: row.employeeId,
                employeeCode: row.employeeCode,
                employeeName: row.employeeName,
                department: row.department,
                jobTitle: '',
                location: '',
                otDays: 0,
                totalOtHours: 0,
                pillarADays: 0,
                pillarBDays: 0,
                pillarCDays: 0,
                totalDeductionDays: 0,
                days: 0,
                rows: []
            });
        }
        const agg = map.get(key);
        if (row.deductionDays > 0 || row.pillar !== 'none' || row.waived) {
            agg.days += 1;
        }
        agg.pillarADays = roundDays(agg.pillarADays + (row.pillarADays || 0));
        agg.pillarBDays = roundDays(agg.pillarBDays + (row.pillarBDays || 0));
        agg.pillarCDays = roundDays(agg.pillarCDays + (row.pillarCDays || 0));
        agg.totalDeductionDays = roundDays(agg.totalDeductionDays + (row.deductionDays || 0));
        agg.rows.push(row);
    }

    for (const [userId, ot] of otByUserId.entries()) {
        const agg = map.get(String(userId));
        if (agg) {
            agg.totalOtHours = ot.totalOtHours;
            agg.otDays = ot.otDays;
        } else if (ot.totalOtHours > 0) {
            map.set(String(userId), {
                employeeId: ot.userId,
                employeeCode: ot.employeeCode,
                employeeName: ot.employeeName,
                department: ot.department,
                jobTitle: '',
                location: '',
                otDays: ot.otDays,
                totalOtHours: ot.totalOtHours,
                pillarADays: 0,
                pillarBDays: 0,
                pillarCDays: 0,
                totalDeductionDays: 0,
                days: 0,
                rows: []
            });
        }
    }

    return Array.from(map.values()).sort((a, b) => b.totalDeductionDays - a.totalDeductionDays);
}

function computeFinalOtForUser(otForms, attendanceByDateKey, user) {
    let totalOtHours = 0;
    for (const form of otForms) {
        const dateKey = dateKeyFromDate(form.extraHoursDate);
        const att = attendanceByDateKey.get(dateKey);
        const fp = att ? getFingerprintOtForAttendance(att) : { hours: 0 };
        const approved = Number(form.approvedHours ?? form.extraHoursWorked ?? 0);
        const calc = reconcileOvertime(fp.hours, approved);
        totalOtHours += calc.finalPayableHours;
    }
    return {
        totalOtHours: Math.round(totalOtHours * 100) / 100,
        otDays: Math.round((totalOtHours / 8) * 100) / 100
    };
}

/**
 * Build full deduction report for a date range.
 */
function buildDeductionReport({
    users,
    attendanceRecords,
    waiverForms,
    otForms,
    rangeStart,
    rangeEnd
}) {
    const extendedStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1, 0, 0, 0, 0);

    const attendanceByUser = new Map();
    for (const att of attendanceRecords) {
        const uid = String(att.user?._id || att.user);
        if (!attendanceByUser.has(uid)) attendanceByUser.set(uid, []);
        attendanceByUser.get(uid).push(att);
    }

    const waiverByUser = new Map();
    for (const form of waiverForms) {
        const uid = String(form.user?._id || form.user);
        if (!waiverByUser.has(uid)) waiverByUser.set(uid, []);
        waiverByUser.get(uid).push(form);
    }

    const otByUser = new Map();
    for (const form of otForms) {
        const uid = String(form.user?._id || form.user);
        if (!otByUser.has(uid)) otByUser.set(uid, []);
        otByUser.get(uid).push(form);
    }

    const recordsForOccurrence = new Map();
    for (const [uid, records] of attendanceByUser.entries()) {
        recordsForOccurrence.set(uid, records.filter((r) => {
            const d = new Date(r.date);
            return d >= extendedStart && d <= rangeEnd;
        }));
    }
    const missOccurrenceMap = buildMissOccurrenceMap(recordsForOccurrence);

    const detailed = [];
    const otTotalsMap = new Map();

    for (const user of users) {
        const uid = String(user._id);
        const userRecords = attendanceByUser.get(uid) || [];
        const attByDateKey = new Map();
        for (const rec of userRecords) {
            attByDateKey.set(dateKeyFromDate(rec.date), rec);
        }

        const userOtForms = otByUser.get(uid) || [];
        const otCalc = computeFinalOtForUser(userOtForms, attByDateKey, user);
        otTotalsMap.set(uid, {
            userId: user._id,
            employeeCode: user.employeeCode || '',
            employeeName: user.name || '',
            department: user.department || '',
            ...otCalc
        });

        const userWaivers = waiverByUser.get(uid) || [];

        eachWorkdayInRange(rangeStart, rangeEnd, (workday) => {
            const dateKey = dateKeyFromDate(workday);
            const record = attByDateKey.get(dateKey) || null;
            const missKey = `${uid}_${dateKey}`;
            const missOccurrence = missOccurrenceMap.get(missKey) || null;

            const classification = classifyDay({
                date: workday,
                record,
                user,
                waiverForms: userWaivers,
                missOccurrence
            });

            const shouldInclude =
                classification.pillar === 'A' ||
                classification.pillar === 'C' ||
                classification.shortfallMinutes > 0 ||
                (classification.waived && record);

            if (!shouldInclude) return;

            detailed.push(buildDeductionDayRow({ user, classification, record }));
        });
    }

    detailed.sort((a, b) => {
        const nameCmp = (a.employeeName || '').localeCompare(b.employeeName || '');
        if (nameCmp !== 0) return nameCmp;
        return new Date(a.date) - new Date(b.date);
    });

    const employees = aggregateEmployeeTotals(detailed, otTotalsMap);

    const summary = {
        totalEmployees: employees.length,
        totalDeductionDays: roundDays(employees.reduce((s, e) => s + e.totalDeductionDays, 0)),
        pillarADays: roundDays(employees.reduce((s, e) => s + e.pillarADays, 0)),
        pillarBDays: roundDays(employees.reduce((s, e) => s + e.pillarBDays, 0)),
        pillarCDays: roundDays(employees.reduce((s, e) => s + e.pillarCDays, 0)),
        totalOtHours: Math.round(employees.reduce((s, e) => s + e.totalOtHours, 0) * 100) / 100
    };

    return { detailed, employees, summary };
}

module.exports = {
    GRACE_MINUTES,
    STANDARD_SHIFT_MINUTES,
    APPROVED_WAIVER_STATUSES,
    WAIVER_FORM_TYPES,
    calculateShortfall,
    missingPunchPenalty,
    fingerprintDeductionDays,
    classifyDay,
    buildDeductionReport,
    buildMissOccurrenceMap,
    isSingleMissRecord,
    isFullAbsenceRecord,
    hasPunch,
    getWorkSchedule,
    roundDays
};
