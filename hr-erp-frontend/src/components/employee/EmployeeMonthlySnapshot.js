import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';
import { getCurrentSubmissionPeriodRange } from '../../utils/formSubmissionMonthBounds';

function formatHours(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function formatOtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatPeriodLabel(startDate, endDate, locale) {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

const EmployeeMonthlySnapshot = ({ refreshKey = 0, onLoaded }) => {
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const period = getCurrentSubmissionPeriodRange();

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({
        startDate: period.startDate,
        endDate: period.endDate
      }).toString();
      const res = await fetch(`${API_URL}/api/attendance/my-monthly-snapshot?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || t('employeeDashboard.snapshotError'));
      }
      setSnapshot(data);
      onLoadedRef.current?.(data);
    } catch (err) {
      setError(err.message || t('employeeDashboard.snapshotError'));
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [period.startDate, period.endDate, t]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot, refreshKey]);

  const periodLabel = formatPeriodLabel(
    snapshot?.startDate || period.startDate,
    snapshot?.endDate || period.endDate,
    i18n.language
  );

  const otRows = snapshot?.overtime?.rows || [];
  const absences = snapshot?.absences || {};
  const shortfall = snapshot?.shortfall || {};
  const otSummary = snapshot?.overtime?.summary || {};
  const hasPenalty = (absences.deduction || 0) > 0;

  return (
    <section className="ed-snapshot" aria-labelledby="ed-snapshot-title">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 id="ed-snapshot-title" className="ed-section-title">
          {t('employeeDashboard.monthlySnapshot')}
        </h2>
        <p className="ed-section-subtitle">
          {t('employeeDashboard.payPeriod')}: {periodLabel}
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner-elegant" />
        </div>
      )}

      {error && !loading && (
        <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto' }}>
          {error}
        </div>
      )}

      {!loading && !error && snapshot && (
        <>
          <div className="ed-snapshot-block">
            <h3 className="ed-snapshot-block-title">
              ⏱️ {t('employeeDashboard.myOvertime')}
            </h3>
            <div className="ed-metrics-row" style={{ marginBottom: '1rem' }}>
              <div className="ed-metric">
                <div className="ed-metric-label">{t('employeeDashboard.otApproved')}</div>
                <div className="ed-metric-value ed-metric-value--sm">
                  {formatHours(otSummary.totalApproved)}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.25rem' }}>
                    {t('forms.hours')}
                  </span>
                </div>
              </div>
              <div className="ed-metric">
                <div className="ed-metric-label">{t('employeeDashboard.otPayable')}</div>
                <div className="ed-metric-value ed-metric-value--sm ed-metric-value--success">
                  {formatHours(otSummary.totalFinalPayable)}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.25rem' }}>
                    {t('forms.hours')}
                  </span>
                </div>
              </div>
            </div>
            {otRows.length === 0 ? (
              <p className="ed-empty-hint">{t('employeeDashboard.noOtThisPeriod')}</p>
            ) : (
              otRows.map((row) => (
                <div key={row.otDateKey || row.otDate} className="ed-ot-row">
                  <div className="ed-ot-row-date">{formatOtDate(row.otDate)}</div>
                  <div className="ed-ot-row-meta">
                    {t('forms.requestedOtHours')}: <strong>{formatHours(row.requestedHours)}</strong>
                  </div>
                  <div className="ed-ot-row-meta">
                    {t('forms.approvedOtHours')}: <strong>{formatHours(row.approvedHours)}</strong>
                  </div>
                  <div className="ed-ot-row-meta">
                    {t('otReports.otReason')}:{' '}
                    <span className={row.hasOtFormSubmission === false ? 'ed-ot-row-meta--danger' : undefined}>
                      {row.otReason || t('otReports.noFormSubmittedReason')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="ed-snapshot-block">
            <h3 className="ed-snapshot-block-title">
              📋 {t('employeeDashboard.myAbsences')}
            </h3>
            <div className="ed-metrics-row">
              <div className="ed-metric">
                <div className="ed-metric-label">{t('employeeDashboard.absentDays')}</div>
                <div className="ed-metric-value">{absences.absentActual ?? 0}</div>
              </div>
              <div className="ed-metric">
                <div className="ed-metric-label">{t('employeeDashboard.variance')}</div>
                <div
                  className={`ed-metric-value ${
                    (absences.variance || 0) > 0 ? 'ed-metric-value--danger' : 'ed-metric-value--success'
                  }`}
                >
                  {(absences.variance || 0) > 0 ? '+' : ''}{absences.variance ?? 0}
                </div>
              </div>
              <div className="ed-metric">
                <div className="ed-metric-label">{t('employeeDashboard.penaltyDeduction')}</div>
                <div
                  className={`ed-metric-value ed-metric-value--sm ${
                    hasPenalty ? 'ed-metric-value--danger' : 'ed-metric-value--success'
                  }`}
                >
                  {hasPenalty
                    ? t('employeeDashboard.deductionDays', { days: absences.deduction })
                    : t('employeeDashboard.noDeduction')}
                </div>
              </div>
            </div>
            {absences.reason && absences.reason !== '—' && (
              <p className="ed-reason-text">{absences.reason}</p>
            )}
          </div>

          <div className="ed-snapshot-block">
            <h3 className="ed-snapshot-block-title">
              ⏰ {t('employeeDashboard.myShortfall')}
            </h3>
            <div className="ed-metric" style={{ maxWidth: '280px' }}>
              <div className="ed-metric-label">{t('employeeDashboard.totalLateness')}</div>
              <div className="ed-metric-value">
                {shortfall.totalLatenessMinutes ?? 0}
                <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.25rem' }}>
                  {t('employeeDashboard.minutes')}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default EmployeeMonthlySnapshot;
