export function getExcuseDurationHours(fromHour, toHour) {
  if (!fromHour || !toHour) return null;
  try {
    const fromTime = new Date(`2000-01-01T${String(fromHour).trim()}`);
    const toTime = new Date(`2000-01-01T${String(toHour).trim()}`);
    if (Number.isNaN(fromTime.getTime()) || Number.isNaN(toTime.getTime())) return null;
    return (toTime - fromTime) / (1000 * 60 * 60);
  } catch {
    return null;
  }
}

/** Matches server utils/excuseType.js */
export function normalizeExcuseType(form) {
  if (!form || form.type !== 'excuse') return undefined;
  const et = form.excuseType;
  if (et === 'paid' || et === 'unpaid') return et;
  const hours = getExcuseDurationHours(form.fromHour, form.toHour);
  if (hours === null || Number.isNaN(hours)) return 'unpaid';
  if (hours === 2) return 'paid';
  return 'unpaid';
}

export function isPaidExcuse(form) {
  return normalizeExcuseType(form) === 'paid';
}
