function dateKeyFromDate(date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    d.setHours(12, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function calculateVacationCalendarDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (end < start) return 0;
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Deductible vacation days for annual leave (half day = 0.5).
 */
function calculateVacationDeductionDays({ startDate, endDate, isHalfDay }) {
    if (isHalfDay) return 0.5;
    return calculateVacationCalendarDays(startDate, endDate);
}

function parseIsHalfDay(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function validateHalfDayVacation({ startDate, endDate, isHalfDay }) {
    if (!parseIsHalfDay(isHalfDay)) return null;
    if (!startDate || !endDate) {
        return 'Start and end dates are required for half-day vacation';
    }
    if (dateKeyFromDate(startDate) !== dateKeyFromDate(endDate)) {
        return 'Half-day vacation must be for a single date (start and end must match)';
    }
    return null;
}

function dayWithinRange(dayDate, rangeStart, rangeEnd) {
    const t = new Date(dayDate).setHours(12, 0, 0, 0);
    const start = new Date(rangeStart).setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd).setHours(23, 59, 59, 999);
    return t >= start && t <= end;
}

/**
 * Count leave days from a form overlapping a date range (half-day = 0.5).
 */
function countLeaveDaysInRange({ startDate, endDate, isHalfDay, rangeStart, rangeEnd }) {
    if (!startDate || !endDate || !rangeStart || !rangeEnd) return 0;
    if (parseIsHalfDay(isHalfDay)) {
        return dayWithinRange(startDate, rangeStart, rangeEnd) ? 0.5 : 0;
    }
    const overlapStart = new Date(Math.max(new Date(startDate).getTime(), rangeStart.getTime()));
    const overlapEnd = new Date(Math.min(new Date(endDate).getTime(), rangeEnd.getTime()));
    if (overlapEnd < overlapStart) return 0;
    return calculateVacationCalendarDays(overlapStart, overlapEnd);
}

module.exports = {
    calculateVacationCalendarDays,
    calculateVacationDeductionDays,
    parseIsHalfDay,
    validateHalfDayVacation,
    dateKeyFromDate,
    dayWithinRange,
    countLeaveDaysInRange
};
