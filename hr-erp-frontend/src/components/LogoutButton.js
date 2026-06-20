import React from 'react';
import { useTranslation } from 'react-i18next';

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
      className="btn-elegant app-header-logout"
      aria-label={t('common.logout')}
    >
      <span className="app-header-logout-text">{t('common.logout')}</span>
      <span className="app-header-logout-icon" aria-hidden="true">🚪</span>
    </button>
  );
};

export default LogoutButton;
