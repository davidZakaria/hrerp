import React from 'react';
import { useTranslation } from 'react-i18next';

const EmployeeQuickActions = ({ onRequestLeave, onRequestOvertime, onViewRequests }) => {
  const { t } = useTranslation();

  return (
    <nav className="ed-actions-row" aria-label={t('employeeDashboard.quickActions')}>
      <button type="button" className="ed-action-btn ed-action-btn--primary" onClick={onRequestLeave}>
        {t('employeeDashboard.requestLeave')}
      </button>
      <button type="button" className="ed-action-btn ed-action-btn--secondary" onClick={onRequestOvertime}>
        {t('employeeDashboard.requestOvertime')}
      </button>
      <button
        type="button"
        className="ed-action-btn ed-action-btn--secondary"
        disabled
        title={t('employeeDashboard.excuseUnavailableHint')}
      >
        {t('employeeDashboard.requestExcuse')}
      </button>
      {onViewRequests && (
        <button type="button" className="ed-action-btn ed-action-btn--secondary" onClick={onViewRequests}>
          {t('employeeDashboard.viewMyRequests')}
        </button>
      )}
    </nav>
  );
};

export default EmployeeQuickActions;
