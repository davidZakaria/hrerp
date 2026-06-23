import React from 'react';
import { useTranslation } from 'react-i18next';

const baseBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.85rem 1.35rem',
  borderRadius: '999px',
  border: 'none',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
  flex: '1 1 180px',
  minWidth: '160px'
};

const EmployeeQuickActions = ({ onRequestLeave, onRequestOvertime, onRequestExcuse, onViewRequests }) => {
  const { t } = useTranslation();

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
        {t('employeeDashboard.quickActions')}
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          padding: '1.15rem 1.25rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.07)',
          border: '1px solid rgba(148, 163, 184, 0.12)'
        }}
      >
        <button
          type="button"
          style={{
            ...baseBtn,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff'
          }}
          onClick={onRequestLeave}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <span aria-hidden>➕</span>
          {t('employeeDashboard.requestLeave')}
        </button>
        <button
          type="button"
          style={{
            ...baseBtn,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: '#fff'
          }}
          onClick={onRequestOvertime}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <span aria-hidden>➕</span>
          {t('employeeDashboard.requestOvertime')}
        </button>
        <button
          type="button"
          style={{
            ...baseBtn,
            background: 'rgba(148, 163, 184, 0.18)',
            color: '#64748b',
            cursor: 'not-allowed',
            boxShadow: 'none'
          }}
          disabled
          title={t('employeeDashboard.excuseUnavailableHint')}
        >
          <span aria-hidden>➕</span>
          {t('employeeDashboard.requestExcuse')}
        </button>
        {onViewRequests && (
          <button
            type="button"
            style={{
              ...baseBtn,
              background: '#fff',
              color: '#475569',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
            }}
            onClick={onViewRequests}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span aria-hidden>📋</span>
            {t('employeeDashboard.viewMyRequests')}
          </button>
        )}
      </div>
    </section>
  );
};

export default EmployeeQuickActions;
