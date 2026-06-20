import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from './UserAvatar';
import { formatShiftTime, getFirstName, getTimeGreeting } from '../utils/welcomeGreeting';

const statCardStyle = {
  background: 'rgba(255, 255, 255, 0.18)',
  backdropFilter: 'blur(12px)',
  borderRadius: '14px',
  padding: '1rem 1.15rem',
  minWidth: '130px',
  flex: '1 1 140px',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
};

/**
 * Personalized welcome banner with avatar, time-aware greeting, and quick stats.
 */
const WelcomeHero = ({
  user,
  vacationDaysLeft,
  variant = 'employee',
  onUserUpdate
}) => {
  const { t } = useTranslation();
  const greeting = useMemo(() => getTimeGreeting(), []);
  const firstName = getFirstName(user?.name);

  if (!user) return null;

  const leaveRemaining = vacationDaysLeft ?? user.vacationDaysLeft ?? '—';
  const excusesRemaining = user.excuseRequestsLeft ?? '—';
  const shiftLabel = formatShiftTime(user.workSchedule);

  const handlePictureUpdated = (profilePicture) => {
    const updated = { ...user, profilePicture };
    onUserUpdate?.(updated);
  };

  const gradient =
    variant === 'manager'
      ? 'linear-gradient(135deg, #1a237e 0%, #3949ab 45%, #7986cb 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 55%, #f093fb 120%)';

  return (
    <div
      className="welcome-hero"
      style={{
        background: gradient,
        borderRadius: '16px',
        padding: '1.75rem 1.75rem 1.5rem',
        marginBottom: '2rem',
        color: '#fff',
        boxShadow: '0 12px 40px rgba(102, 126, 234, 0.28)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 280px' }}>
        <UserAvatar
          user={user}
          size="xl"
          editable
          onPictureUpdated={handlePictureUpdated}
        />
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(1.35rem, 3vw, 1.85rem)',
            fontWeight: 700,
            lineHeight: 1.3
          }}>
            {t('welcomeHero.greetingLine', { greeting: t(greeting.key), name: firstName })}
            {' '}{greeting.emoji}
          </h2>
          {variant === 'manager' && (
            <p style={{ margin: '0.5rem 0 0', opacity: 0.88, fontSize: '0.9rem' }}>
              {user.department ? (t(`departments.${user.department}`) || user.department) : ''}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.85rem',
          flex: '2 1 320px',
          justifyContent: 'flex-end'
        }}
      >
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>🌴 {t('welcomeHero.leaveRemaining')}</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, marginTop: '0.25rem' }}>{leaveRemaining}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⏳ {t('welcomeHero.excusesRemaining')}</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, marginTop: '0.25rem' }}>{excusesRemaining}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⏱️ {t('welcomeHero.todaysShift')}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.35rem' }}>{shiftLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHero;
