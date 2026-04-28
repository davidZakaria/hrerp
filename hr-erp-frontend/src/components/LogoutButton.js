import React from 'react';
import { useTranslation } from 'react-i18next';

const LogoutButton = () => {
  const { t } = useTranslation();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <button 
      type="button"
      onClick={handleLogout}
      className="btn-elegant app-header-logout"
      aria-label={t('common.logout')}
    >
      {t('common.logout')}
    </button>
  );
};

export default LogoutButton; 
