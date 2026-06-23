import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getCurrentPeriodClosingMonthKey,
  getCurrentSubmissionPeriodRange,
  getPeriodRangeForMonthKey,
  listPeriodMonthOptions,
  PERIOD_ANCHOR_DAY
} from '../utils/formSubmissionMonthBounds';

/**
 * Shared date-range filter with 25th→25th pay-period month picker.
 */
export function useReportPeriodRange() {
  const currentRange = getCurrentSubmissionPeriodRange();
  const [rangeStart, setRangeStartState] = React.useState(currentRange.startDate);
  const [rangeEnd, setRangeEndState] = React.useState(currentRange.endDate);
  const [selectedPeriod, setSelectedPeriod] = React.useState(getCurrentPeriodClosingMonthKey());

  const applyPeriod = (monthKey) => {
    if (!monthKey || monthKey === 'custom') {
      setSelectedPeriod(monthKey || 'custom');
      return;
    }
    const { startDate, endDate } = getPeriodRangeForMonthKey(monthKey);
    setRangeStartState(startDate);
    setRangeEndState(endDate);
    setSelectedPeriod(monthKey);
  };

  const setRangeStart = (value) => {
    setRangeStartState(value);
    setSelectedPeriod('custom');
  };

  const setRangeEnd = (value) => {
    setRangeEndState(value);
    setSelectedPeriod('custom');
  };

  return {
    rangeStart,
    rangeEnd,
    selectedPeriod,
    applyPeriod,
    setRangeStart,
    setRangeEnd
  };
}

export function ReportPeriodFilter({
  i18nPrefix,
  rangeStart,
  rangeEnd,
  selectedPeriod,
  applyPeriod,
  setRangeStart,
  setRangeEnd,
  onRefresh,
  loading,
  variant = 'default'
}) {
  const { t, i18n } = useTranslation();
  const periodOptions = useMemo(
    () => listPeriodMonthOptions(18, i18n.language),
    [i18n.language]
  );

  const selectedOption = periodOptions.find((o) => o.value === selectedPeriod);
  const isSleek = variant === 'sleek';

  const filterContent = (
    <>
      <div className={isSleek ? 'eot-filter-row' : undefined} style={isSleek ? undefined : { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div className={isSleek ? 'eot-filter-field' : undefined} style={isSleek ? undefined : { minWidth: '200px', flex: '1 1 200px' }}>
          <label className={isSleek ? 'eot-filter-label' : 'form-label-elegant'}>{t(`${i18nPrefix}.payPeriod`)}</label>
          <select
            className={isSleek ? 'eot-filter-select' : 'form-input-elegant saas-input'}
            value={selectedPeriod === 'custom' ? '' : selectedPeriod}
            onChange={(e) => applyPeriod(e.target.value || 'custom')}
          >
            <option value="">{t(`${i18nPrefix}.customDates`)}</option>
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.startDate} → {opt.endDate})
              </option>
            ))}
          </select>
        </div>
        <div className={isSleek ? 'eot-filter-field eot-filter-field--dates' : undefined}>
          <label className={isSleek ? 'eot-filter-label' : 'form-label-elegant'}>{t(`${i18nPrefix}.startDate`)}</label>
          <input
            type="date"
            className={isSleek ? 'eot-filter-input' : 'form-input-elegant saas-input'}
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
          />
        </div>
        <div className={isSleek ? 'eot-filter-field eot-filter-field--dates' : undefined}>
          <label className={isSleek ? 'eot-filter-label' : 'form-label-elegant'}>{t(`${i18nPrefix}.endDate`)}</label>
          <input
            type="date"
            className={isSleek ? 'eot-filter-input' : 'form-input-elegant saas-input'}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={isSleek ? 'eot-filter-btn' : 'btn-elegant btn-primary'}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? t(`${i18nPrefix}.loading`) : t(`${i18nPrefix}.refresh`)}
        </button>
      </div>
      {selectedOption && selectedPeriod !== 'custom' && (
        <p className={isSleek ? 'eot-filter-hint' : '!text-slate-500 dark:!text-slate-400'} style={isSleek ? undefined : { margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
          {t(`${i18nPrefix}.periodHint`, {
            day: PERIOD_ANCHOR_DAY,
            start: selectedOption.startDate,
            end: selectedOption.endDate,
            defaultValue: 'Select a pay period to view your approved vs fingerprint overtime.'
          })}
        </p>
      )}
    </>
  );

  if (isSleek) {
    return <div className="eot-filter">{filterContent}</div>;
  }

  return (
    <div className="elegant-card saas-filter-card" style={{ marginBottom: '1.5rem' }}>
      {filterContent}
    </div>
  );
}
