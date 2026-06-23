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
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[96px]"
        aria-hidden="true"
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
    <header className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <UserAvatar
        user={user}
        size="xl"
        editable
        onPictureUpdated={handlePictureUpdated}
      />
      <div className="w-full" style={{ minWidth: 0 }}>
        <h1 className="font-bold text-slate-900 dark:text-white" style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', lineHeight: 1.25, margin: 0 }}>
          {t('welcomeHero.greetingLine', { greeting: t(greeting.key), name: firstName })}
          {' '}{greeting.emoji}
        </h1>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200" style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
          {jobTitle}
        </p>
        <p className="text-sm text-slate-500" style={{ marginTop: '0.2rem' }}>
          {departmentLabel}
        </p>
      </div>
    </header>
  );
};

export default EmployeeDashboardHero;
