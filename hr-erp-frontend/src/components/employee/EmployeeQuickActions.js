import React from 'react';
import { useTranslation } from 'react-i18next';

const primaryBtn =
  'px-6 py-3 w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm ed-btn-primary';
const secondaryBtn =
  'px-6 py-3 w-full sm:w-auto text-center bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ed-btn-secondary';

const EmployeeQuickActions = ({ onRequestLeave, onRequestOvertime, onViewRequests }) => {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('employeeDashboard.quickActions')}>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
        <button type="button" className={primaryBtn} onClick={onRequestLeave}>
          {t('employeeDashboard.requestLeave')}
        </button>
        <button type="button" className={secondaryBtn} onClick={onRequestOvertime}>
          {t('employeeDashboard.requestOvertime')}
        </button>
        <button
          type="button"
          className={secondaryBtn}
          disabled
          title={t('employeeDashboard.excuseUnavailableHint')}
          style={{ opacity: 0.45, cursor: 'not-allowed' }}
        >
          {t('employeeDashboard.requestExcuse')}
        </button>
        {onViewRequests && (
          <button type="button" className={secondaryBtn} onClick={onViewRequests}>
            {t('employeeDashboard.viewMyRequests')}
          </button>
        )}
      </div>
    </nav>
  );
};

export default EmployeeQuickActions;
