import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { ReportPeriodFilter, useReportPeriodRange } from './ReportPeriodFilter';
import { ReportScrollTable } from './ReportTableNav';
import { varianceMobileClass } from '../utils/otVarianceStyle';
import '../styles/employeeOtReport.css';

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

function varianceStatClass(value) {
  if (value > 0.004) return 'eot-stat-value--variance-pos';
  if (value < -0.004) return 'eot-stat-value--variance-neg';
  return 'eot-stat-value--variance-zero';
}

function varianceCellClass(flag) {
  if (flag === 'positive') return 'eot-variance-pos';
  if (flag === 'negative') return 'eot-variance-neg';
  return 'eot-variance-zero';
}

function varianceTotalClass(value) {
  if (value > 0.004) return 'eot-variance-pos';
  if (value < -0.004) return 'eot-variance-neg';
  return 'eot-variance-zero';
}

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
    <section className="eot-report" aria-labelledby="eot-report-title">
      <div className="eot-report-inner">
        <header className="eot-report-header">
          <h3 id="eot-report-title" className="eot-report-title">
            ⏱️ {t('employeeOtReport.title')}
          </h3>
          <p className="eot-report-subtitle">{t('employeeOtReport.subtitle')}</p>
        </header>

        <ReportPeriodFilter
          variant="sleek"
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
            <div className="eot-stat-grid">
              <div className="eot-stat-card">
                <div className="eot-stat-value">{formatHours(summary.totalFingerprint)}</div>
                <div className="eot-stat-label">{t('employeeOtReport.statFingerprint')}</div>
              </div>
              <div className="eot-stat-card">
                <div className="eot-stat-value">{formatHours(summary.totalApproved)}</div>
                <div className="eot-stat-label">{t('employeeOtReport.statApproved')}</div>
              </div>
              <div className="eot-stat-card">
                <div className="eot-stat-value">{formatHours(summary.totalFinalPayable)}</div>
                <div className="eot-stat-label">{t('employeeOtReport.statFinal')}</div>
              </div>
              <div className="eot-stat-card">
                <div
                  className={`eot-stat-value ${varianceStatClass(summary.totalVariance)}`}
                >
                  {summary.totalVariance > 0 ? '+' : ''}{formatHours(summary.totalVariance)}
                </div>
                <div className="eot-stat-label">{t('employeeOtReport.statVariance')}</div>
              </div>
            </div>

            {pendingCount > 0 && (
              <div className="eot-pending-notice">
                ⏳ {t('employeeOtReport.pendingNotice', { count: pendingCount })}
              </div>
            )}

            <div className="eot-daily-section" style={{ opacity: loading ? 0.65 : 1 }}>
              <h4 className="eot-daily-title">{t('employeeOtReport.dailyTitle')}</h4>
              {rows.length === 0 ? (
                <p className="eot-empty">{t('employeeOtReport.noRows')}</p>
              ) : (
                <div className="has-mobile-cards">
                  <div className="mobile-data-cards">
                    {rows.map((row) => (
                      <article key={row.rowKey || row.formId} className="mobile-data-card">
                        <div className="mobile-data-card-title">{formatOtDate(row.otDate)}</div>
                        <div className="mobile-data-card-row">
                          <span>{t('employeeOtReport.colFingerprint')}</span>
                          <span>{formatHours(row.actualPunchingHours)}</span>
                        </div>
                        <div className="mobile-data-card-row">
                          <span>{t('employeeOtReport.colRequested')}</span>
                          <span>{row.requestedHours != null ? formatHours(row.requestedHours) : '—'}</span>
                        </div>
                        <div className="mobile-data-card-row">
                          <span>{t('employeeOtReport.colApproved')}</span>
                          <span>{formatHours(row.approvedHours)}</span>
                        </div>
                        <div className="mobile-data-card-row">
                          <span>{t('employeeOtReport.colVariance')}</span>
                          <span className={varianceMobileClass(row.varianceFlag)}>
                            {row.variance > 0 ? '+' : ''}{formatHours(row.variance)}
                          </span>
                        </div>
                        <div className="mobile-data-card-row">
                          <span>{t('employeeOtReport.colFinal')}</span>
                          <span className="eot-final-positive">{formatHours(row.finalPayableHours)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="desktop-only-table">
                    <ReportScrollTable maxHeight={480}>
                      <div className="eot-table-wrap">
                        <table className="eot-table">
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
                                <td className={varianceCellClass(row.varianceFlag)}>
                                  {row.variance > 0 ? '+' : ''}{formatHours(row.variance)}
                                </td>
                                <td className="eot-final-positive">{formatHours(row.finalPayableHours)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td>{t('employeeOtReport.totalRow')}</td>
                              <td>{formatHours(summary.totalFingerprint)}</td>
                              <td>—</td>
                              <td>{formatHours(summary.totalApproved)}</td>
                              <td className={varianceTotalClass(summary.totalVariance)}>
                                {summary.totalVariance > 0 ? '+' : ''}{formatHours(summary.totalVariance)}
                              </td>
                              <td className="eot-final-positive">{formatHours(summary.totalFinalPayable)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </ReportScrollTable>
                  </div>
                </div>
              )}
              <p className="eot-footer-note">{t('employeeOtReport.footerNote')}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default EmployeeOtReport;
