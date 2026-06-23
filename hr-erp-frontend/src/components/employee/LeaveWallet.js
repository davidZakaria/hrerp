import React from 'react';
import { useTranslation } from 'react-i18next';
import { WALLET_THEMES } from './employeeDashboardStyles';

function formatBalance(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

function WalletCard({ themeKey, label, remaining, quota, t }) {
  const theme = WALLET_THEMES[themeKey];
  return (
    <div
      style={{
        background: theme.bg,
        borderRadius: '16px',
        padding: '1.35rem 1.5rem',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(255,255,255,0.65)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        minHeight: '130px'
      }}
    >
      <div style={{ fontSize: '1.35rem' }}>{theme.icon}</div>
      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: theme.accent, opacity: 0.9 }}>
        {label}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <span
          style={{
            fontSize: '2.35rem',
            fontWeight: 800,
            color: theme.accent,
            lineHeight: 1,
            letterSpacing: '-0.03em'
          }}
        >
          {formatBalance(remaining)}
        </span>
        <span style={{ fontSize: '0.95rem', color: theme.accent, opacity: 0.75, marginLeft: '0.35rem' }}>
          {themeKey === 'excuse'
            ? t('employeeDashboard.outOfRequests', { total: quota })
            : t('employeeDashboard.outOfDays', { total: quota })}
        </span>
      </div>
    </div>
  );
}

const LeaveWallet = ({ balances, quotas }) => {
  const { t } = useTranslation();

  const annualQuota = quotas?.annual ?? 15;
  const casualQuota = quotas?.casual ?? 6;
  const excuseQuota = quotas?.excuse ?? 2;

  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h2
        style={{
          margin: '0 0 1rem',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          letterSpacing: '-0.02em'
        }}
      >
        {t('employeeDashboard.leaveWallet')}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}
      >
        <WalletCard
          themeKey="annual"
          label={t('employeeDashboard.annualLeaves')}
          remaining={balances?.vacationDaysLeft}
          quota={annualQuota}
          t={t}
        />
        <WalletCard
          themeKey="casual"
          label={t('employeeDashboard.casualLeaves')}
          remaining={balances?.casualDaysLeft}
          quota={casualQuota}
          t={t}
        />
        <WalletCard
          themeKey="excuse"
          label={t('employeeDashboard.paidExcuses')}
          remaining={balances?.excuseRequestsLeft}
          quota={excuseQuota}
          t={t}
        />
      </div>
    </section>
  );
};

export default LeaveWallet;
