import React from 'react';
import { useTranslation } from 'react-i18next';

const logoutClasses =
  'app-header-logout ed-header-control saas-btn-secondary px-4 py-2 !text-slate-900 dark:!text-white border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm font-medium';

const LogoutButton = () => {
  const { t } = useTranslation();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={logoutClasses}
      aria-label={t('common.logout')}
    >
      <span className="app-header-logout-text !text-slate-900 dark:!text-white">{t('common.logout')}</span>
      <span className="app-header-logout-icon" aria-hidden="true">{'\u{1F6AA}'}</span>
    </button>
  );
};

export default LogoutButton;
