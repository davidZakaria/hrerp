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
  const now = new Date();
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
