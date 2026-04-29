import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Shared month filter UX for Admin / Super Admin form management.
 * filterKind: all | submitted | event | both — avoids sending two confusing params at once.
 */
export function FormManagementMonthFilterBar({
  filterKind,
  onFilterKindChange,
  submittedMonth,
  eventMonth,
  onSubmittedMonthChange,
  onEventMonthChange,
}) {
  const { t } = useTranslation();

  const yyyymmFromDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const applyQuick = (which) => {
    const d = new Date();
    if (which === 'last') d.setMonth(d.getMonth() - 1);
    const v = yyyymmFromDate(d);
    if (filterKind === 'submitted') onSubmittedMonthChange(v);
    else if (filterKind === 'event') onEventMonthChange(v);
    else if (filterKind === 'both') {
      onSubmittedMonthChange(v);
      onEventMonthChange(v);
    }
  };

  return (
    <div className="form-mgmt-filters-bar">
      <div className="form-mgmt-filters-row">
        <div className="form-mgmt-field">
          <label htmlFor="form-mgmt-kind" className="form-mgmt-label">
            {t('formManagement.dateFilter')}
          </label>
          <select
            id="form-mgmt-kind"
            className="form-mgmt-select"
            value={filterKind}
            onChange={(e) => onFilterKindChange(e.target.value)}
          >
            <option value="all">{t('formManagement.filterAll')}</option>
            <option value="submitted">{t('formManagement.filterSubmitted')}</option>
            <option value="event">{t('formManagement.filterEvent')}</option>
            <option value="both">{t('formManagement.filterBoth')}</option>
          </select>
        </div>

        {(filterKind === 'submitted' || filterKind === 'both') && (
          <div className="form-mgmt-field">
            <label className="form-mgmt-label" htmlFor="form-mgmt-submitted">
              {t('formManagement.submittedMonthShort')}
            </label>
            <input
              id="form-mgmt-submitted"
              type="month"
              className="form-mgmt-month-input"
              value={submittedMonth}
              onChange={(e) => onSubmittedMonthChange(e.target.value)}
            />
          </div>
        )}

        {(filterKind === 'event' || filterKind === 'both') && (
          <div className="form-mgmt-field">
            <label className="form-mgmt-label" htmlFor="form-mgmt-event">
              {t('formManagement.eventMonthShort')}
            </label>
            <input
              id="form-mgmt-event"
              type="month"
              className="form-mgmt-month-input"
              value={eventMonth}
              onChange={(e) => onEventMonthChange(e.target.value)}
            />
          </div>
        )}

        {filterKind !== 'all' && (
          <div className="form-mgmt-quick-actions">
            <button type="button" className="form-mgmt-chip" onClick={() => applyQuick('this')}>
              {t('formManagement.quickThisMonth')}
            </button>
            <button type="button" className="form-mgmt-chip" onClick={() => applyQuick('last')}>
              {t('formManagement.quickLastMonth')}
            </button>
            <button
              type="button"
              className="form-mgmt-chip form-mgmt-chip-muted"
              onClick={() => onFilterKindChange('all')}
            >
              {t('formManagement.clear')}
            </button>
          </div>
        )}
      </div>
      <p className="form-mgmt-timezone-hint">{t('formManagement.timezoneHint')}</p>
    </div>
  );
}

export default FormManagementMonthFilterBar;
