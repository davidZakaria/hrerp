export function calculateVacationCalendarDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/** Deductible days for annual vacation (half day = 0.5). */
export function getVacationDeductionDays(formOrDates) {
  if (!formOrDates) return 0;
  const isHalfDay = formOrDates.isHalfDay === true || formOrDates.isHalfDay === 'true';
  if (isHalfDay) return 0.5;
  return calculateVacationCalendarDays(formOrDates.startDate, formOrDates.endDate);
}

export function formatVacationDeductionDays(formOrDates) {
  const days = getVacationDeductionDays(formOrDates);
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

export function formatVacationDateRange(form) {
  if (!form?.startDate) return 'N/A';
  const start = typeof form.startDate === 'string'
    ? form.startDate.slice(0, 10)
    : new Date(form.startDate).toISOString().slice(0, 10);
  if (form.isHalfDay) return start;
  const end = form.endDate
    ? (typeof form.endDate === 'string'
      ? form.endDate.slice(0, 10)
      : new Date(form.endDate).toISOString().slice(0, 10))
    : start;
  return `${start} to ${end}`;
}
