import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const ROLE_BADGE = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

function readRailTopPx(stickyBelowAppHeader) {
  if (typeof window === 'undefined') return stickyBelowAppHeader ? 88 : 12;
  if (!stickyBelowAppHeader) {
    return 12;
  }
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue('--dashboard-nav-sticky-top').trim();
  if (raw.endsWith('rem')) {
    const rem = parseFloat(raw);
    const fs = parseFloat(getComputedStyle(root).fontSize) || 16;
    return rem * fs;
  }
  if (raw.endsWith('px')) return parseFloat(raw);
  return 88;
}

/**
 * Horizontal section navigator for role dashboards (tabs / pills).
 * Uses scroll-driven position:fixed docking — CSS sticky breaks under many layout ancestors.
 */
const DashboardSectionNav = ({
  sections,
  activeId,
  subtitle,
  variant = 'dark',
  role = 'employee',
  title,
  description,
  badgeLabel,
  showScrollIndicator = true,
  stickyBelowAppHeader = true
}) => {
  const btnRefs = useRef([]);
  const shellRef = useRef(null);
  const anchorRef = useRef(null);
  const trackRef = useRef(null);
  const rafScroll = useRef(0);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [dockFixed, setDockFixed] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [railTopPx, setRailTopPx] = useState(() => readRailTopPx(stickyBelowAppHeader));

  const light = variant === 'light';
  const shellClass = [
    'dashboard-nav-shell',
    `dashboard-nav-shell--role-${role}`,
    light ? 'dashboard-nav-shell--light' : 'dashboard-nav-shell--dark',
    dockFixed ? 'dashboard-nav-shell--fixed-dock' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = Boolean(title || description || badgeLabel);
  const badge = badgeLabel || ROLE_BADGE[role] || ROLE_BADGE.employee;

  const focusIndex = useCallback((idx) => {
    const el = btnRefs.current[idx];
    if (el) el.focus();
  }, []);

  useEffect(() => {
    btnRefs.current = btnRefs.current.slice(0, sections?.length || 0);
  }, [sections?.length]);

  useEffect(() => {
    const updateRail = () => setRailTopPx(readRailTopPx(stickyBelowAppHeader));
    updateRail();
    window.addEventListener('resize', updateRail);
    return () => window.removeEventListener('resize', updateRail);
  }, [stickyBelowAppHeader]);

  const updateIndicator = useCallback(() => {
    if (!showScrollIndicator || !sections?.length) return;
    const track = trackRef.current;
    const idx = sections.findIndex((s) => s.id === activeId);
    const btn = btnRefs.current[idx];
    if (!track || !btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeId, sections, showScrollIndicator]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !showScrollIndicator) return;
    const onScroll = () => updateIndicator();
    track.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateIndicator) : null;
    ro?.observe(track);
    window.addEventListener('resize', updateIndicator);
    return () => {
      track.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [updateIndicator, showScrollIndicator]);

  const runDockCheck = useCallback(() => {
    const anchor = anchorRef.current;
    const shell = shellRef.current;
    if (!anchor) return;

    const rail = railTopPx;
    const top = anchor.getBoundingClientRect().top;
    const shouldDock = top <= rail + 1;

    if (shouldDock && shell && shell.offsetHeight > 0) {
      setBarHeight((h) => (shell.offsetHeight !== h ? shell.offsetHeight : h));
    }

    setDockFixed(shouldDock);

    if (shell) {
      const y = window.scrollY;
      shell.classList.toggle('dashboard-nav-shell--scrolled', y > 8 || shouldDock);
    }
  }, [railTopPx]);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafScroll.current);
      rafScroll.current = requestAnimationFrame(runDockCheck);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      cancelAnimationFrame(rafScroll.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [runDockCheck]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver(() => {
      if (dockFixed) setBarHeight(shell.offsetHeight);
    });
    ro.observe(shell);
    return () => ro.disconnect();
  }, [dockFixed]);

  const onKeyDown = useCallback(
    (e, index) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const rtl = typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl';
      const next =
        e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')
          ? Math.min(index + 1, sections.length - 1)
          : Math.max(index - 1, 0);
      if (next !== index) {
        e.preventDefault();
        focusIndex(next);
      }
    },
    [sections.length, focusIndex]
  );

  if (!sections || sections.length === 0) return null;

  const fixedStyle = dockFixed
    ? {
        top: `max(${railTopPx}px, env(safe-area-inset-top, 0px))`
      }
    : undefined;

  return (
    <div ref={anchorRef} className="dashboard-nav-sticky-wrapper">
      {dockFixed && barHeight > 0 ? (
        <div className="dashboard-nav-dock-spacer" style={{ height: barHeight }} aria-hidden />
      ) : null}
      <nav ref={shellRef} className={shellClass} style={fixedStyle} aria-label="Dashboard sections">
        {showHeader ? (
          <div className="dashboard-nav-header has-bottom-rule">
            <div className="dashboard-nav-header-main">
              <span className="dashboard-nav-badge">{badge}</span>
              {title || description ? (
                <div className="dashboard-nav-headings">
                  {title ? <span className="dashboard-nav-title">{title}</span> : null}
                  {description ? <span className="dashboard-nav-desc">{description}</span> : null}
                </div>
              ) : null}
            </div>
            {subtitle ? (
              <div className="dashboard-nav-header-aside">
                <span className="dashboard-nav-subtitle">{subtitle}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="dashboard-nav-track-wrap">
          <div
            ref={trackRef}
            className="dashboard-nav-track"
            role="tablist"
            aria-orientation="horizontal"
          >
            {showScrollIndicator ? (
              <span
                className="dashboard-nav-indicator"
                style={{
                  transform: `translateX(${indicator.left}px)`,
                  width: indicator.width || 0,
                  opacity: indicator.width ? 1 : 0
                }}
                aria-hidden
              />
            ) : null}
            {sections.map((s, index) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    btnRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  id={`dashboard-nav-${s.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={s.onSelect}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  className={`dashboard-section-nav-btn${active ? ' active' : ''}`}
                >
                  {s.icon ? `${s.icon} ` : ''}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {subtitle && showHeader ? (
          <div className="dashboard-nav-footer-mobile is-visible with-header">
            <span className="dashboard-nav-subtitle">{subtitle}</span>
          </div>
        ) : null}

        {subtitle && !showHeader ? (
          <div className="dashboard-nav-footer-mobile is-visible">
            <span className="dashboard-nav-subtitle">{subtitle}</span>
          </div>
        ) : null}
      </nav>
    </div>
  );
};

export default DashboardSectionNav;
