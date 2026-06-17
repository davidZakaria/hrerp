import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { ReportPeriodFilter, useReportPeriodRange } from './ReportPeriodFilter';
import { REPORT_SCROLL_TABLE_CSS, ReportScrollTable } from './ReportTableNav';

function formatOtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = d.toISOString().slice(0, 10);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${iso} (${weekday})`;
}

function formatHours(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function varianceStyle(flag) {
  if (flag === 'positive') return { color: '#4ade80', fontWeight: 700 };
  if (flag === 'negative') return { color: '#f87171', fontWeight: 700 };
  return { color: '#e2e8f0', fontWeight: 600 };
}

const STAT_CARD = {
  padding: '1.25rem',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: '12px',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
};

const EmployeeOtReport = () => {
  const { t } = useTranslation();
  const {
    rangeStart,
    rangeEnd,
    selectedPeriod,
    applyPeriod,
    setRangeStart,
    setRangeEnd
  } = useReportPeriodRange();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/my-ot-report?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || t('employeeOtReport.fetchError'));
      }
      setReport(data);
    } catch (err) {
      setError(err.message || t('employeeOtReport.fetchError'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd, t]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = report?.summary || {
    totalFingerprint: 0,
    totalApproved: 0,
    totalFinalPayable: 0,
    totalVariance: 0
  };
  const rows = report?.detailed || [];
  const pendingCount = (report?.pendingManagerCount || 0) + (report?.pendingHrApprovalCount || 0);

  return (
    <div
      className="elegant-card employee-ot-report-section hover-lift"
      style={{
        marginTop: '2rem',
        padding: '0',
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid rgba(102, 126, 234, 0.25)'
      }}
    >
      <style>{`
        ${REPORT_SCROLL_TABLE_CSS}
        .employee-ot-report-section .ot-reconciliation-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .employee-ot-report-section .ot-reconciliation-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          font-weight: 600;
          padding: 12px 10px;
          border-bottom: 2px solid rgba(255,255,255,0.2);
          text-align: left;
        }
        .employee-ot-report-section .ot-reconciliation-table td {
          padding: 10px;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
        }
        .employee-ot-report-section .ot-reconciliation-table tr:nth-child(even) td {
          background: rgba(30, 41, 59, 0.85);
        }
        .employee-ot-report-section .ot-reconciliation-table tr:nth-child(odd) td {
          background: rgba(15, 23, 42, 0.85);
        }
        .employee-ot-report-section .report-panel {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          padding: 1.5rem;
        }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1.5rem 2rem',
          textAlign: 'center'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>⏱️ {t('employeeOtReport.title')}</h3>
        <p style={{ margin: '0.5rem 0 0', opacity: 0.92, fontSize: '0.95rem' }}>{t('employeeOtReport.subtitle')}</p>
      </div>

      <div style={{ padding: '1.5rem', background: '#f8f9fc' }}>
        <ReportPeriodFilter
          i18nPrefix="employeeOtReport"
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          selectedPeriod={selectedPeriod}
          applyPeriod={applyPeriod}
          setRangeStart={setRangeStart}
          setRangeEnd={setRangeEnd}
          onRefresh={fetchReport}
          loading={loading}
        />

        {error && (
          <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading && !report && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner-elegant" />
          </div>
        )}

        {report && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ ...STAT_CARD, border: '3px solid #667eea' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4338ca' }}>
                  {formatHours(summary.totalFingerprint)}
                </div>
                <div style={{ color: '#334155', fontWeight: 600, marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  {t('employeeOtReport.statFingerprint')}
                </div>
              </div>
              <div style={{ ...STAT_CARD, border: '3px solid #2196F3' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1565C0' }}>
                  {formatHours(summary.totalApproved)}
                </div>
                <div style={{ color: '#334155', fontWeight: 600, marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  {t('employeeOtReport.statApproved')}
                </div>
              </div>
              <div style={{ ...STAT_CARD, border: '3px solid #4CAF50' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2E7D32' }}>
                  {formatHours(summary.totalFinalPayable)}
                </div>
                <div style={{ color: '#334155', fontWeight: 600, marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  {t('employeeOtReport.statFinal')}
                </div>
              </div>
              <div style={{ ...STAT_CARD, border: '3px solid #FF9800' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#E65100' }}>
                  {summary.totalVariance > 0 ? '+' : ''}{formatHours(summary.totalVariance)}
                </div>
                <div style={{ color: '#334155', fontWeight: 600, marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  {t('employeeOtReport.statVariance')}
                </div>
              </div>
            </div>

            {pendingCount > 0 && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 152, 0, 0.12)',
                  border: '1px solid #FFB74D',
                  color: '#E65100',
                  fontWeight: 600
                }}
              >
                ⏳ {t('employeeOtReport.pendingNotice', { count: pendingCount })}
              </div>
            )}

            <div className="report-panel" style={{ borderRadius: '12px', opacity: loading ? 0.65 : 1 }}>
              <h4 style={{ margin: '0 0 1rem', color: '#93c5fd', fontSize: '1.05rem' }}>
                {t('employeeOtReport.dailyTitle')}
              </h4>
              {rows.length === 0 ? (
                <p style={{ color: '#94a3b8', margin: 0 }}>{t('employeeOtReport.noRows')}</p>
              ) : (
                <ReportScrollTable maxHeight={480}>
                  <table className="ot-reconciliation-table">
                    <thead>
                      <tr>
                        <th>{t('employeeOtReport.colDate')}</th>
                        <th>{t('employeeOtReport.colFingerprint')}</th>
                        <th>{t('employeeOtReport.colRequested')}</th>
                        <th>{t('employeeOtReport.colApproved')}</th>
                        <th>{t('employeeOtReport.colVariance')}</th>
                        <th>{t('employeeOtReport.colFinal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.rowKey || row.formId}>
                          <td>{formatOtDate(row.otDate)}</td>
                          <td>{formatHours(row.actualPunchingHours)}</td>
                          <td>{row.requestedHours != null ? formatHours(row.requestedHours) : '—'}</td>
                          <td>{formatHours(row.approvedHours)}</td>
                          <td style={varianceStyle(row.varianceFlag)}>
                            {row.variance > 0 ? '+' : ''}{formatHours(row.variance)}
                          </td>
                          <td style={{ color: '#4ade80', fontWeight: 600 }}>{formatHours(row.finalPayableHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 700, color: '#93c5fd', background: 'rgba(30, 58, 95, 0.9)' }}>
                          {t('employeeOtReport.totalRow')}
                        </td>
                        <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                          {formatHours(summary.totalFingerprint)}
                        </td>
                        <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>—</td>
                        <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                          {formatHours(summary.totalApproved)}
                        </td>
                        <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                          {summary.totalVariance > 0 ? '+' : ''}{formatHours(summary.totalVariance)}
                        </td>
                        <td style={{ color: '#4ade80', fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                          {formatHours(summary.totalFinalPayable)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </ReportScrollTable>
              )}
              <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                {t('employeeOtReport.footerNote')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeOtReport;
