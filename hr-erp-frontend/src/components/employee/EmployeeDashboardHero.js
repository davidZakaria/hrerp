import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '../UserAvatar';
import { getFirstName, getTimeGreeting } from '../../utils/welcomeGreeting';

const EmployeeDashboardHero = ({ user, onUserUpdate }) => {
  const { t } = useTranslation();
  const greeting = useMemo(() => getTimeGreeting(), []);
  const firstName = getFirstName(user?.name);

  if (!user) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 55%, #f093fb 120%)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.75rem',
          minHeight: '120px',
          boxShadow: '0 12px 40px rgba(102, 126, 234, 0.22)'
        }}
      />
    );
  }

  const departmentLabel = user.department
    ? (t(`departments.${user.department}`) || user.department)
    : t('common.notAssigned');
  const jobTitle = user.jobTitle || t('common.notAssigned');

  const handlePictureUpdated = (profilePicture) => {
    onUserUpdate?.({ ...user, profilePicture });
  };

  return (
    <div
      className="employee-dashboard-hero"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 55%, #f093fb 120%)',
        borderRadius: '16px',
        padding: '1.75rem 1.85rem',
        marginBottom: '1.75rem',
        color: '#fff',
        boxShadow: '0 12px 40px rgba(102, 126, 234, 0.28)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center'
      }}
    >
      <UserAvatar
        user={user}
        size="xl"
        editable
        onPictureUpdated={handlePictureUpdated}
      />
      <div style={{ flex: '1 1 220px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '-0.02em'
          }}
        >
          {t('welcomeHero.greetingLine', { greeting: t(greeting.key), name: firstName })}
          {' '}{greeting.emoji}
        </h1>
        <p style={{ margin: '0.65rem 0 0', fontSize: '1.05rem', fontWeight: 600, opacity: 0.95 }}>
          {jobTitle}
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.92rem', opacity: 0.85 }}>
          {departmentLabel}
        </p>
      </div>
    </div>
  );
};

export default EmployeeDashboardHero;
