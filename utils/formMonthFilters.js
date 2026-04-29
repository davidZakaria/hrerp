/**
 * Month filters for Form Management.
 * Uses wall-clock calendar months in a fixed offset (default Egypt UTC+2) so
 * "April" matches how users expect local dates, not UTC-only boundaries.
 *
 * Query params: submittedMonth=YYYY-MM, eventMonth=YYYY-MM
 * Env: FORM_MONTH_TZ_OFFSET e.g. +02:00, -05:00
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

function getTzOffsetString() {
    const o = process.env.FORM_MONTH_TZ_OFFSET || '+02:00';
    if (typeof o !== 'string' || !/^[+-]\d{2}:\d{2}$/.test(o.trim())) {
        return '+02:00';
    }
    return o.trim();
}

/**
 * Inclusive instant range for a calendar month in the configured offset zone.
 */
function zonedMonthBounds(year, month, tzOffset) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const start = new Date(`${ym}-01T00:00:00${tzOffset}`);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = new Date(
        `${ym}-${String(lastDay).padStart(2, '0')}T23:59:59.999${tzOffset}`
    );
    return { start, end };
}

function buildSubmittedMonthCondition(submittedMonth) {
    const p = parseYm(submittedMonth);
    if (!p) return null;
    const { start, end } = zonedMonthBounds(p.year, p.month, getTzOffsetString());
    return { createdAt: { $gte: start, $lte: end } };
}

/**
 * Forms whose primary event dates fall in the calendar month (type-specific).
 */
function buildEventMonthCondition(eventMonth) {
    const p = parseYm(eventMonth);
    if (!p) return null;
    const { start, end } = zonedMonthBounds(p.year, p.month, getTzOffsetString());
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
    zonedMonthBounds,
    getTzOffsetString,
    buildSubmittedMonthCondition,
    buildEventMonthCondition,
    mergeFormMonthFilters
};
