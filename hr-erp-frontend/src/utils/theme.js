export const THEME_STORAGE_KEY = 'hr-erp-theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}
