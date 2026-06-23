import React from 'react';

export function DashboardStatCard({ value, label, className = '', onClick, title, subtitle }) {
  const interactive = Boolean(onClick);

  return (
    <div
      className={`dash-stat-card${interactive ? ' dash-stat-card--clickable' : ''} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={interactive ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={title}
    >
      <div className="dash-stat-value !text-indigo-600 dark:!text-indigo-400">{value}</div>
      <div className="dash-stat-label !text-slate-500 dark:!text-slate-400">{label}</div>
      {subtitle ? <div className="dash-stat-subtitle !text-slate-500 dark:!text-slate-400">{subtitle}</div> : null}
    </div>
  );
}

export function DashboardStatGrid({ children, columns = 4 }) {
  const colClass =
    columns === 3
      ? 'grid grid-cols-2 md:grid-cols-3 gap-4'
      : 'grid grid-cols-2 lg:grid-cols-4 gap-4';
  return <div className={colClass}>{children}</div>;
}

export default DashboardStatCard;
