import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

function formatOtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatOtDateDetailed(value) {
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

const OtReconciliationReports = () => {
  const { t } = useTranslation();
  const defaults = getDefaultDateRange();
  const [rangeStart, setRangeStart] = useState(defaults.startDate);
  const [rangeEnd, setRangeEnd] = useState(defaults.endDate);
  const [activeView, setActiveView] = useState('detailed');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterVariance, setFilterVariance] = useState('all');
  const [filterForm, setFilterForm] = useState('all');

  const fetchReport = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/ot-reconciliation?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Failed to load OT reconciliation report');
      }
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load OT reconciliation report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportFinalToCsv = () => {
    const rows = report?.final || [];
    if (!rows.length) {
      alert(t('otReports.noDataToExport'));
      return;
    }

    const headers = [
      t('otReports.employeeCode'),
      t('otReports.employeeName'),
      t('otReports.department'),
      t('otReports.otDate'),
      t('otReports.finalOtHrs')
    ];

    const csvRows = rows.map((row) => [
      row.employeeCode || '',
      row.employeeName || '',
      row.department || '',
      formatOtDate(row.otDate),
      formatHours(row.finalPayableHours)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) =>
        row.map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `final_ot_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const detailedRows = report?.detailed || [];
  const finalRows = report?.final || [];

  const departmentOptions = useMemo(() => {
    const depts = new Set();
    detailedRows.forEach((row) => {
      if (row.department) depts.add(row.department);
    });
    return Array.from(depts).sort((a, b) => a.localeCompare(b));
  }, [detailedRows]);

  const filteredDetailedRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return detailedRows.filter((row) => {
      if (filterDepartment && row.department !== filterDepartment) return false;
      if (filterVariance === 'positive' && row.varianceFlag !== 'positive') return false;
      if (filterVariance === 'negative' && row.varianceFlag !== 'negative') return false;
      if (filterVariance === 'neutral' && row.varianceFlag !== 'neutral') return false;
      if (filterForm === 'with' && !row.hasApprovedForm) return false;
      if (filterForm === 'without' && row.hasApprovedForm) return false;
      if (q) {
        const code = String(row.employeeCode || '').toLowerCase();
        const name = String(row.employeeName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [detailedRows, filterSearch, filterDepartment, filterVariance, filterForm]);

  const hasActiveFilters = filterSearch || filterDepartment || filterVariance !== 'all' || filterForm !== 'all';

  const clearDetailedFilters = () => {
    setFilterSearch('');
    setFilterDepartment('');
    setFilterVariance('all');
    setFilterForm('all');
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <style>{`
        .ot-reconciliation-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .ot-reconciliation-table th {
          background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
          color: #ffffff;
          font-weight: 600;
          padding: 12px 10px;
          border-bottom: 2px solid #3b82f6;
          text-align: left;
        }
        .ot-reconciliation-table td {
          padding: 10px;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
        }
        .ot-reconciliation-table tr:nth-child(even) td {
          background: rgba(30, 41, 59, 0.7);
        }
        .ot-reconciliation-table tr:nth-child(odd) td {
          background: rgba(15, 23, 42, 0.7);
        }
      `}</style>

      <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>{t('otReports.title')}</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{t('otReports.subtitle')}</p>

      <div className="elegant-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label-elegant">{t('otReports.startDate')}</label>
            <input
              type="date"
              className="form-input-elegant"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label-elegant">{t('otReports.endDate')}</label>
            <input
              type="date"
              className="form-input-elegant"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>
          <button type="button" className="btn-elegant btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? t('otReports.loading') : t('otReports.refresh')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn-elegant ${activeView === 'detailed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('detailed')}
        >
          {t('otReports.detailedTab')}
        </button>
        <button
          type="button"
          className={`btn-elegant ${activeView === 'final' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveView('final')}
        >
          {t('otReports.finalTab')}
        </button>
        {activeView === 'final' && (
          <button type="button" className="btn-elegant btn-success" onClick={exportFinalToCsv} disabled={!finalRows.length}>
            {t('otReports.exportExcel')}
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>
      )}

      {loading && !report && (
        <div style={{ color: '#94a3b8' }}>{t('otReports.loading')}</div>
      )}

      {report && activeView === 'detailed' && (
        <div className="elegant-card" style={{ overflowX: 'auto', opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#f1f5f9' }}>
              {t('otReports.detailedTitle')}
              {loading && <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('otReports.loading')}</span>}
            </h3>
            {detailedRows.length > 0 && (
              <button
                type="button"
                className={`btn-elegant ${showExtendedDetails ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowExtendedDetails((v) => !v)}
              >
                {showExtendedDetails ? t('otReports.simpleView') : t('otReports.moreDetails')}
              </button>
            )}
          </div>
          {detailedRows.length > 0 && (
            <div className="elegant-card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
                  <label className="form-label-elegant">{t('otReports.filterSearch')}</label>
                  <input
                    type="text"
                    className="form-input-elegant"
                    placeholder={t('otReports.filterSearchPlaceholder')}
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label className="form-label-elegant">{t('otReports.filterDepartment')}</label>
                  <select
                    className="form-input-elegant"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <option value="">{t('otReports.filterAllDepartments')}</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label className="form-label-elegant">{t('otReports.filterVariance')}</label>
                  <select
                    className="form-input-elegant"
                    value={filterVariance}
                    onChange={(e) => setFilterVariance(e.target.value)}
                  >
                    <option value="all">{t('otReports.filterAll')}</option>
                    <option value="positive">{t('otReports.filterVariancePositive')}</option>
                    <option value="negative">{t('otReports.filterVarianceNegative')}</option>
                    <option value="neutral">{t('otReports.filterVarianceNeutral')}</option>
                  </select>
                </div>
                <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label className="form-label-elegant">{t('otReports.filterForm')}</label>
                  <select
                    className="form-input-elegant"
                    value={filterForm}
                    onChange={(e) => setFilterForm(e.target.value)}
                  >
                    <option value="all">{t('otReports.filterAll')}</option>
                    <option value="with">{t('otReports.filterWithForm')}</option>
                    <option value="without">{t('otReports.filterWithoutForm')}</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <button type="button" className="btn-elegant btn-secondary" onClick={clearDetailedFilters}>
                    {t('otReports.clearFilters')}
                  </button>
                )}
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                {t('otReports.filterShowing', { shown: filteredDetailedRows.length, total: detailedRows.length })}
              </p>
            </div>
          )}
          {detailedRows.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>
              <p>{t('otReports.noRows')}</p>
              {report.pendingHrApprovalCount > 0 && (
                <p style={{ color: '#fbbf24', marginTop: '0.75rem' }}>
                  {t('otReports.pendingHrCount', { count: report.pendingHrApprovalCount })}
                </p>
              )}
              {report.totalOtRequestsInRange > 0 && report.pendingHrApprovalCount === 0 && (
                <p style={{ marginTop: '0.75rem' }}>{t('otReports.otExistsNotApproved')}</p>
              )}
              <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem' }}>
                <li>{t('otReports.emptyHint1')}</li>
                <li>{t('otReports.emptyHint2')}</li>
                <li>{t('otReports.emptyHint3')}</li>
              </ul>
            </div>
          ) : filteredDetailedRows.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>
              <p>{t('otReports.noFilterResults')}</p>
              <button type="button" className="btn-elegant btn-secondary" onClick={clearDetailedFilters}>
                {t('otReports.clearFilters')}
              </button>
            </div>
          ) : (
            <table className="ot-reconciliation-table">
              <thead>
                <tr>
                  <th>{t('otReports.employeeCode')}</th>
                  <th>{t('otReports.employeeName')}</th>
                  <th>{t('otReports.department')}</th>
                  <th>{t('otReports.otDate')}</th>
                  {showExtendedDetails && (
                    <>
                      <th>{t('otReports.workday')}</th>
                      <th>{t('otReports.clockIn')}</th>
                      <th>{t('otReports.clockOut')}</th>
                      <th>{t('otReports.totalHours')}</th>
                      <th>{t('otReports.otMinutes')}</th>
                    </>
                  )}
                  <th>{t('otReports.fingerprintActuals')}</th>
                  {showExtendedDetails && (
                    <>
                      <th>{t('otReports.requestedOt')}</th>
                      <th>{t('otReports.hasForm')}</th>
                    </>
                  )}
                  <th>{t('otReports.approvedOt')}</th>
                  <th>{t('otReports.variance')}</th>
                  {showExtendedDetails && (
                    <th>{t('otReports.finalOtPreview')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDetailedRows.map((row) => (
                  <tr key={row.rowKey || row.formId}>
                    <td>{row.employeeCode || '—'}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.department}</td>
                    <td>{showExtendedDetails ? formatOtDateDetailed(row.otDate) : formatOtDate(row.otDate)}</td>
                    {showExtendedDetails && (
                      <>
                        <td>{row.isWorkday ? t('otReports.yes') : t('otReports.no')}</td>
                        <td>{row.clockIn || '—'}</td>
                        <td>{row.clockOut || '—'}</td>
                        <td>{row.totalPunchedHours != null ? formatHours(row.totalPunchedHours) : '—'}</td>
                        <td>{row.clockIn && row.clockOut ? String(row.otMinutes ?? 0) : '—'}</td>
                      </>
                    )}
                    <td>{formatHours(row.actualPunchingHours)}</td>
                    {showExtendedDetails && (
                      <>
                        <td>{row.requestedHours != null ? formatHours(row.requestedHours) : '—'}</td>
                        <td>{row.hasApprovedForm ? t('otReports.yes') : t('otReports.no')}</td>
                      </>
                    )}
                    <td>{formatHours(row.approvedHours)}</td>
                    <td style={varianceStyle(row.varianceFlag)}>
                      {row.variance > 0 ? '+' : ''}{formatHours(row.variance)}
                    </td>
                    {showExtendedDetails && (
                      <td style={{ color: '#4ade80', fontWeight: 600 }}>{formatHours(row.finalPayableHours)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {report && activeView === 'final' && (
        <div className="elegant-card" style={{ overflowX: 'auto', opacity: loading ? 0.6 : 1 }}>
          <h3 style={{ marginBottom: '1rem', color: '#f1f5f9' }}>
            {t('otReports.finalTitle')}
            {loading && <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>{t('otReports.loading')}</span>}
          </h3>
          {finalRows.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>
              <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem' }}>{t('otReports.noFinalRows')}</p>
              <div style={{
                background: 'rgba(30, 58, 95, 0.5)',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#93c5fd', fontWeight: 600, marginBottom: '0.75rem' }}>{t('otReports.finalStatusTitle')}</p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  {(report.fingerprintOtDays ?? 0) > 0 && (
                    <li>{t('otReports.statFingerprintDays', { count: report.fingerprintOtDays })}</li>
                  )}
                  <li>{t('otReports.statOtRequestsSubmitted', { count: report.totalOtRequestsInRange ?? 0 })}</li>
                  {(report.pendingManagerCount ?? 0) > 0 && (
                    <li style={{ color: '#fbbf24' }}>{t('otReports.statPendingManager', { count: report.pendingManagerCount })}</li>
                  )}
                  {(report.pendingHrApprovalCount ?? 0) > 0 && (
                    <li style={{ color: '#fbbf24' }}>{t('otReports.statPendingHr', { count: report.pendingHrApprovalCount })}</li>
                  )}
                  {(report.hrApprovedFormCount ?? 0) > 0 && (
                    <li>{t('otReports.statHrApproved', { count: report.hrApprovedFormCount })}</li>
                  )}
                </ul>
                {(report.totalOtRequestsInRange ?? 0) === 0 && (report.fingerprintOtDays ?? 0) > 0 && (
                  <p style={{ color: '#fbbf24', marginTop: '0.75rem', marginBottom: 0 }}>{t('otReports.statNoFormsYet')}</p>
                )}
                {(report.pendingHrApprovalCount ?? 0) > 0 && (
                  <p style={{ color: '#4ade80', marginTop: '0.75rem', marginBottom: 0 }}>{t('otReports.statGoApprove')}</p>
                )}
              </div>
              <ul style={{ paddingLeft: '1.25rem' }}>
                <li>{t('otReports.finalHint1')}</li>
                <li>{t('otReports.finalHint2')}</li>
              </ul>
            </div>
          ) : (
            <table className="ot-reconciliation-table">
              <thead>
                <tr>
                  <th>{t('otReports.employeeCode')}</th>
                  <th>{t('otReports.employeeName')}</th>
                  <th>{t('otReports.department')}</th>
                  <th>{t('otReports.otDate')}</th>
                  <th>{t('otReports.finalOtHrs')}</th>
                </tr>
              </thead>
              <tbody>
                {finalRows.map((row) => (
                  <tr key={row.rowKey || row.formId}>
                    <td>{row.employeeCode || '—'}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.department}</td>
                    <td>{formatOtDate(row.otDate)}</td>
                    <td style={{ color: '#4ade80', fontWeight: 700 }}>{formatHours(row.finalPayableHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default OtReconciliationReports;
