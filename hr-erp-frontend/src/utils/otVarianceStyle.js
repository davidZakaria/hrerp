/**
 * OT variance display colors:
 * - positive (actual > approved): red
 * - neutral (v = 0): green
 * - negative (approved > actual): amber
 */
export function varianceStyle(flag) {
  if (flag === 'positive') return { color: '#f87171', fontWeight: 700 };
  if (flag === 'negative') return { color: '#fb923c', fontWeight: 700 };
  return { color: '#4ade80', fontWeight: 600 };
}

export function varianceTotalStyle(value) {
  if (value > 0.004) return { color: '#f87171', fontWeight: 700 };
  if (value < -0.004) return { color: '#fb923c', fontWeight: 700 };
  return { color: '#4ade80', fontWeight: 600 };
}

export function varianceMobileClass(flag) {
  if (flag === 'positive') return 'value-variance-over';
  if (flag === 'negative') return 'value-variance-under';
  return 'value-variance-match';
}
