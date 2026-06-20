/**
 * Time-of-day greeting and name helpers for dashboard welcome banners.
 */

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return { key: 'welcomeHero.goodMorning', emoji: '🌅' };
  }
  if (hour >= 12 && hour < 17) {
    return { key: 'welcomeHero.goodAfternoon', emoji: '☕' };
  }
  return { key: 'welcomeHero.goodEvening', emoji: '🌙' };
}

export function getFirstName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Stable accent color from display name */
export function getAvatarColor(name) {
  const palette = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#30cfd0'
  ];
  let hash = 0;
  const str = String(name || 'user');
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function formatShiftTime(workSchedule) {
  const start = workSchedule?.startTime || '10:00';
  const end = workSchedule?.endTime || '19:00';
  return `${start} – ${end}`;
}
