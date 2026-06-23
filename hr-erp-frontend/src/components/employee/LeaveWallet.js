import React from 'react';
import { useTranslation } from 'react-i18next';

const WALLET_CONFIG = {
  annual: {
    icon: '🌴',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30'
  },
  casual: {
    icon: '🌸',
    iconBg: 'bg-pink-50 dark:bg-pink-900/30'
  },
  excuse: {
    icon: '⏳',
    iconBg: 'bg-orange-50 dark:bg-orange-900/30'
  }
};

function formatBalance(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

function WalletCard({ themeKey, label, remaining, quota, quotaSuffix, t }) {
  const { icon, iconBg } = WALLET_CONFIG[themeKey];
  return (
    <article className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium !text-slate-500 dark:!text-slate-400">{label}</span>
        <div className={`p-3 rounded-xl ${iconBg} text-2xl`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold !text-slate-900 dark:!text-white">{formatBalance(remaining)}</span>
        <span className="text-sm !text-slate-500 dark:!text-slate-400">{quotaSuffix}</span>
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
    <section aria-labelledby="ed-leave-wallet-title">
      <h2 id="ed-leave-wallet-title" className="text-4xl font-bold !text-slate-900 dark:!text-white" style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}>
        {t('employeeDashboard.leaveWallet')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WalletCard
          themeKey="annual"
          label={t('employeeDashboard.annualLeaves')}
          remaining={balances?.vacationDaysLeft}
          quota={annualQuota}
          quotaSuffix={t('employeeDashboard.outOfDays', { total: annualQuota })}
          t={t}
        />
        <WalletCard
          themeKey="casual"
          label={t('employeeDashboard.casualLeaves')}
          remaining={balances?.casualDaysLeft}
          quota={casualQuota}
          quotaSuffix={t('employeeDashboard.outOfDays', { total: casualQuota })}
          t={t}
        />
        <WalletCard
          themeKey="excuse"
          label={t('employeeDashboard.paidExcuses')}
          remaining={balances?.excuseRequestsLeft}
          quota={excuseQuota}
          quotaSuffix={t('employeeDashboard.outOfRequests', { total: excuseQuota })}
          t={t}
        />
      </div>
    </section>
  );
};

export default LeaveWallet;
