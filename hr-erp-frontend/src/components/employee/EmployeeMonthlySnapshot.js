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

function StatBox({ label, value, valueClass = '' }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
      <div className="text-sm !text-slate-500 dark:!text-slate-400">{label}</div>
      <div className={`text-stat ${valueClass}`.trim()}>{value}</div>
    </div>
  );
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
  const variancePositive = (absences.variance || 0) > 0;

  return (
    <section
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
      aria-labelledby="ed-snapshot-title"
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 id="ed-snapshot-title" className="text-4xl font-bold !text-slate-900 dark:!text-white" style={{ fontSize: '1.25rem', margin: 0 }}>
          {t('employeeDashboard.monthlySnapshot')}
        </h2>
        <p className="text-sm !text-slate-500 dark:!text-slate-400" style={{ marginTop: '0.35rem' }}>
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
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="text-sm font-medium !text-slate-700 dark:!text-slate-200" style={{ marginBottom: '0.75rem', fontWeight: 700 }}>
              ⏱️ {t('employeeDashboard.myOvertime')}
            </h3>
            <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '1rem' }}>
              <StatBox
                label={t('employeeDashboard.otApproved')}
                value={`${formatHours(otSummary.totalApproved)} ${t('forms.hours')}`}
              />
              <StatBox
                label={t('employeeDashboard.otPayable')}
                value={`${formatHours(otSummary.totalFinalPayable)} ${t('forms.hours')}`}
                valueClass="text-stat--success"
              />
            </div>
            {otRows.length === 0 ? (
              <p className="text-sm !text-slate-500 dark:!text-slate-400">{t('employeeDashboard.noOtThisPeriod')}</p>
            ) : (
              otRows.map((row) => (
                <div
                  key={row.otDateKey || row.otDate}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700"
                  style={{ marginBottom: '0.5rem' }}
                >
                  <div className="text-sm font-medium !text-slate-900 dark:!text-white" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                    {formatOtDate(row.otDate)}
                  </div>
                  <div className="text-sm !text-slate-500 dark:!text-slate-400">
                    {t('forms.requestedOtHours')}: <span className="!text-slate-900 dark:!text-white">{formatHours(row.requestedHours)}</span>
                  </div>
                  <div className="text-sm !text-slate-500 dark:!text-slate-400">
                    {t('forms.approvedOtHours')}: <span className="!text-slate-900 dark:!text-white">{formatHours(row.approvedHours)}</span>
                  </div>
                  <div className="text-sm !text-slate-500 dark:!text-slate-400">
                    {t('otReports.otReason')}:{' '}
                    <span className={row.hasOtFormSubmission === false ? 'text-stat--danger' : '!text-slate-900 dark:!text-white'}>
                      {row.otReason || t('otReports.noFormSubmittedReason')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="text-sm font-medium !text-slate-700 dark:!text-slate-200" style={{ marginBottom: '0.75rem', fontWeight: 700 }}>
              📋 {t('employeeDashboard.myAbsences')}
            </h3>
            <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <StatBox label={t('employeeDashboard.absentDays')} value={absences.absentActual ?? 0} />
              <StatBox
                label={t('employeeDashboard.variance')}
                value={`${variancePositive ? '+' : ''}${absences.variance ?? 0}`}
                valueClass={variancePositive ? 'text-stat--danger' : 'text-stat--success'}
              />
              <StatBox
                label={t('employeeDashboard.penaltyDeduction')}
                value={hasPenalty ? t('employeeDashboard.deductionDays', { days: absences.deduction }) : t('employeeDashboard.noDeduction')}
                valueClass={hasPenalty ? 'text-stat--danger' : 'text-stat--success'}
              />
            </div>
            {absences.reason && absences.reason !== '—' && (
              <p className="text-sm !text-slate-500 dark:!text-slate-400" style={{ marginTop: '0.75rem', lineHeight: 1.5 }}>
                {absences.reason}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium !text-slate-700 dark:!text-slate-200" style={{ marginBottom: '0.75rem', fontWeight: 700 }}>
              ⏰ {t('employeeDashboard.myShortfall')}
            </h3>
            <StatBox
              label={t('employeeDashboard.totalLateness')}
              value={`${shortfall.totalLatenessMinutes ?? 0} ${t('employeeDashboard.minutes')}`}
            />
          </div>
        </>
      )}
    </section>
  );
};

export default EmployeeMonthlySnapshot;
