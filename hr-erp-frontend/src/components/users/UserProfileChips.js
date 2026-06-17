import React from 'react';
import { useTranslation } from 'react-i18next';

const chipStyle = {
  background: 'rgba(255,255,255,0.2)',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  backdropFilter: 'blur(10px)',
  minWidth: '120px',
  flex: '1 1 140px',
  maxWidth: '100%'
};

/**
 * Profile summary chips for welcome banners (employee / admin overview).
 */
export default function UserProfileChips({ user, variant = 'light' }) {
  const { t } = useTranslation();
  if (!user) return null;

  const isDark = variant === 'dark';
  const style = isDark
    ? { ...chipStyle, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)' }
    : chipStyle;

  const labelStyle = { opacity: 0.9, fontSize: '0.9rem' };
  const valueStyle = { fontWeight: 'bold', fontSize: '1.05rem', marginTop: '0.25rem' };

  const items = [
    { icon: '🏢', label: t('common.department'), value: t(`departments.${user.department}`) || user.department || t('common.notAssigned') },
    { icon: '💼', label: t('userTitleImport.jobTitle'), value: user.jobTitle || t('common.notAssigned') },
    { icon: '📍', label: t('userTitleImport.location'), value: user.location || t('common.notAssigned') },
    { icon: '🆔', label: t('common.employeeCode'), value: user.employeeCode || t('common.notAssigned') }
  ];

  return (
    <div className="user-profile-chips-wrap" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
      {items.map((item) => (
        <div key={item.label} style={style}>
          <span style={labelStyle}>{item.icon} {item.label}</span>
          <div style={valueStyle}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
