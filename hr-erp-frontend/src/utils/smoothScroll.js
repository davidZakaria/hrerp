/**
 * Smooth scroll with offset for sticky headers/nav.
 * Respects prefers-reduced-motion.
 */
/** Space for app header + fixed section nav dock (see dashboardNav.css / DashboardSectionNav) */
export const DEFAULT_SCROLL_OFFSET = 120;

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function smoothScrollToElement(element, offset = DEFAULT_SCROLL_OFFSET) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function smoothScrollToTop() {
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  window.scrollTo({ top: 0, behavior });
}
