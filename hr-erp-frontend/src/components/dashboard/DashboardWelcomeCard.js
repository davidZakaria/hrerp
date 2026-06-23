import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from '../UserAvatar';
import DashboardProfileBadges from './DashboardProfileBadges';
import { getFirstName, getTimeGreeting } from '../../utils/welcomeGreeting';

/**
 * Modern welcome card for admin / manager dashboards (no purple gradient).
 */
export default function DashboardWelcomeCard({
  user,
  showAvatar = false,
  showGreeting = false,
  onUserUpdate,
  children
}) {
  const { t } = useTranslation();
  const greeting = useMemo(() => (showGreeting ? getTimeGreeting() : null), [showGreeting]);
  const firstName = getFirstName(user?.name);

  if (!user) return null;

  const handlePictureUpdated = (profilePicture) => {
    onUserUpdate?.({ ...user, profilePicture });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {showAvatar && (
          <UserAvatar
            user={user}
            size="xl"
            editable={Boolean(onUserUpdate)}
            onPictureUpdated={handlePictureUpdated}
          />
        )}
        <div className="w-full" style={{ minWidth: 0 }}>
          <h2 className="font-bold !text-slate-900 dark:!text-white" style={{ margin: 0, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
            {showGreeting && greeting
              ? `${t('welcomeHero.greetingLine', { greeting: t(greeting.key), name: firstName })} ${greeting.emoji}`
              : `👋 ${t('dashboard.welcome')}, ${user.name}`}
          </h2>
          {children}
        </div>
      </div>
      <DashboardProfileBadges user={user} />
    </div>
  );
}
