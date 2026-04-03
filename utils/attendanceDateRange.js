/**
 * Shared date-range parsing for attendance APIs (query: startDate, endDate ISO strings).
 * Uses local start/end of day for range bounds to align with calendar-day attendance rows.
 */

const MAX_RANGE_DAYS = 370;

function startOfDayLocal(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDayLocal(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

/** Inclusive calendar days between two local dates (date parts only). */
function calendarDaysInclusive(rangeStart, rangeEnd) {
    const d1 = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const d2 = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
    return Math.round((d2 - d1) / 86400000) + 1;
}

/**
 * @param {Object} query - req.query
 * @returns {{ error?: string, rangeStart?: Date, rangeEnd?: Date }}
 */
function parseDateRangeQuery(query) {
    const startDate = query.startDate;
    const endDate = query.endDate;
    if (!startDate || !endDate) {
        return { error: 'startDate and endDate query parameters are required (ISO date strings)' };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { error: 'Invalid startDate or endDate' };
    }
    const rangeStart = startOfDayLocal(start);
    const rangeEnd = endOfDayLocal(end);
    if (rangeStart > rangeEnd) {
        return { error: 'startDate must be on or before endDate' };
    }
    const days = calendarDaysInclusive(rangeStart, rangeEnd);
    if (days > MAX_RANGE_DAYS) {
        return { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days` };
    }
    return { rangeStart, rangeEnd };
}

/** First and last instant of a calendar month YYYY-MM */
function monthToRange(monthStr) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthStr);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const rangeStart = new Date(y, mo, 1, 0, 0, 0, 0);
    const rangeEnd = new Date(y, mo + 1, 0, 23, 59, 59, 999);
    return { rangeStart, rangeEnd };
}

module.exports = {
    MAX_RANGE_DAYS,
    startOfDayLocal,
    endOfDayLocal,
    parseDateRangeQuery,
    monthToRange,
    calendarDaysInclusive
};
