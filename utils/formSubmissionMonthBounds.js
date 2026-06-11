/**
 * Vacation / mission personal forms use a rolling period: from the 25th of one month
 * through the 25th of the next (e.g. 25 Jan → 25 Feb). This includes late-month dates
 * (26–31) and crosses into the following calendar month until the closing 25th.
 */
const PERIOD_ANCHOR_DAY = 25;

function pad(n) {
    return String(n).padStart(2, '0');
}

function formatLocalYmd(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * @returns {{ first: string, last: string }} YYYY-MM-DD inclusive bounds for the active period "today"
 */
function getCurrentSubmissionPeriodYmd(now = new Date()) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    let startD;
    let endD;
    if (day <= PERIOD_ANCHOR_DAY) {
        startD = new Date(y, m - 1, PERIOD_ANCHOR_DAY);
        endD = new Date(y, m, PERIOD_ANCHOR_DAY);
    } else {
        startD = new Date(y, m, PERIOD_ANCHOR_DAY);
        endD = new Date(y, m + 1, PERIOD_ANCHOR_DAY);
    }
    return {
        first: formatLocalYmd(startD),
        last: formatLocalYmd(endD)
    };
}

/** @param {string} startDateStr - YYYY-MM-DD */
/** @param {string} endDateStr - YYYY-MM-DD */
function vacationMissionDatesWithinPeriod(startDateStr, endDateStr, now = new Date()) {
    const { first, last } = getCurrentSubmissionPeriodYmd(now);
    const sd = String(startDateStr).slice(0, 10);
    const ed = String(endDateStr).slice(0, 10);
    return sd >= first && ed <= last && sd <= ed;
}

/** Closing month key YYYY-MM for the period containing today. */
function getCurrentPeriodClosingMonthKey(now = new Date()) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    if (day <= PERIOD_ANCHOR_DAY) {
        return `${y}-${pad(m + 1)}`;
    }
    const endD = new Date(y, m + 1, PERIOD_ANCHOR_DAY);
    return `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}`;
}

/** Period ending on the 25th of monthKey (YYYY-MM): prev 25th → this 25th. */
function getPeriodRangeForMonthKey(monthKey) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
    if (!m) {
        const cur = getCurrentSubmissionPeriodYmd();
        return { startDate: cur.first, endDate: cur.last };
    }
    const year = parseInt(m[1], 10);
    const monthIndex = parseInt(m[2], 10) - 1;
    const startD = new Date(year, monthIndex - 1, PERIOD_ANCHOR_DAY);
    const endD = new Date(year, monthIndex, PERIOD_ANCHOR_DAY);
    return {
        startDate: formatLocalYmd(startD),
        endDate: formatLocalYmd(endD)
    };
}

function parsePeriodQuery(query) {
    if (query.startDate && query.endDate) {
        const rangeStart = new Date(query.startDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(query.endDate);
        rangeEnd.setHours(23, 59, 59, 999);
        if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime()) && rangeStart <= rangeEnd) {
            return {
                rangeStart,
                rangeEnd,
                periodLabel: `${query.startDate} → ${query.endDate}`,
                closingMonthKey: null
            };
        }
    }
    if (query.periodMonth) {
        const { startDate, endDate } = getPeriodRangeForMonthKey(query.periodMonth);
        const rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);
        return {
            rangeStart,
            rangeEnd,
            periodLabel: `${startDate} → ${endDate}`,
            closingMonthKey: query.periodMonth
        };
    }
    const { first, last } = getCurrentSubmissionPeriodYmd();
    const rangeStart = new Date(first);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(last);
    rangeEnd.setHours(23, 59, 59, 999);
    return {
        rangeStart,
        rangeEnd,
        periodLabel: `${first} → ${last}`,
        closingMonthKey: getCurrentPeriodClosingMonthKey()
    };
}

module.exports = {
    PERIOD_ANCHOR_DAY,
    getCurrentSubmissionPeriodYmd,
    getCurrentPeriodClosingMonthKey,
    getPeriodRangeForMonthKey,
    parsePeriodQuery,
    vacationMissionDatesWithinPeriod
};
