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

module.exports = {
    calculateVacationCalendarDays,
    calculateVacationDeductionDays,
    parseIsHalfDay,
    validateHalfDayVacation,
    dateKeyFromDate
};
