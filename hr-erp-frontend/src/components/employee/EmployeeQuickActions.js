import React from 'react';
import { useTranslation } from 'react-i18next';

const primaryBtn =
  'ed-btn-primary px-6 py-3 w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm';
const secondaryBtn =
  'saas-btn-secondary ed-btn-secondary px-6 py-3 w-full sm:w-auto text-center bg-white dark:bg-slate-800 !text-slate-700 dark:!text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-sm font-medium';

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
