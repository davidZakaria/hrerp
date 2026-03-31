import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const ROLE_BADGE = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

/**
 * Horizontal section navigator for role dashboards (tabs / pills).
 * @param {{ id: string, label: string, icon?: string, onSelect: () => void }[]} sections
 * @param {string} activeId
 * @param {string} [subtitle]
 * @param {'dark'|'light'} [variant]
 * @param {'employee'|'manager'|'admin'|'super_admin'} [role]
 * @param {string} [title]
 * @param {string} [description]
 * @param {string} [badgeLabel]
 * @param {boolean} [showScrollIndicator] — animated underline under active pill
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
  showScrollIndicator = true
}) => {
  const btnRefs = useRef([]);
  const shellRef = useRef(null);
  const trackRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const light = variant === 'light';
  const shellClass = [
    'dashboard-nav-shell',
    `dashboard-nav-shell--role-${role}`,
    light ? 'dashboard-nav-shell--light' : 'dashboard-nav-shell--dark'
  ].join(' ');

  const showHeader = Boolean(title || description || badgeLabel);
  const badge = badgeLabel || ROLE_BADGE[role] || ROLE_BADGE.employee;

  const focusIndex = useCallback((idx) => {
    const el = btnRefs.current[idx];
    if (el) el.focus();
  }, []);

  useEffect(() => {
    btnRefs.current = btnRefs.current.slice(0, sections?.length || 0);
  }, [sections?.length]);

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

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onScroll = () => {
      const y = window.scrollY;
      shell.classList.toggle('dashboard-nav-shell--scrolled', y > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  return (
    <nav ref={shellRef} className={shellClass} aria-label="Dashboard sections">
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
  );
};

export default DashboardSectionNav;
