import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Shared job title / location lines for user management cards.
 */
export default function UserCardDetails({ user, layout = 'row' }) {
  const { t } = useTranslation();
  if (!user) return null;

  const jobTitle = user.jobTitle?.trim();
  const location = user.location?.trim();

  if (layout === 'grid') {
    return (
      <>
        <div className="info-item">
          <span className="info-label">{t('userTitleImport.jobTitle')}:</span>
          <span className="info-value">{jobTitle || t('common.notAssigned')}</span>
        </div>
        <div className="info-item">
          <span className="info-label">{t('userTitleImport.location')}:</span>
          <span className="info-value">{location || t('common.notAssigned')}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="info-row">
        <span className="info-label">{t('userTitleImport.jobTitle')}:</span>
        <span className="info-value">{jobTitle || t('common.notAssigned')}</span>
      </div>
      <div className="info-row">
        <span className="info-label">{t('userTitleImport.location')}:</span>
        <span className="info-value">{location || t('common.notAssigned')}</span>
      </div>
    </>
  );
}
