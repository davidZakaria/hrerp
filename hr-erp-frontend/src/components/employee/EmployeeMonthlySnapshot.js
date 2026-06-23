import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';
import { getCurrentSubmissionPeriodRange } from '../../utils/formSubmissionMonthBounds';
import { otRowCardStyle, sectionCardStyle, snapshotMetricStyle } from './employeeDashboardStyles';

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
      onLoaded?.(data);
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

  return (
    <section style={sectionCardStyle}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
            {t('employeeDashboard.monthlySnapshot')}
          </h2>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            {t('employeeDashboard.payPeriod')}: {periodLabel}
          </p>
        </div>
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
          {/* Overtime */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem', fontWeight: 700, color: '#334155' }}>
              ⏱️ {t('employeeDashboard.myOvertime')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={snapshotMetricStyle}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.otApproved')}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1565c0' }}>
                  {formatHours(otSummary.totalApproved)} {t('forms.hours')}
                </div>
              </div>
              <div style={snapshotMetricStyle}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.otPayable')}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2e7d32' }}>
                  {formatHours(otSummary.totalFinalPayable)} {t('forms.hours')}
                </div>
              </div>
            </div>
            {otRows.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                {t('employeeDashboard.noOtThisPeriod')}
              </p>
            ) : (
              otRows.map((row) => (
                <div key={row.otDateKey || row.otDate} style={otRowCardStyle}>
                  <div style={{ flex: '1 1 120px', fontWeight: 600, color: '#334155' }}>
                    {formatOtDate(row.otDate)}
                  </div>
                  <div style={{ flex: '0 1 auto', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>{t('forms.requestedOtHours')}: </span>
                    <strong>{formatHours(row.requestedHours)}</strong>
                  </div>
                  <div style={{ flex: '0 1 auto', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>{t('forms.approvedOtHours')}: </span>
                    <strong style={{ color: '#2e7d32' }}>{formatHours(row.approvedHours)}</strong>
                  </div>
                  <div style={{ flex: '1 1 200px', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>{t('otReports.otReason')}: </span>
                    <span
                      style={{
                        fontStyle: row.hasOtFormSubmission === false ? 'italic' : 'normal',
                        color: row.hasOtFormSubmission === false ? '#c62828' : '#475569'
                      }}
                    >
                      {row.otReason || t('otReports.noFormSubmittedReason')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Absences */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem', fontWeight: 700, color: '#334155' }}>
              📋 {t('employeeDashboard.myAbsences')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={snapshotMetricStyle}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.absentDays')}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#334155' }}>
                  {absences.absentActual ?? 0}
                </div>
              </div>
              <div style={snapshotMetricStyle}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.variance')}</div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: (absences.variance || 0) > 0 ? '#c62828' : '#2e7d32'
                  }}
                >
                  {(absences.variance || 0) > 0 ? '+' : ''}{absences.variance ?? 0}
                </div>
              </div>
              <div style={snapshotMetricStyle}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.penaltyDeduction')}</div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: (absences.deduction || 0) > 0 ? '#c62828' : '#64748b'
                  }}
                >
                  {(absences.deduction || 0) > 0
                    ? t('employeeDashboard.deductionDays', { days: absences.deduction })
                    : t('employeeDashboard.noDeduction')}
                </div>
              </div>
            </div>
            {absences.reason && absences.reason !== '—' && (
              <p style={{ margin: '0.85rem 0 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                {absences.reason}
              </p>
            )}
          </div>

          {/* Shortfall */}
          <div>
            <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.05rem', fontWeight: 700, color: '#334155' }}>
              ⏰ {t('employeeDashboard.myShortfall')}
            </h3>
            <div style={{ ...snapshotMetricStyle, maxWidth: '280px' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{t('employeeDashboard.totalLateness')}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#e65100' }}>
                {shortfall.totalLatenessMinutes ?? 0} {t('employeeDashboard.minutes')}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default EmployeeMonthlySnapshot;
