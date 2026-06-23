import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '../UserAvatar';
import { getFirstName, getTimeGreeting } from '../../utils/welcomeGreeting';

const EmployeeDashboardHero = ({ user, onUserUpdate }) => {
  const { t } = useTranslation();
  const greeting = useMemo(() => getTimeGreeting(), []);
  const firstName = getFirstName(user?.name);

  if (!user) {
    return <div className="ed-surface-card ed-hero ed-hero--loading" aria-hidden="true" />;
  }

  const departmentLabel = user.department
    ? (t(`departments.${user.department}`) || user.department)
    : t('common.notAssigned');
  const jobTitle = user.jobTitle || t('common.notAssigned');

  const handlePictureUpdated = (profilePicture) => {
    onUserUpdate?.({ ...user, profilePicture });
  };

  return (
    <header className="ed-surface-card ed-hero">
      <UserAvatar
        user={user}
        size="xl"
        editable
        onPictureUpdated={handlePictureUpdated}
      />
      <div className="ed-hero-text">
        <h1 className="ed-hero-greeting">
          {t('welcomeHero.greetingLine', { greeting: t(greeting.key), name: firstName })}
          {' '}{greeting.emoji}
        </h1>
        <p className="ed-hero-job">{jobTitle}</p>
        <p className="ed-hero-dept">{departmentLabel}</p>
      </div>
    </header>
  );
};

export default EmployeeDashboardHero;
