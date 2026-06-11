/** Same rules as server utils/formSubmissionMonthBounds.js (25th → 25th rolling period). */
export const PERIOD_ANCHOR_DAY = 25;

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatLocalYmd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** @returns {{ first: string, last: string }} min/max for date inputs (YYYY-MM-DD) */
export function getSubmissionPeriodBounds() {
  const range = getCurrentSubmissionPeriodRange();
  return { first: range.startDate, last: range.endDate };
}

/**
 * Active 25th→25th period containing today.
 * @returns {{ startDate: string, endDate: string }}
 */
export function getCurrentSubmissionPeriodRange(now = new Date()) {
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
    startDate: formatLocalYmd(startD),
    endDate: formatLocalYmd(endD)
  };
}

/** Closing month key YYYY-MM for the period that contains today. */
export function getCurrentPeriodClosingMonthKey(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  if (day <= PERIOD_ANCHOR_DAY) {
    return `${y}-${pad(m + 1)}`;
  }
  const endD = new Date(y, m + 1, PERIOD_ANCHOR_DAY);
  return `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}`;
}

/**
 * Period ending on the 25th of the given month key (YYYY-MM).
 * e.g. 2026-06 → 2026-05-25 to 2026-06-25
 */
export function getPeriodRangeForMonthKey(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return getCurrentSubmissionPeriodRange();
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1;
  const startD = new Date(year, monthIndex - 1, PERIOD_ANCHOR_DAY);
  const endD = new Date(year, monthIndex, PERIOD_ANCHOR_DAY);
  return {
    startDate: formatLocalYmd(startD),
    endDate: formatLocalYmd(endD)
  };
}

function formatMonthLabel(monthKey, locale) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Recent pay periods for dropdown (newest first).
 * @param {number} count
 * @param {string} [locale]
 */
export function listPeriodMonthOptions(count = 18, locale) {
  const [cy, cm] = getCurrentPeriodClosingMonthKey().split('-').map(Number);
  let year = cy;
  let monthIndex = cm - 1;
  const options = [];

  for (let i = 0; i < count; i += 1) {
    const monthKey = `${year}-${pad(monthIndex + 1)}`;
    const { startDate, endDate } = getPeriodRangeForMonthKey(monthKey);
    options.push({
      value: monthKey,
      startDate,
      endDate,
      label: formatMonthLabel(monthKey, locale)
    });
    monthIndex -= 1;
    if (monthIndex < 0) {
      monthIndex = 11;
      year -= 1;
    }
  }

  return options;
}
