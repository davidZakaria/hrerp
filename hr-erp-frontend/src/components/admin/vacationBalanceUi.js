import React from 'react';
import {
  ANNUAL_LEAVE_QUOTA,
  CASUAL_LEAVE_QUOTA,
  LOW_ANNUAL_BALANCE,
  LOW_CASUAL_BALANCE
} from '../../constants/leavePolicy';

export function formatDays(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(1);
}

export function balanceVariant(remaining, lowThreshold) {
  const n = Number(remaining);
  if (n <= 0) return 'critical';
  if (n <= lowThreshold) return 'warning';
  return 'good';
}

export function BalanceBadge({ remaining, quota, lowThreshold, label }) {
  const variant = balanceVariant(remaining, lowThreshold);
  return (
    <span
      className={`saas-vacation-badge saas-vacation-badge--${variant}`}
      title={`${label}: ${formatDays(remaining)} / ${quota} Days`}
    >
      {formatDays(remaining)} / {quota} Days
    </span>
  );
}

export function StatusBadge({ annualLeft, casualLeft }) {
  if (annualLeft <= 0 && casualLeft <= 0) {
    return <span className="saas-vacation-badge saas-vacation-badge--critical">Depleted</span>;
  }
  if (annualLeft <= LOW_ANNUAL_BALANCE || casualLeft <= LOW_CASUAL_BALANCE) {
    return <span className="saas-vacation-badge saas-vacation-badge--warning">Low balance</span>;
  }
  return <span className="saas-vacation-badge saas-vacation-badge--good">Healthy</span>;
}

export function ProgressBar({ remaining, quota, lowThreshold }) {
  const pct = Math.min((Number(remaining) / quota) * 100, 100);
  const variant = balanceVariant(remaining, lowThreshold);
  return (
    <div className="saas-vacation-progress" aria-hidden="true">
      <div
        className={`saas-vacation-progress-fill saas-vacation-progress-fill--${variant}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { ANNUAL_LEAVE_QUOTA, CASUAL_LEAVE_QUOTA, LOW_ANNUAL_BALANCE, LOW_CASUAL_BALANCE };
