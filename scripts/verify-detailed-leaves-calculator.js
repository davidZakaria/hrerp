/**
 * Sanity checks for detailed leaves calculator (whiteboard rules).
 * Run: node scripts/verify-detailed-leaves-calculator.js
 */
const { buildDetailedLeavesReport, isExcusedByWfhOrMission } = require('../utils/detailedLeavesCalculator');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
    if (condition) {
        passed += 1;
        console.log(`  OK: ${label}`);
    } else {
        failed += 1;
        console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

function monthRange(y, m) {
    const rangeStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const rangeEnd = new Date(y, m, 0, 23, 59, 59, 999);
    return { rangeStart, rangeEnd };
}

const user = {
    _id: 'u1',
    employeeCode: 'E1',
    name: 'Test User',
    department: 'IT',
    jobTitle: 'Dev',
    location: 'HQ'
};

console.log('Perfect attendance — single workday with punch');
{
    const rangeStart = new Date('2026-06-02T00:00:00');
    const rangeEnd = new Date('2026-06-02T23:59:59');
    const report = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [{ user: 'u1', date: new Date('2026-06-02'), clockIn: '10:00', clockOut: '19:00' }],
        forms: [],
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    const row = report.rows[0];
    assert('has row', !!row);
    assert('perfect attendance reason', row.reason === 'Perfect Attendance' && row.variance === 0 && row.deduction === 0);
}

console.log('\nPenalty when unexcused absence');
{
    const { rangeStart, rangeEnd } = monthRange(2026, 6);
    const report = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [],
        forms: [],
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    const row = report.rows[0];
    assert('variance > 0 with no punches', row.variance > 0);
    assert('deduction = variance * 2', row.deduction === row.variance * 2);
    assert('penalty in reason', row.reason.includes('Unexcused Absence Penalty'));
}

console.log('\nApproved annual leave offsets absence');
{
    const { rangeStart, rangeEnd } = monthRange(2026, 6);
    const report = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [],
        forms: [{
            user: 'u1',
            type: 'vacation',
            vacationType: 'annual',
            status: 'approved',
            startDate: new Date('2026-06-02'),
            endDate: new Date('2026-06-02'),
            isHalfDay: false
        }],
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    const row = report.rows[0];
    assert('approved annual = 1', row.approvedAnnual === 1);
}

console.log('\nWFH excuses workday without punch');
{
    const wfhDay = new Date('2026-06-03T12:00:00');
    const forms = [{
        user: 'u1',
        type: 'wfh',
        status: 'approved',
        wfhDate: wfhDay
    }];
    assert('WFH covers day', isExcusedByWfhOrMission(forms, wfhDay));

    const { rangeStart, rangeEnd } = monthRange(2026, 6);
    const withWfh = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [],
        forms,
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    const withoutWfh = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [],
        forms: [],
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    assert(
        'WFH lowers absent actual vs no waiver',
        withWfh.rows[0].absentActual < withoutWfh.rows[0].absentActual
    );
}

console.log('\nNegative variance → zero deduction');
{
    const rangeStart = new Date('2026-06-01T00:00:00');
    const rangeEnd = new Date('2026-06-05T23:59:59');
    const report = buildDetailedLeavesReport({
        users: [user],
        attendanceRecords: [
            { user: 'u1', date: new Date('2026-06-01'), clockIn: '10:00', clockOut: '19:00' },
            { user: 'u1', date: new Date('2026-06-02'), clockIn: '10:00', clockOut: '19:00' },
            { user: 'u1', date: new Date('2026-06-03'), clockIn: '10:00', clockOut: '19:00' }
        ],
        forms: [{
            user: 'u1',
            type: 'vacation',
            vacationType: 'annual',
            status: 'approved',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
            isHalfDay: false
        }],
        monthStart: rangeStart,
        monthEnd: rangeEnd
    });
    const row = report.rows[0];
    assert('variance <= 0 when approved exceeds absence', row.variance <= 0, `variance=${row.variance}`);
    assert('deduction = 0 when variance <= 0', row.deduction === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
