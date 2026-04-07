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

module.exports = {
    PERIOD_ANCHOR_DAY,
    getCurrentSubmissionPeriodYmd,
    vacationMissionDatesWithinPeriod
};
