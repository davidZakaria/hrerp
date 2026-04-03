/**
 * Company-wide holidays as YYYY-MM-DD.
 * Extend via env ATTENDANCE_HOLIDAYS=2026-01-01,2026-04-25
 */
function parseEnvHolidays() {
    const raw = process.env.ATTENDANCE_HOLIDAYS;
    if (!raw || typeof raw !== 'string') return [];
    return raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
}

const DEFAULT_HOLIDAYS = [];

function getHolidayDateSet() {
    return new Set([...DEFAULT_HOLIDAYS, ...parseEnvHolidays()]);
}

function isHolidayDate(yyyyMmDd) {
    return getHolidayDateSet().has(yyyyMmDd);
}

module.exports = { getHolidayDateSet, isHolidayDate };
