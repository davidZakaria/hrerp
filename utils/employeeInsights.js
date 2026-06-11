/**
 * Employee insights for admin dashboard — live pay-period stats from attendance,
 * 3-pillar deductions, and final OT.
 */
const Attendance = require('../models/Attendance');
const Form = require('../models/Form');
const {
    buildDeductionReport,
    APPROVED_WAIVER_STATUSES,
    WAIVER_FORM_TYPES
} = require('./deductionCalculator');

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function buildAttendanceStatsMap(attendanceRecords) {
    const map = new Map();
    for (const record of attendanceRecords) {
        const uid = String(record.user?._id || record.user);
        if (!map.has(uid)) {
            map.set(uid, {
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                lateDays: 0
            });
        }
        const stats = map.get(uid);
        stats.totalDays += 1;

        const status = record.status || '';
        if (['present', 'late', 'wfh'].includes(status)) {
            stats.presentDays += 1;
        }
        if (status === 'absent') {
            stats.absentDays += 1;
        }
        if (status === 'late' || (record.minutesLate && record.minutesLate > 0)) {
            stats.lateDays += 1;
        }
    }
    return map;
}

async function loadDeductionInputs(rangeStart, rangeEnd) {
    const extendedStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1, 0, 0, 0, 0);

    const [attendanceRecords, waiverForms, otForms] = await Promise.all([
        Attendance.find({
            date: { $gte: extendedStart, $lte: rangeEnd }
        }).populate('user', 'name department employeeCode workSchedule'),
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

    return { attendanceRecords, waiverForms, otForms, extendedStart };
}

/**
 * @param {Object} params
 * @param {Array} params.employees - User documents
 * @param {Date} params.rangeStart
 * @param {Date} params.rangeEnd
 * @param {string} params.periodLabel
 * @param {string|null} params.closingMonthKey
 */
async function buildEmployeeInsights({ employees, rangeStart, rangeEnd, periodLabel, closingMonthKey }) {
    const { attendanceRecords, waiverForms, otForms } = await loadDeductionInputs(rangeStart, rangeEnd);

    const periodAttendance = attendanceRecords.filter((r) => {
        const d = new Date(r.date);
        return d >= rangeStart && d <= rangeEnd;
    });

    const attendanceMap = buildAttendanceStatsMap(periodAttendance);

    const deductionReport = buildDeductionReport({
        users: employees.filter((e) => e.employeeCode),
        attendanceRecords,
        waiverForms,
        otForms,
        rangeStart,
        rangeEnd
    });

    const deductionByUser = new Map();
    for (const emp of deductionReport.employees) {
        deductionByUser.set(String(emp.employeeId), emp);
    }

    const allEmployeesData = employees.map((emp) => {
        const uid = String(emp._id);
        const att = attendanceMap.get(uid) || {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0
        };
        const ded = deductionByUser.get(uid);

        const pillarCDays = ded?.pillarCDays || 0;
        const absentDays = Math.max(att.absentDays, pillarCDays);
        const totalTracked = att.totalDays + (pillarCDays > att.absentDays ? pillarCDays - att.absentDays : 0);
        const presentDays = att.presentDays;
        const attendanceRate = totalTracked > 0
            ? round2((presentDays / totalTracked) * 100)
            : null;

        return {
            _id: emp._id,
            name: emp.name,
            email: emp.email,
            department: emp.department || '',
            role: emp.role,
            employeeCode: emp.employeeCode || '',
            vacationDaysLeft: emp.vacationDaysLeft || 0,
            presentDays,
            absentDays,
            lateDays: att.lateDays,
            totalDays: totalTracked,
            deductions: round2(ded?.totalDeductionDays || 0),
            pillarADays: round2(ded?.pillarADays || 0),
            pillarBDays: round2(ded?.pillarBDays || 0),
            pillarCDays: round2(ded?.pillarCDays || 0),
            totalOtHours: round2(ded?.totalOtHours || 0),
            otDays: round2(ded?.otDays || 0),
            attendanceRate: attendanceRate != null ? attendanceRate.toFixed(1) : '-'
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const lowVacationEmployees = allEmployeesData
        .filter((emp) => emp.vacationDaysLeft < 5)
        .map((emp) => ({
            _id: emp._id,
            name: emp.name,
            department: emp.department,
            vacationDaysLeft: emp.vacationDaysLeft
        }))
        .sort((a, b) => a.vacationDaysLeft - b.vacationDaysLeft);

    const highAbsenceEmployees = allEmployeesData
        .filter((emp) => emp.absentDays >= 3)
        .map((emp) => ({
            _id: emp._id,
            name: emp.name,
            department: emp.department,
            absences: emp.absentDays
        }))
        .sort((a, b) => b.absences - a.absences);

    const deductionEmployees = allEmployeesData
        .filter((emp) => emp.deductions > 0)
        .map((emp) => ({
            _id: emp._id,
            name: emp.name,
            department: emp.department,
            deductions: emp.deductions
        }))
        .sort((a, b) => b.deductions - a.deductions);

    const totalVacationDays = employees.reduce((sum, emp) => sum + (emp.vacationDaysLeft || 0), 0);
    const totalEmployees = employees.length;
    const averageVacationDays = totalEmployees > 0 ? round2(totalVacationDays / totalEmployees) : 0;

    let totalPresent = 0;
    let totalTracked = 0;
    allEmployeesData.forEach((emp) => {
        totalPresent += emp.presentDays;
        totalTracked += emp.totalDays;
    });
    const attendanceRate = totalTracked > 0 ? round2((totalPresent / totalTracked) * 100) : 100;

    const totalDeductions = round2(allEmployeesData.reduce((s, e) => s + e.deductions, 0));
    const totalOtHours = round2(allEmployeesData.reduce((s, e) => s + e.totalOtHours, 0));

    return {
        currentMonth: closingMonthKey || periodLabel,
        periodLabel,
        periodStart: rangeStart.toISOString().slice(0, 10),
        periodEnd: rangeEnd.toISOString().slice(0, 10),
        closingMonthKey,
        totalEmployees,
        averageVacationDays,
        attendanceRate,
        totalDeductions,
        totalOtHours,
        allEmployees: allEmployeesData,
        lowVacationEmployees,
        highAbsenceEmployees,
        deductionEmployees,
        summary: {
            lowVacationCount: lowVacationEmployees.length,
            highAbsenceCount: highAbsenceEmployees.length,
            deductionCount: deductionEmployees.length
        },
        deductionSummary: deductionReport.summary
    };
}

module.exports = {
    buildEmployeeInsights,
    buildAttendanceStatsMap
};
