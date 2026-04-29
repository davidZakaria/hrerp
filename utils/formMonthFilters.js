/**
 * Month filters for Form Management (UTC month boundaries).
 * Query params: submittedMonth=YYYY-MM, eventMonth=YYYY-MM
 */

function parseYm(s) {
    if (!s || typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (month < 1 || month > 12) return null;
    return { year, month };
}

/** Inclusive UTC range for a calendar month */
function utcMonthBounds(year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
}

function buildSubmittedMonthCondition(submittedMonth) {
    const p = parseYm(submittedMonth);
    if (!p) return null;
    const { start, end } = utcMonthBounds(p.year, p.month);
    return { createdAt: { $gte: start, $lte: end } };
}

/**
 * Forms whose primary event dates fall in the calendar month (type-specific).
 */
function buildEventMonthCondition(eventMonth) {
    const p = parseYm(eventMonth);
    if (!p) return null;
    const { start, end } = utcMonthBounds(p.year, p.month);
    return {
        $or: [
            {
                $and: [
                    { type: 'vacation' },
                    { startDate: { $lte: end } },
                    { endDate: { $gte: start } }
                ]
            },
            {
                $and: [{ type: 'excuse' }, { excuseDate: { $gte: start, $lte: end } }]
            },
            {
                $and: [
                    { type: 'sick_leave' },
                    { sickLeaveStartDate: { $lte: end } },
                    { sickLeaveEndDate: { $gte: start } }
                ]
            },
            {
                $and: [{ type: 'wfh' }, { wfhDate: { $gte: start, $lte: end } }]
            },
            {
                $and: [
                    { type: 'extra_hours' },
                    { extraHoursDate: { $gte: start, $lte: end } }
                ]
            },
            {
                $and: [
                    { type: 'mission' },
                    { missionStartDate: { $lte: end } },
                    { missionEndDate: { $gte: start } }
                ]
            }
        ]
    };
}

/**
 * Merge status/type/department filters with optional month constraints.
 * @param {object} baseFilter - e.g. { status, type, user: { $in } }
 * @param {string|undefined} submittedMonth
 * @param {string|undefined} eventMonth
 */
function mergeFormMonthFilters(baseFilter, submittedMonth, eventMonth) {
    const sub = buildSubmittedMonthCondition(submittedMonth);
    const ev = buildEventMonthCondition(eventMonth);
    const parts = [];
    if (Object.keys(baseFilter).length) parts.push(baseFilter);
    if (sub) parts.push(sub);
    if (ev) parts.push(ev);
    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0];
    return { $and: parts };
}

module.exports = {
    parseYm,
    utcMonthBounds,
    buildSubmittedMonthCondition,
    buildEventMonthCondition,
    mergeFormMonthFilters
};
