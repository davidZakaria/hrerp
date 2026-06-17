/**
 * Sanity checks for 3-pillar deduction calculator (demo cases from spec).
 * Run: node scripts/verify-deduction-calculator.js
 */
const {
    calculateShortfall,
    missingPunchPenalty,
    classifyDay,
    GRACE_MINUTES,
    STANDARD_SHIFT_MINUTES
} = require('../utils/deductionCalculator');

let passed = 0;
let failed = 0;

function approx(a, b, eps = 0.0001) {
    return Math.abs(Number(a) - Number(b)) < eps;
}

function assert(label, condition, detail = '') {
    if (condition) {
        passed += 1;
        console.log(`  OK: ${label}`);
    } else {
        failed += 1;
        console.error(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

const schedule = { startTime: '10:00', endTime: '19:00' };

console.log('Pillar B — grace period');
const s14 = calculateShortfall({ clockIn: '10:14', clockOut: '19:00', workSchedule: schedule });
assert('14 min late → 0 deduction', s14.deductionDays === 0 && s14.totalShortfallMinutes === 14);

const s30 = calculateShortfall({ clockIn: '10:30', clockOut: '19:00', workSchedule: schedule });
assert('30 min late → 0.0625 days', s30.deductionDays === 0.0625, `got ${s30.deductionDays}`);
assert('30 min uses full minutes incl grace', s30.deductableMinutes === 30);

const s16 = calculateShortfall({ clockIn: '10:16', clockOut: '19:00', workSchedule: schedule });
assert('16 min late → deduct 16 min', approx(s16.deductionDays, 16 / STANDARD_SHIFT_MINUTES));

const early = calculateShortfall({ clockIn: '10:00', clockOut: '18:40', workSchedule: schedule });
assert('20 min early exit alone → deduct 20 min', early.totalShortfallMinutes === 20 && approx(early.deductionDays, 20 / 480));

const combined = calculateShortfall({ clockIn: '10:10', clockOut: '18:50', workSchedule: schedule });
assert('10 late + 10 early = 20 total → deduct', combined.totalShortfallMinutes === 20 && approx(combined.deductionDays, 20 / 480));

const withinGrace = calculateShortfall({ clockIn: '10:08', clockOut: '18:55', workSchedule: schedule });
assert('8 late + 5 early = 13 total → 0 deduction', withinGrace.deductionDays === 0);

console.log('\nPillar A — progressive tiers');
assert('1st miss → 0 days', missingPunchPenalty(1).days === 0);
assert('2nd miss → 0 days', missingPunchPenalty(2).days === 0);
assert('3rd miss → 0.25 days', missingPunchPenalty(3).days === 0.25);
assert('4th miss → 0.50 days', missingPunchPenalty(4).days === 0.5);
assert('5th miss → 0.75 days', missingPunchPenalty(5).days === 0.75);
assert('6th miss → 1.0 days', missingPunchPenalty(6).days === 1);

console.log('\nPillar C — full absence');
const user = { workSchedule: schedule };
const absence = classifyDay({
    date: new Date('2026-04-01T12:00:00'),
    record: null,
    user,
    waiverForms: [],
    missOccurrence: null
});
assert('No record → 1 day absence', absence.pillar === 'C' && absence.deductionDays === 1);

console.log('\nWaiver — vacation form');
const vacationForm = {
    type: 'vacation',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-05')
};
const waived = classifyDay({
    date: new Date('2026-04-02T12:00:00'),
    record: null,
    user,
    waiverForms: [vacationForm],
    missOccurrence: null
});
assert('Vacation day → waived, 0 deduction', waived.waived && waived.deductionDays === 0);

console.log('\nWaiver — half-day vacation, no punches');
const halfDayVacation = {
    type: 'vacation',
    isHalfDay: true,
    startDate: new Date('2026-04-10'),
    endDate: new Date('2026-04-10')
};
const halfDayAbsent = classifyDay({
    date: new Date('2026-04-10T12:00:00'),
    record: null,
    user,
    waiverForms: [halfDayVacation],
    missOccurrence: null
});
assert('Half-day leave + no punches → 0.5 absence', halfDayAbsent.pillar === 'C' && halfDayAbsent.deductionDays === 0.5);
assert('Half-day leave + no punches → not fully waived', !halfDayAbsent.waived && halfDayAbsent.halfDayVacation);

const halfDayWorked = classifyDay({
    date: new Date('2026-04-10T12:00:00'),
    record: { clockIn: '10:30', clockOut: '19:00', status: 'late' },
    user,
    waiverForms: [halfDayVacation],
    missOccurrence: null
});
assert('Half-day leave + punches → shortfall applies', halfDayWorked.pillar === 'B' && halfDayWorked.deductionDays === 0.0625);
assert('Half-day leave + punches → not waived', !halfDayWorked.waived);

console.log('\nPillar A — single miss');
const missIn = classifyDay({
    date: new Date('2026-04-03T12:00:00'),
    record: { clockIn: '', clockOut: '19:00', status: 'late' },
    user,
    waiverForms: [],
    missOccurrence: 3
});
assert('3rd single miss → 0.25 days', missIn.pillar === 'A' && missIn.deductionDays === 0.25);

console.log(`\nGrace constant = ${GRACE_MINUTES} min, shift = ${STANDARD_SHIFT_MINUTES} min`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
