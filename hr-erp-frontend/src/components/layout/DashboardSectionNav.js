import React from 'react';

/**
 * Horizontal section navigator for role dashboards (tabs / pills).
 * @param {{ id: string, label: string, icon?: string, onSelect: () => void }[]} sections
 * @param {string} activeId
 * @param {string} [subtitle]
 */
const DashboardSectionNav = ({ sections, activeId, subtitle, variant = 'dark' }) => {
  if (!sections || sections.length === 0) return null;

  const light = variant === 'light';

  return (
    <nav
      className="dashboard-section-nav"
      aria-label="Dashboard sections"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: '8px',
        overflowX: 'auto',
        padding: '12px 16px',
        marginBottom: '12px',
        background: light ? 'rgba(102, 126, 234, 0.06)' : 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        border: light ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid rgba(255,255,255,0.12)',
        WebkitOverflowScrolling: 'touch',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(8px)'
      }}
    >
      {sections.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={s.onSelect}
            className={`dashboard-section-nav-btn${active ? ' active' : ''}`}
            style={{
              flex: '0 0 auto',
              padding: '10px 16px',
              borderRadius: '999px',
              border: light
                ? active
                  ? '2px solid #667eea'
                  : '1px solid rgba(0,0,0,0.12)'
                : active
                  ? '2px solid rgba(255,255,255,0.95)'
                  : '1px solid rgba(255,255,255,0.25)',
              background: light
                ? active
                  ? 'linear-gradient(135deg, #667eea, #764ba2)'
                  : '#fff'
                : active
                  ? 'linear-gradient(135deg, rgba(102,126,234,0.95), rgba(118,75,162,0.95))'
                  : 'rgba(255,255,255,0.06)',
              color: light ? (active ? '#fff' : '#333') : '#fff',
              fontWeight: active ? 600 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {s.icon ? `${s.icon} ` : ''}
            {s.label}
          </button>
        );
      })}
      {subtitle ? (
        <span
          style={{
            alignSelf: 'center',
            marginLeft: 'auto',
            fontSize: '0.8rem',
            color: light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)',
            whiteSpace: 'nowrap',
            paddingLeft: '8px'
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </nav>
  );
};

export default DashboardSectionNav;
