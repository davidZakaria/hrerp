import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { ReportPeriodFilter, useReportPeriodRange } from './ReportPeriodFilter';
import {
  REPORT_SCROLL_TABLE_CSS,
  ReportNestedTable,
  ReportPaginationBar,
  ReportScrollTable,
  ReportViewModeToggle,
  useAutoExpandSingleEmployee,
  useReportPagination
} from './ReportTableNav';
import { varianceStyle, varianceTotalStyle } from '../utils/otVarianceStyle';

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

const OtReconciliationReports = () => {
  const { t } = useTranslation();
  const {
    rangeStart,
    rangeEnd,
    selectedPeriod,
    applyPeriod,
    setRangeStart,
    setRangeEnd
  } = useReportPeriodRange();
  const [activeView, setActiveView] = useState('detailed');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterVariance, setFilterVariance] = useState('all');
  const [filterForm, setFilterForm] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMinFp, setFilterMinFp] = useState('');
  const [filterMinVariance, setFilterMinVariance] = useState('');
  const [filterWorkday, setFilterWorkday] = useState('all');
  const [detailViewMode, setDetailViewMode] = useState('employees');
  const [expandedEmployees, setExpandedEmployees] = useState(() => new Set());

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

  const csvLine = (cells) => cells.map((cell) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');

  const downloadCsv = (lines, filenamePrefix) => {
    // BOM so Excel renders Arabic characters correctly
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportFinalToCsv = () => {
    const rows = report?.final || [];
    if (!rows.length) {
      alert(t('otReports.noDataToExport'));
      return;
    }

    const headers = [
      t('otReports.employeeCode'),
      t('otReports.employeeName'),
      t('otReports.jobTitle'),
      t('otReports.location'),
      t('otReports.department'),
      t('otReports.otDate'),
      t('otReports.finalOtHrs')
    ];

    const csvRows = rows.map((row) => [
      row.employeeCode || '',
      row.employeeName || '',
      row.jobTitle || '',
      row.location || '',
      row.department || '',
      formatOtDate(row.otDate),
      formatHours(row.finalPayableHours)
    ]);

    downloadCsv([csvLine(headers), ...csvRows.map(csvLine)], 'final_ot_report');
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
    const minFp = filterMinFp === '' ? null : Number(filterMinFp);
    const minVariance = filterMinVariance === '' ? null : Number(filterMinVariance);
    const rowDateKey = (row) => {
      if (row.otDateKey) return row.otDateKey;
      if (!row.otDate) return '';
      const d = new Date(row.otDate);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    };
    return detailedRows.filter((row) => {
      if (filterDepartment && row.department !== filterDepartment) return false;
      if (filterVariance === 'positive' && row.varianceFlag !== 'positive') return false;
      if (filterVariance === 'negative' && row.varianceFlag !== 'negative') return false;
      if (filterVariance === 'neutral' && row.varianceFlag !== 'neutral') return false;
      if (filterForm === 'with' && !row.hasApprovedForm) return false;
      if (filterForm === 'without' && row.hasApprovedForm) return false;
      if (filterDateFrom || filterDateTo) {
        const key = rowDateKey(row);
        if (filterDateFrom && (!key || key < filterDateFrom)) return false;
        if (filterDateTo && (!key || key > filterDateTo)) return false;
      }
      if (minFp != null && !Number.isNaN(minFp) && Number(row.actualPunchingHours || 0) < minFp) return false;
      if (minVariance != null && !Number.isNaN(minVariance) && Math.abs(Number(row.variance || 0)) < minVariance) return false;
      if (filterWorkday === 'workday' && !row.isWorkday) return false;
      if (filterWorkday === 'nonworkday' && row.isWorkday) return false;
      if (q) {
        const code = String(row.employeeCode || '').toLowerCase();
        const name = String(row.employeeName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [
    detailedRows, filterSearch, filterDepartment, filterVariance, filterForm,
    filterDateFrom, filterDateTo, filterMinFp, filterMinVariance, filterWorkday
  ]);

  const employeeTotals = useMemo(() => {
    const map = new Map();
    filteredDetailedRows.forEach((row) => {
      const key = row.employeeCode || row.employeeId || row.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          key,
          employeeCode: row.employeeCode || '',
          employeeName: row.employeeName || '',
          department: row.department || '',
          jobTitle: row.jobTitle || '',
          location: row.location || '',
          days: 0,
          workdays: 0,
          totalPunched: 0,
          totalFingerprint: 0,
          totalRequested: 0,
          daysWithForm: 0,
          totalApproved: 0,
          totalVariance: 0,
          totalFinalPayable: 0,
          rows: []
        });
      }
      const agg = map.get(key);
      agg.rows.push(row);
      agg.days += 1;
      if (row.isWorkday) agg.workdays += 1;
      agg.totalPunched += Number(row.totalPunchedHours || 0);
      agg.totalFingerprint += Number(row.actualPunchingHours || 0);
      agg.totalRequested += Number(row.requestedHours || 0);
      if (row.hasApprovedForm) agg.daysWithForm += 1;
      agg.totalApproved += Number(row.approvedHours || 0);
      agg.totalVariance += Number(row.variance || 0);
      agg.totalFinalPayable += Number(row.finalPayableHours || 0);
    });
    const list = Array.from(map.values()).sort((a, b) => b.totalVariance - a.totalVariance);
    list.forEach((emp) => {
      emp.rows.sort((a, b) => new Date(a.otDate) - new Date(b.otDate));
    });
    return list;
  }, [filteredDetailedRows]);

  const grandTotals = useMemo(() => employeeTotals.reduce(
    (acc, emp) => ({
      days: acc.days + emp.days,
      workdays: acc.workdays + emp.workdays,
      totalPunched: acc.totalPunched + emp.totalPunched,
      totalFingerprint: acc.totalFingerprint + emp.totalFingerprint,
      totalRequested: acc.totalRequested + emp.totalRequested,
      daysWithForm: acc.daysWithForm + emp.daysWithForm,
      totalApproved: acc.totalApproved + emp.totalApproved,
      totalVariance: acc.totalVariance + emp.totalVariance,
      totalFinalPayable: acc.totalFinalPayable + emp.totalFinalPayable
    }),
    {
      days: 0, workdays: 0, totalPunched: 0, totalFingerprint: 0, totalRequested: 0,
      daysWithForm: 0, totalApproved: 0, totalVariance: 0, totalFinalPayable: 0
    }
  ), [employeeTotals]);

  const empPagination = useReportPagination(employeeTotals, 15);
  const dailyPagination = useReportPagination(filteredDetailedRows, 25);

  useAutoExpandSingleEmployee(employeeTotals, filterSearch, expandedEmployees, setExpandedEmployees);

  const hasActiveFilters = Boolean(
    filterSearch || filterDepartment || filterVariance !== 'all' || filterForm !== 'all' ||
    filterDateFrom || filterDateTo || filterMinFp !== '' || filterMinVariance !== '' || filterWorkday !== 'all'
  );

  const clearDetailedFilters = () => {
    setFilterSearch('');
    setFilterDepartment('');
    setFilterVariance('all');
    setFilterForm('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMinFp('');
    setFilterMinVariance('');
    setFilterWorkday('all');
  };

  const exportDetailedToCsv = () => {
    if (!filteredDetailedRows.length) {
      alert(t('otReports.noDataToExport'));
      return;
    }

    const csvDateOf = (row) => {
      if (row.otDateKey) return row.otDateKey;
      if (!row.otDate) return '';
      const d = new Date(row.otDate);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    };

    const yes = t('otReports.yes');
    const no = t('otReports.no');

    const dailyHeaders = [
      t('otReports.employeeCode'),
      t('otReports.employeeName'),
      t('otReports.jobTitle'),
      t('otReports.location'),
      t('otReports.department'),
      t('otReports.otDate'),
      t('otReports.workday'),
      t('otReports.clockIn'),
      t('otReports.clockOut'),
      t('otReports.totalHours'),
      t('otReports.fingerprintActuals'),
      t('otReports.requestedOt'),
      t('otReports.hasForm'),
      t('otReports.approvedOt'),
      t('otReports.variance'),
      t('otReports.finalOtPreview')
    ];

    const dailyLines = filteredDetailedRows.map((row) => csvLine([
      row.employeeCode || '',
      row.employeeName || '',
      row.jobTitle || '',
      row.location || '',
      row.department || '',
      csvDateOf(row),
      row.isWorkday ? yes : no,
      row.clockIn || '',
      row.clockOut || '',
      row.totalPunchedHours != null ? formatHours(row.totalPunchedHours) : '',
      formatHours(row.actualPunchingHours),
      row.requestedHours != null ? formatHours(row.requestedHours) : '',
      row.hasApprovedForm ? yes : no,
      formatHours(row.approvedHours),
      formatHours(row.variance),
      formatHours(row.finalPayableHours)
    ]));

    const totalsHeaders = [
      t('otReports.employeeCode'),
      t('otReports.employeeName'),
      t('otReports.jobTitle'),
      t('otReports.location'),
      t('otReports.department'),
      t('otReports.totalWorkdays'),
      t('otReports.totalPunchedHours'),
      t('otReports.totalFingerprintOt'),
      t('otReports.totalRequestedOt'),
      t('otReports.daysWithForm'),
      t('otReports.totalApprovedOt'),
      t('otReports.totalVariance'),
      t('otReports.totalFinalOt')
    ];

    const totalsLines = employeeTotals.map((emp) => csvLine([
      emp.employeeCode || '',
      emp.employeeName || '',
      emp.jobTitle || '',
      emp.location || '',
      emp.department || '',
      emp.workdays,
      formatHours(emp.totalPunched),
      formatHours(emp.totalFingerprint),
      formatHours(emp.totalRequested),
      emp.daysWithForm,
      formatHours(emp.totalApproved),
      formatHours(emp.totalVariance),
      formatHours(emp.totalFinalPayable)
    ]));

    const grandTotalLine = csvLine([
      '',
      '',
      '',
      '',
      t('otReports.grandTotal', { count: employeeTotals.length }),
      grandTotals.workdays,
      formatHours(grandTotals.totalPunched),
      formatHours(grandTotals.totalFingerprint),
      formatHours(grandTotals.totalRequested),
      grandTotals.daysWithForm,
      formatHours(grandTotals.totalApproved),
      formatHours(grandTotals.totalVariance),
      formatHours(grandTotals.totalFinalPayable)
    ]);

    downloadCsv([
      t('otReports.dailyBreakdownTitle'),
      csvLine(dailyHeaders),
      ...dailyLines,
      '',
      t('otReports.employeeTotalsTitle'),
      csvLine(totalsHeaders),
      ...totalsLines,
      grandTotalLine
    ], 'detailed_ot_report');
  };

  const toggleEmployeeExpanded = (key) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allExpanded = employeeTotals.length > 0 && employeeTotals.every((emp) => expandedEmployees.has(emp.key));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedEmployees(new Set());
    } else {
      setExpandedEmployees(new Set(employeeTotals.map((emp) => emp.key)));
    }
  };

  const totalsColSpan = showExtendedDetails ? 13 : 9;

  return (
    <div style={{ marginTop: '2rem' }}>
      <style>{`
        ${REPORT_SCROLL_TABLE_CSS}
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

      <ReportPeriodFilter
        i18nPrefix="otReports"
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        selectedPeriod={selectedPeriod}
        applyPeriod={applyPeriod}
        setRangeStart={setRangeStart}
        setRangeEnd={setRangeEnd}
        onRefresh={fetchReport}
        loading={loading}
      />

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
        {activeView === 'detailed' && (
          <button type="button" className="btn-elegant btn-success" onClick={exportDetailedToCsv} disabled={!filteredDetailedRows.length}>
            {t('otReports.exportExcel')}
          </button>
        )}
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
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <ReportViewModeToggle
                  viewMode={detailViewMode}
                  setViewMode={setDetailViewMode}
                  i18nPrefix="otReports"
                  t={t}
                />
                <button
                  type="button"
                  className={`btn-elegant ${showExtendedDetails ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowExtendedDetails((v) => !v)}
                >
                  {showExtendedDetails ? t('otReports.simpleView') : t('otReports.moreDetails')}
                </button>
              </div>
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
                <button
                  type="button"
                  className={`btn-elegant ${showAdvancedFilters ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                >
                  {showAdvancedFilters ? t('otReports.hideAdvancedFilters') : t('otReports.advancedFilters')}
                </button>
                {hasActiveFilters && (
                  <button type="button" className="btn-elegant btn-secondary" onClick={clearDetailedFilters}>
                    {t('otReports.clearFilters')}
                  </button>
                )}
              </div>
              {showAdvancedFilters && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end',
                  marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155'
                }}>
                  <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                    <label className="form-label-elegant">{t('otReports.filterDateFrom')}</label>
                    <input
                      type="date"
                      className="form-input-elegant"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                    <label className="form-label-elegant">{t('otReports.filterDateTo')}</label>
                    <input
                      type="date"
                      className="form-input-elegant"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                    <label className="form-label-elegant">{t('otReports.filterMinFp')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="form-input-elegant"
                      placeholder="0.00"
                      value={filterMinFp}
                      onChange={(e) => setFilterMinFp(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                    <label className="form-label-elegant">{t('otReports.filterMinVariance')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="form-input-elegant"
                      placeholder="0.00"
                      value={filterMinVariance}
                      onChange={(e) => setFilterMinVariance(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                    <label className="form-label-elegant">{t('otReports.filterWorkday')}</label>
                    <select
                      className="form-input-elegant"
                      value={filterWorkday}
                      onChange={(e) => setFilterWorkday(e.target.value)}
                    >
                      <option value="all">{t('otReports.filterAll')}</option>
                      <option value="workday">{t('otReports.filterWorkdayOnly')}</option>
                      <option value="nonworkday">{t('otReports.filterNonWorkday')}</option>
                    </select>
                  </div>
                </div>
              )}
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
            <>
            {detailViewMode === 'employees' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: '#93c5fd' }}>
                    {t('otReports.employeeTotalsTitle')}
                    {hasActiveFilters && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>
                        {t('otReports.employeeTotalsFiltered')}
                      </span>
                    )}
                  </h4>
                  <button type="button" className="btn-elegant btn-secondary" onClick={toggleExpandAll}>
                    {allExpanded ? t('otReports.collapseAll') : t('otReports.expandAll')}
                  </button>
                </div>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  {t('otReports.clickEmployeeHint')}
                </p>
                <ReportScrollTable maxHeight={560}>
                <table className="ot-reconciliation-table">
                  <thead>
                    <tr>
                      <th>{t('otReports.employeeCode')}</th>
                      <th>{t('otReports.employeeName')}</th>
                      <th>{t('otReports.jobTitle')}</th>
                      <th>{t('otReports.location')}</th>
                      <th>{t('otReports.department')}</th>
                      {showExtendedDetails && (
                        <>
                          <th>{t('otReports.totalWorkdays')}</th>
                          <th>{t('otReports.totalPunchedHours')}</th>
                        </>
                      )}
                      <th>{t('otReports.totalFingerprintOt')}</th>
                      {showExtendedDetails && (
                        <>
                          <th>{t('otReports.totalRequestedOt')}</th>
                          <th>{t('otReports.daysWithForm')}</th>
                        </>
                      )}
                      <th>{t('otReports.totalApprovedOt')}</th>
                      <th>{t('otReports.totalVariance')}</th>
                      <th>{t('otReports.totalFinalOt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empPagination.pageItems.map((emp) => {
                      const isExpanded = expandedEmployees.has(emp.key);
                      return (
                        <React.Fragment key={emp.key}>
                          <tr
                            onClick={() => toggleEmployeeExpanded(emp.key)}
                            style={{ cursor: 'pointer' }}
                            title={t('otReports.clickEmployeeHint')}
                          >
                            <td>
                              <span style={{ marginRight: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>
                                {isExpanded ? '▾' : '▸'}
                              </span>
                              {emp.employeeCode || '—'}
                            </td>
                            <td style={{ color: '#93c5fd', fontWeight: 600 }}>{emp.employeeName}</td>
                            <td>{emp.jobTitle || '—'}</td>
                            <td>{emp.location || '—'}</td>
                            <td>{emp.department}</td>
                            {showExtendedDetails && (
                              <>
                                <td>{emp.workdays}</td>
                                <td>{formatHours(emp.totalPunched)}</td>
                              </>
                            )}
                            <td>{formatHours(emp.totalFingerprint)}</td>
                            {showExtendedDetails && (
                              <>
                                <td>{formatHours(emp.totalRequested)}</td>
                                <td>{emp.daysWithForm}</td>
                              </>
                            )}
                            <td>{formatHours(emp.totalApproved)}</td>
                            <td style={varianceTotalStyle(emp.totalVariance)}>
                              {emp.totalVariance > 0 ? '+' : ''}{formatHours(emp.totalVariance)}
                            </td>
                            <td style={{ color: '#4ade80', fontWeight: 600 }}>{formatHours(emp.totalFinalPayable)}</td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={totalsColSpan} style={{ padding: '0.75rem 1rem 1rem', background: 'rgba(15, 23, 42, 0.9)' }}>
                                <ReportNestedTable>
                                <table className="ot-reconciliation-table" style={{ fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr>
                                      <th>{t('otReports.otDate')}</th>
                                      <th>{t('otReports.workday')}</th>
                                      <th>{t('otReports.clockIn')}</th>
                                      <th>{t('otReports.clockOut')}</th>
                                      <th>{t('otReports.totalHours')}</th>
                                      <th>{t('otReports.fingerprintActuals')}</th>
                                      <th>{t('otReports.requestedOt')}</th>
                                      <th>{t('otReports.hasForm')}</th>
                                      <th>{t('otReports.approvedOt')}</th>
                                      <th>{t('otReports.variance')}</th>
                                      <th>{t('otReports.finalOtPreview')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emp.rows.map((row) => (
                                      <tr key={row.rowKey || row.formId}>
                                        <td>{formatOtDateDetailed(row.otDate)}</td>
                                        <td>{row.isWorkday ? t('otReports.yes') : t('otReports.no')}</td>
                                        <td>{row.clockIn || '—'}</td>
                                        <td>{row.clockOut || '—'}</td>
                                        <td>{row.totalPunchedHours != null ? formatHours(row.totalPunchedHours) : '—'}</td>
                                        <td>{formatHours(row.actualPunchingHours)}</td>
                                        <td>{row.requestedHours != null ? formatHours(row.requestedHours) : '—'}</td>
                                        <td>{row.hasApprovedForm ? t('otReports.yes') : t('otReports.no')}</td>
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
                                      <td colSpan={4} style={{ fontWeight: 700, color: '#93c5fd', background: 'rgba(30, 58, 95, 0.9)' }}>
                                        {t('otReports.subtotal', { name: emp.employeeName, count: emp.days })}
                                      </td>
                                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(emp.totalPunched)}</td>
                                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(emp.totalFingerprint)}</td>
                                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(emp.totalRequested)}</td>
                                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{emp.daysWithForm}</td>
                                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(emp.totalApproved)}</td>
                                      <td style={{ ...varianceTotalStyle(emp.totalVariance), background: 'rgba(30, 58, 95, 0.9)' }}>
                                        {emp.totalVariance > 0 ? '+' : ''}{formatHours(emp.totalVariance)}
                                      </td>
                                      <td style={{ color: '#4ade80', fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                                        {formatHours(emp.totalFinalPayable)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                                </ReportNestedTable>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ fontWeight: 700, color: '#93c5fd', background: 'rgba(30, 58, 95, 0.9)' }}>
                        {t('otReports.grandTotal', { count: employeeTotals.length })}
                      </td>
                      {showExtendedDetails && (
                        <>
                          <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{grandTotals.workdays}</td>
                          <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(grandTotals.totalPunched)}</td>
                        </>
                      )}
                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(grandTotals.totalFingerprint)}</td>
                      {showExtendedDetails && (
                        <>
                          <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(grandTotals.totalRequested)}</td>
                          <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{grandTotals.daysWithForm}</td>
                        </>
                      )}
                      <td style={{ fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>{formatHours(grandTotals.totalApproved)}</td>
                      <td style={{ ...varianceTotalStyle(grandTotals.totalVariance), background: 'rgba(30, 58, 95, 0.9)' }}>
                        {grandTotals.totalVariance > 0 ? '+' : ''}{formatHours(grandTotals.totalVariance)}
                      </td>
                      <td style={{ color: '#4ade80', fontWeight: 700, background: 'rgba(30, 58, 95, 0.9)' }}>
                        {formatHours(grandTotals.totalFinalPayable)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </ReportScrollTable>
                <ReportPaginationBar
                  {...empPagination}
                  i18nPrefix="otReports"
                  t={t}
                />
              </div>
            )}
            {detailViewMode === 'allRows' && (
              <div>
                <h4 style={{ margin: '0 0 0.75rem', color: '#93c5fd' }}>{t('otReports.dailyBreakdownTitle')}</h4>
                <ReportScrollTable maxHeight={560}>
            <table className="ot-reconciliation-table">
              <thead>
                <tr>
                  <th>{t('otReports.employeeCode')}</th>
                  <th>{t('otReports.employeeName')}</th>
                  <th>{t('otReports.jobTitle')}</th>
                  <th>{t('otReports.location')}</th>
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
                  <th>{t('otReports.finalOtPreview')}</th>
                </tr>
              </thead>
              <tbody>
                {dailyPagination.pageItems.map((row) => (
                  <tr key={row.rowKey || row.formId}>
                    <td>{row.employeeCode || '—'}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.jobTitle || '—'}</td>
                    <td>{row.location || '—'}</td>
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
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>{formatHours(row.finalPayableHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
                </ReportScrollTable>
                <ReportPaginationBar
                  {...dailyPagination}
                  i18nPrefix="otReports"
                  t={t}
                />
              </div>
            )}
            </>
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
            <ReportScrollTable maxHeight={560}>
            <table className="ot-reconciliation-table">
              <thead>
                <tr>
                  <th>{t('otReports.employeeCode')}</th>
                  <th>{t('otReports.employeeName')}</th>
                  <th>{t('otReports.jobTitle')}</th>
                  <th>{t('otReports.location')}</th>
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
                    <td>{row.jobTitle || '—'}</td>
                    <td>{row.location || '—'}</td>
                    <td>{row.department}</td>
                    <td>{formatOtDate(row.otDate)}</td>
                    <td style={{ color: '#4ade80', fontWeight: 700 }}>{formatHours(row.finalPayableHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </ReportScrollTable>
          )}
        </div>
      )}
    </div>
  );
};

export default OtReconciliationReports;
