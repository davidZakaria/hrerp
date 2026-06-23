import React from 'react';
import { useTranslation } from 'react-i18next';

const WALLET_ICONS = {
  annual: { icon: '🌴', badgeClass: 'ed-wallet-icon-badge--annual' },
  casual: { icon: '🌸', badgeClass: 'ed-wallet-icon-badge--casual' },
  excuse: { icon: '⏳', badgeClass: 'ed-wallet-icon-badge--excuse' }
};

function formatBalance(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

function WalletCard({ themeKey, label, remaining, quota, t }) {
  const { icon, badgeClass } = WALLET_ICONS[themeKey];
  return (
    <article className="ed-wallet-card">
      <span className={`ed-wallet-icon-badge ${badgeClass}`} aria-hidden="true">
        <span className="ed-wallet-icon">{icon}</span>
      </span>
      <div className="ed-wallet-label">{label}</div>
      <div className="ed-wallet-value-row">
        <span className="ed-wallet-value">{formatBalance(remaining)}</span>
        <span className="ed-wallet-quota">
          {themeKey === 'excuse'
            ? t('employeeDashboard.outOfRequests', { total: quota })
            : t('employeeDashboard.outOfDays', { total: quota })}
        </span>
      </div>
    </article>
  );
}

const LeaveWallet = ({ balances, quotas }) => {
  const { t } = useTranslation();

  const annualQuota = quotas?.annual ?? 15;
  const casualQuota = quotas?.casual ?? 6;
  const excuseQuota = quotas?.excuse ?? 2;

  return (
    <section className="ed-wallet-section" aria-labelledby="ed-leave-wallet-title">
      <h2 id="ed-leave-wallet-title" className="ed-section-title">
        {t('employeeDashboard.leaveWallet')}
      </h2>
      <div className="ed-wallet-grid">
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
