import React from 'react';
import { useTranslation } from 'react-i18next';

export default function DashboardProfileBadges({ user }) {
  const { t } = useTranslation();
  if (!user) return null;

  const items = [
    { label: t('common.department'), value: t(`departments.${user.department}`) || user.department || t('common.notAssigned') },
    { label: t('userTitleImport.jobTitle'), value: user.jobTitle || t('common.notAssigned') },
    { label: t('userTitleImport.location'), value: user.location || t('common.notAssigned') },
    { label: t('common.employeeCode'), value: user.employeeCode || t('common.notAssigned') }
  ];

  return (
    <div className="dash-profile-grid">
      {items.map((item) => (
        <div key={item.label} className="dash-profile-badge">
          <div className="dash-profile-badge-label">{item.label}</div>
          <div className="dash-profile-badge-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
