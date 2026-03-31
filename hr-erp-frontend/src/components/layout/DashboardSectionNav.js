import React, { useCallback, useEffect, useRef } from 'react';

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
 * @param {string} [title] — desktop header (i18n from parent)
 * @param {string} [description] — desktop subline
 * @param {string} [badgeLabel] — override badge text
 */
const DashboardSectionNav = ({
  sections,
  activeId,
  subtitle,
  variant = 'dark',
  role = 'employee',
  title,
  description,
  badgeLabel
}) => {
  const btnRefs = useRef([]);

  const light = variant === 'light';
  const shellClass = [
    'dashboard-nav-shell',
    `dashboard-nav-shell--role-${role}`,
    light ? 'dashboard-nav-shell--light' : 'dashboard-nav-shell--dark'
  ].join(' ');

  const showHeader = Boolean(title || description || badgeLabel);
  const badge = badgeLabel || ROLE_BADGE[role] || ROLE_BADGE.employee;

  const focusIndex = useCallback(
    (idx) => {
      const el = btnRefs.current[idx];
      if (el) el.focus();
    },
    []
  );

  useEffect(() => {
    btnRefs.current = btnRefs.current.slice(0, sections?.length || 0);
  }, [sections?.length]);

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
    <nav className={shellClass} aria-label="Dashboard sections">
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
        <div className="dashboard-nav-track" role="tablist" aria-orientation="horizontal">
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
