/**
 * Client-side month filtering aligned with backend utils/formMonthFilters.js
 * (Egypt wall month via +02:00 by default). Ensures the UI matches the filter
 * even if a proxy or stale API ignores query params.
 */

const DEFAULT_TZ = process.env.REACT_APP_FORM_MONTH_TZ_OFFSET || '+02:00';

function parseYm(s) {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function zonedMonthBounds(year, month, tzOffset) {
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const start = new Date(`${ym}-01T00:00:00${tzOffset}`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = new Date(
    `${ym}-${String(lastDay).padStart(2, '0')}T23:59:59.999${tzOffset}`
  );
  return { start, end };
}

function boundsFromYm(yyyymm) {
  const p = parseYm(yyyymm);
  if (!p) return null;
  return zonedMonthBounds(p.year, p.month, DEFAULT_TZ);
}

function rangeOverlapsBounds(startVal, endVal, bounds) {
  if (startVal == null || endVal == null) return false;
  const s = new Date(startVal);
  const e = new Date(endVal);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return s <= bounds.end && e >= bounds.start;
}

function formOverlapsEventMonth(form, bounds) {
  if (!bounds) return true;
  switch (form.type) {
    case 'vacation':
      return rangeOverlapsBounds(form.startDate, form.endDate, bounds);
    case 'excuse': {
      if (form.excuseDate == null) return false;
      const d = new Date(form.excuseDate);
      if (Number.isNaN(d.getTime())) return false;
      return d >= bounds.start && d <= bounds.end;
    }
    case 'sick_leave':
      return rangeOverlapsBounds(form.sickLeaveStartDate, form.sickLeaveEndDate, bounds);
    case 'wfh': {
      if (form.wfhDate == null) return false;
      const d = new Date(form.wfhDate);
      if (Number.isNaN(d.getTime())) return false;
      return d >= bounds.start && d <= bounds.end;
    }
    case 'extra_hours': {
      if (form.extraHoursDate == null) return false;
      const d = new Date(form.extraHoursDate);
      if (Number.isNaN(d.getTime())) return false;
      return d >= bounds.start && d <= bounds.end;
    }
    case 'mission':
      return rangeOverlapsBounds(form.missionStartDate, form.missionEndDate, bounds);
    default:
      return false;
  }
}

function matchesSubmittedMonth(form, yyyymm) {
  const bounds = boundsFromYm(yyyymm);
  if (!bounds || form.createdAt == null) return false;
  const c = new Date(form.createdAt);
  if (Number.isNaN(c.getTime())) return false;
  return c >= bounds.start && c <= bounds.end;
}

/** Local calendar YYYY-MM (for defaulting the month picker). */
export function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** @param {object[]} forms @param {string} [submittedMonth] YYYY-MM @param {string} [eventMonth] YYYY-MM */
export function filterFormsByManagementMonths(forms, submittedMonth, eventMonth) {
  if (!forms?.length) return forms || [];
  if (!submittedMonth && !eventMonth) return forms;

  return forms.filter((f) => {
    if (submittedMonth && !matchesSubmittedMonth(f, submittedMonth)) return false;
    if (eventMonth) {
      const b = boundsFromYm(eventMonth);
      if (b && !formOverlapsEventMonth(f, b)) return false;
    }
    return true;
  });
}
