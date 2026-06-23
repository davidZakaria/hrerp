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

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const iso = d.toISOString().slice(0, 10);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${iso} (${weekday})`;
}

function formatDays(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(4);
}

function formatHours(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function formatAbsenceCell(row, t) {
  if (!row.absenceDays) return '—';
  if (row.absenceDays === 0.5) return t('deductionReports.halfDayAbsence');
  return t('deductionReports.yes');
}

function formatWaivedCell(row, t) {
  if (row.waived) return t('deductionReports.yes');
  if (row.halfDayVacation) return t('deductionReports.halfDayLeave');
  return t('deductionReports.no');
}

const DeductionReports = () => {
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
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPillar, setFilterPillar] = useState('all');
  const [detailViewMode, setDetailViewMode] = useState('employees');
  const [expandedEmployees, setExpandedEmployees] = useState(() => new Set());

  const fetchReport = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/deduction-report?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Failed to load deduction report');
      }
      setReport(data);
      setExpandedEmployees(new Set());
    } catch (err) {
      setError(err.message || 'Failed to load deduction report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const detailedRows = report?.detailed || [];
  const employeeRows = report?.employees || [];

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
      if (filterPillar !== 'all' && row.pillar !== filterPillar) return false;
      if (q) {
        const code = String(row.employeeCode || '').toLowerCase();
        const name = String(row.employeeName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [detailedRows, filterSearch, filterDepartment, filterPillar]);

  const filteredEmployees = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return employeeRows.filter((emp) => {
      if (filterDepartment && emp.department !== filterDepartment) return false;
      if (q) {
        const code = String(emp.employeeCode || '').toLowerCase();
        const name = String(emp.employeeName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [employeeRows, filterSearch, filterDepartment]);

  const employeeTotalsFromFiltered = useMemo(() => {
    const map = new Map();
    filteredDetailedRows.forEach((row) => {
      const key = String(row.employeeId);
      if (!map.has(key)) {
        map.set(key, {
          key,
          employeeId: row.employeeId,
          employeeCode: row.employeeCode,
          employeeName: row.employeeName,
          department: row.department,
          jobTitle: row.jobTitle || '',
          location: row.location || '',
          days: 0,
          pillarADays: 0,
          pillarBDays: 0,
          pillarCDays: 0,
          totalDeductionDays: 0,
          rows: []
        });
      }
      const agg = map.get(key);
      agg.days += 1;
      agg.pillarADays += Number(row.pillarADays || 0);
      agg.pillarBDays += Number(row.pillarBDays || 0);
      agg.pillarCDays += Number(row.pillarCDays || 0);
      agg.totalDeductionDays += Number(row.deductionDays || 0);
      agg.rows.push(row);
    });
    map.forEach((agg) => {
      agg.rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    return Array.from(map.values()).sort((a, b) => b.totalDeductionDays - a.totalDeductionDays);
  }, [filteredDetailedRows]);

  const grandTotals = useMemo(() => employeeTotalsFromFiltered.reduce(
    (acc, emp) => ({
      days: acc.days + emp.days,
      pillarADays: acc.pillarADays + emp.pillarADays,
      pillarBDays: acc.pillarBDays + emp.pillarBDays,
      pillarCDays: acc.pillarCDays + emp.pillarCDays,
      totalDeductionDays: acc.totalDeductionDays + emp.totalDeductionDays
    }),
    { days: 0, pillarADays: 0, pillarBDays: 0, pillarCDays: 0, totalDeductionDays: 0 }
  ), [employeeTotalsFromFiltered]);

  const empPagination = useReportPagination(employeeTotalsFromFiltered, 15);
  const dailyPagination = useReportPagination(filteredDetailedRows, 25);
  const summaryPagination = useReportPagination(filteredEmployees, 20);

  useAutoExpandSingleEmployee(employeeTotalsFromFiltered, filterSearch, expandedEmployees, setExpandedEmployees);

  const hasActiveFilters = Boolean(filterSearch || filterDepartment || filterPillar !== 'all');

  const clearFilters = () => {
    setFilterSearch('');
    setFilterDepartment('');
    setFilterPillar('all');
  };

  const csvLine = (cells) => cells.map((cell) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');

  const downloadCsv = (lines, filenamePrefix) => {
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPayrollCsv = () => {
    const rows = filteredEmployees.length ? filteredEmployees : employeeRows;
    if (!rows.length) {
      alert(t('deductionReports.noDataToExport'));
      return;
    }

    const headers = [
      'Code2',
      'National ID',
      'English Name',
      'Arabic Name',
      'Job Title',
      'Department',
      'Location',
      'overtime per day',
      'overtime per Hours',
      'Total overtime',
      'Total Deduction Days'
    ];

    const dataLines = rows.map((emp) => csvLine([
      emp.employeeCode || '',
      '',
      emp.employeeName || '',
      '',
      emp.jobTitle || '',
      emp.department || '',
      emp.location || '',
      formatHours(emp.otDays),
      formatHours(emp.totalOtHours),
      formatHours(emp.totalOtHours),
      formatDays(emp.totalDeductionDays)
    ]));

    downloadCsv([csvLine(headers), ...dataLines], 'deduction_payroll_report');
  };

  const exportDetailedCsv = () => {
    if (!filteredDetailedRows.length) {
      alert(t('deductionReports.noDataToExport'));
      return;
    }

    const headers = [
      t('deductionReports.employeeCode'),
      t('deductionReports.employeeName'),
      t('deductionReports.jobTitle'),
      t('deductionReports.location'),
      t('deductionReports.department'),
      t('deductionReports.date'),
      t('deductionReports.missingPunch'),
      t('deductionReports.shortfallMinutes'),
      t('deductionReports.absence'),
      t('deductionReports.waived'),
      t('deductionReports.pillarA'),
      t('deductionReports.pillarB'),
      t('deductionReports.pillarC'),
      t('deductionReports.deductionDays')
    ];

    const lines = filteredDetailedRows.map((row) => csvLine([
      row.employeeCode,
      row.employeeName,
      row.jobTitle || '',
      row.location || '',
      row.department,
      row.dateKey,
      row.missLabel || '',
      row.shortfallMinutes || 0,
      row.absenceDays === 0.5 ? t('deductionReports.halfDayAbsence') : (row.absenceDays ? t('deductionReports.yes') : ''),
      formatWaivedCell(row, t),
      formatDays(row.pillarADays),
      formatDays(row.pillarBDays),
      formatDays(row.pillarCDays),
      formatDays(row.deductionDays)
    ]));

    downloadCsv([csvLine(headers), ...lines], 'deduction_detailed_report');
  };

  const toggleEmployeeExpanded = (key) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allExpanded = employeeTotalsFromFiltered.length > 0
    && employeeTotalsFromFiltered.every((emp) => expandedEmployees.has(emp.key));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedEmployees(new Set());
    } else {
      setExpandedEmployees(new Set(employeeTotalsFromFiltered.map((emp) => emp.key)));
    }
  };

  return (
    <div className="saas-deduction-reports modern-dash" style={{ marginTop: '2rem' }}>
      <style>{`
        ${REPORT_SCROLL_TABLE_CSS}
        .deduction-table,
        .ot-reconciliation-table.deduction-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .deduction-table td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        [data-theme='dark'] .deduction-table td {
          border-bottom-color: #334155;
        }
      `}</style>

      <h2 className="!text-slate-900 dark:!text-white" style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>{t('deductionReports.title')}</h2>
      <p className="saas-section-subtitle">{t('deductionReports.subtitle')}</p>

      <ReportPeriodFilter
        i18nPrefix="deductionReports"
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        selectedPeriod={selectedPeriod}
        applyPeriod={applyPeriod}
        setRangeStart={setRangeStart}
        setRangeEnd={setRangeEnd}
        onRefresh={fetchReport}
        loading={loading}
      />

      {report?.summary && (
        <div className="dash-panel-card saas-summary-panel">
          <div><span className="saas-summary-label">{t('deductionReports.summaryEmployees')}: </span><strong className="saas-summary-value">{report.summary.totalEmployees}</strong></div>
          <div><span className="saas-summary-label">{t('deductionReports.summaryPillarA')}: </span><strong className="saas-stat-danger">{formatDays(report.summary.pillarADays)}</strong></div>
          <div><span className="saas-summary-label">{t('deductionReports.summaryPillarB')}: </span><strong className="saas-stat-danger">{formatDays(report.summary.pillarBDays)}</strong></div>
          <div><span className="saas-summary-label">{t('deductionReports.summaryPillarC')}: </span><strong className="saas-stat-danger">{formatDays(report.summary.pillarCDays)}</strong></div>
          <div><span className="saas-summary-label">{t('deductionReports.summaryTotal')}: </span><strong className="saas-stat-danger">{formatDays(report.summary.totalDeductionDays)}</strong></div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className={`btn-elegant ${activeView === 'detailed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('detailed')}>
          {t('deductionReports.detailedTab')}
        </button>
        <button type="button" className={`btn-elegant ${activeView === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveView('summary')}>
          {t('deductionReports.summaryTab')}
        </button>
        <button type="button" className="btn-elegant btn-success" onClick={exportPayrollCsv} disabled={!employeeRows.length}>
          {t('deductionReports.exportPayroll')}
        </button>
        {activeView === 'detailed' && (
          <button type="button" className="btn-elegant btn-secondary" onClick={exportDetailedCsv} disabled={!filteredDetailedRows.length}>
            {t('deductionReports.exportDetailed')}
          </button>
        )}
      </div>

      {error && <div className="saas-stat-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {loading && !report && <div className="!text-slate-500 dark:!text-slate-400">{t('deductionReports.loading')}</div>}

      {report && (
        <div className="dash-panel-card saas-filter-panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
              <label className="form-label-elegant">{t('deductionReports.filterSearch')}</label>
              <input type="text" className="form-input-elegant saas-input" placeholder={t('deductionReports.filterSearchPlaceholder')} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
            </div>
            <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
              <label className="form-label-elegant">{t('deductionReports.filterDepartment')}</label>
              <select className="form-input-elegant saas-input" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="">{t('deductionReports.filterAllDepartments')}</option>
                {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {activeView === 'detailed' && (
              <div style={{ minWidth: '140px', flex: '1 1 140px' }}>
                <label className="form-label-elegant">{t('deductionReports.filterPillar')}</label>
                <select className="form-input-elegant saas-input" value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)}>
                  <option value="all">{t('deductionReports.filterAll')}</option>
                  <option value="A">{t('deductionReports.pillarA')}</option>
                  <option value="B">{t('deductionReports.pillarB')}</option>
                  <option value="C">{t('deductionReports.pillarC')}</option>
                </select>
              </div>
            )}
            {hasActiveFilters && (
              <button type="button" className="btn-elegant btn-secondary" onClick={clearFilters}>{t('deductionReports.clearFilters')}</button>
            )}
          </div>
          {activeView === 'detailed' && (
            <p className="!text-slate-500 dark:!text-slate-400" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
              {t('deductionReports.filterShowing', { shown: filteredDetailedRows.length, total: detailedRows.length })}
            </p>
          )}
        </div>
      )}

      {report && activeView === 'detailed' && (
        <div className="elegant-card" style={{ overflowX: 'auto', opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 className="saas-panel-heading">{t('deductionReports.detailedTitle')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <ReportViewModeToggle
                viewMode={detailViewMode}
                setViewMode={setDetailViewMode}
                i18nPrefix="deductionReports"
                t={t}
              />
              {detailViewMode === 'employees' && employeeTotalsFromFiltered.length > 0 && (
                <button type="button" className="btn-elegant btn-secondary" onClick={toggleExpandAll}>
                  {allExpanded ? t('deductionReports.collapseAll') : t('deductionReports.expandAll')}
                </button>
              )}
            </div>
          </div>

          {detailedRows.length === 0 ? (
            <div className="!text-slate-500 dark:!text-slate-400"><p>{t('deductionReports.noRows')}</p></div>
          ) : filteredDetailedRows.length === 0 ? (
            <div className="!text-slate-500 dark:!text-slate-400">
              <p>{t('deductionReports.noFilterResults')}</p>
              <button type="button" className="btn-elegant btn-secondary" onClick={clearFilters}>{t('deductionReports.clearFilters')}</button>
            </div>
          ) : (
            <>
              {detailViewMode === 'employees' && employeeTotalsFromFiltered.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="!text-slate-500 dark:!text-slate-400" style={{ margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{t('deductionReports.clickEmployeeHint')}</p>
                  <ReportScrollTable maxHeight={560}>
                  <table className="ot-reconciliation-table deduction-table">
                    <thead>
                      <tr>
                        <th>{t('deductionReports.employeeCode')}</th>
                        <th>{t('deductionReports.employeeName')}</th>
                        <th>{t('deductionReports.jobTitle')}</th>
                        <th>{t('deductionReports.location')}</th>
                        <th>{t('deductionReports.department')}</th>
                        <th>{t('deductionReports.days')}</th>
                        <th>{t('deductionReports.pillarA')}</th>
                        <th>{t('deductionReports.pillarB')}</th>
                        <th>{t('deductionReports.pillarC')}</th>
                        <th>{t('deductionReports.totalDeduction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empPagination.pageItems.map((emp) => {
                        const isExpanded = expandedEmployees.has(emp.key);
                        return (
                          <React.Fragment key={emp.key}>
                            <tr onClick={() => toggleEmployeeExpanded(emp.key)} style={{ cursor: 'pointer' }}>
                              <td><span className="!text-slate-500 dark:!text-slate-400" style={{ marginRight: '0.5rem', fontWeight: 700 }}>{isExpanded ? '▾' : '▸'}</span>{emp.employeeCode || '—'}</td>
                              <td className="!text-slate-900 dark:!text-white" style={{ fontWeight: 600 }}>{emp.employeeName}</td>
                              <td>{emp.jobTitle || '—'}</td>
                              <td>{emp.location || '—'}</td>
                              <td>{emp.department}</td>
                              <td>{emp.days}</td>
                              <td>{formatDays(emp.pillarADays)}</td>
                              <td>{formatDays(emp.pillarBDays)}</td>
                              <td>{formatDays(emp.pillarCDays)}</td>
                              <td className="saas-stat-danger" style={{ fontWeight: 700 }}>{formatDays(emp.totalDeductionDays)}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={10} className="ot-nested-expand-cell">
                                  <ReportNestedTable>
                                  <table className="ot-reconciliation-table deduction-table" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                      <tr>
                                        <th>{t('deductionReports.date')}</th>
                                        <th>{t('deductionReports.missingPunch')}</th>
                                        <th>{t('deductionReports.shortfallMinutes')}</th>
                                        <th>{t('deductionReports.absence')}</th>
                                        <th>{t('deductionReports.waived')}</th>
                                        <th>{t('deductionReports.deductionDays')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {emp.rows.map((row) => (
                                        <tr key={row.rowKey}>
                                          <td>{formatDate(row.date)}</td>
                                          <td>{row.missLabel || '—'}</td>
                                          <td>{row.shortfallMinutes > 0 ? row.shortfallMinutes : '—'}</td>
                                          <td>{formatAbsenceCell(row, t)}</td>
                                          <td>{formatWaivedCell(row, t)}</td>
                                          <td className={row.deductionDays > 0 ? 'saas-stat-danger' : ''} style={{ fontWeight: row.deductionDays > 0 ? 700 : 400 }}>
                                            {formatDays(row.deductionDays)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr>
                                        <td colSpan={5}>{t('deductionReports.subtotal', { name: emp.employeeName, count: emp.days })}</td>
                                        <td className="saas-stat-danger" style={{ fontWeight: 700 }}>
                                          {formatDays(emp.totalDeductionDays)}
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
                        <td colSpan={5}>{t('deductionReports.grandTotal', { count: employeeTotalsFromFiltered.length })}</td>
                        <td>{grandTotals.days}</td>
                        <td>{formatDays(grandTotals.pillarADays)}</td>
                        <td>{formatDays(grandTotals.pillarBDays)}</td>
                        <td>{formatDays(grandTotals.pillarCDays)}</td>
                        <td className="saas-stat-danger" style={{ fontWeight: 700 }}>{formatDays(grandTotals.totalDeductionDays)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  </ReportScrollTable>
                  <ReportPaginationBar
                    {...empPagination}
                    i18nPrefix="deductionReports"
                    t={t}
                  />
                </div>
              )}

              {detailViewMode === 'allRows' && (
              <div>
              <h4 className="ot-table-subheading" style={{ margin: '0 0 0.75rem' }}>{t('deductionReports.dailyBreakdownTitle')}</h4>
              <ReportScrollTable maxHeight={560}>
              <table className="ot-reconciliation-table deduction-table">
                <thead>
                  <tr>
                    <th>{t('deductionReports.employeeCode')}</th>
                    <th>{t('deductionReports.employeeName')}</th>
                    <th>{t('deductionReports.jobTitle')}</th>
                    <th>{t('deductionReports.location')}</th>
                    <th>{t('deductionReports.department')}</th>
                    <th>{t('deductionReports.date')}</th>
                    <th>{t('deductionReports.missingPunch')}</th>
                    <th>{t('deductionReports.shortfallMinutes')}</th>
                    <th>{t('deductionReports.absence')}</th>
                    <th>{t('deductionReports.waived')}</th>
                    <th>{t('deductionReports.deductionDays')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyPagination.pageItems.map((row) => (
                    <tr key={row.rowKey}>
                      <td>{row.employeeCode || '—'}</td>
                      <td>{row.employeeName}</td>
                      <td>{row.jobTitle || '—'}</td>
                      <td>{row.location || '—'}</td>
                      <td>{row.department}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.missLabel || '—'}</td>
                      <td>{row.shortfallMinutes > 0 ? `${row.shortfallMinutes} (${row.minutesLate || 0}+${row.minutesEarly || 0})` : '—'}</td>
                      <td>{formatAbsenceCell(row, t)}</td>
                      <td>{formatWaivedCell(row, t)}</td>
                      <td className={row.deductionDays > 0 ? 'saas-stat-danger' : ''} style={{ fontWeight: row.deductionDays > 0 ? 700 : 400 }}>
                        {formatDays(row.deductionDays)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </ReportScrollTable>
              <ReportPaginationBar
                {...dailyPagination}
                i18nPrefix="deductionReports"
                t={t}
              />
              </div>
              )}
            </>
          )}
        </div>
      )}

      {report && activeView === 'summary' && (
        <div className="elegant-card" style={{ overflowX: 'auto', opacity: loading ? 0.6 : 1 }}>
          <h3 className="saas-panel-heading" style={{ marginBottom: '1rem' }}>{t('deductionReports.summaryTitle')}</h3>
          {filteredEmployees.length === 0 ? (
            <div className="!text-slate-500 dark:!text-slate-400"><p>{t('deductionReports.noRows')}</p></div>
          ) : (
            <>
            <ReportScrollTable maxHeight={520}>
            <table className="ot-reconciliation-table deduction-table">
              <thead>
                <tr>
                  <th>{t('deductionReports.employeeCode')}</th>
                  <th>{t('deductionReports.employeeName')}</th>
                  <th>{t('deductionReports.jobTitle')}</th>
                  <th>{t('deductionReports.location')}</th>
                  <th>{t('deductionReports.department')}</th>
                  <th>{t('deductionReports.pillarA')}</th>
                  <th>{t('deductionReports.pillarB')}</th>
                  <th>{t('deductionReports.pillarC')}</th>
                  <th>{t('deductionReports.totalDeduction')}</th>
                  <th>{t('deductionReports.totalOtHours')}</th>
                  <th>{t('deductionReports.otDays')}</th>
                </tr>
              </thead>
              <tbody>
                {summaryPagination.pageItems.map((emp) => (
                  <tr key={emp.employeeId}>
                    <td>{emp.employeeCode || '—'}</td>
                    <td>{emp.employeeName}</td>
                    <td>{emp.jobTitle || '—'}</td>
                    <td>{emp.location || '—'}</td>
                    <td>{emp.department}</td>
                    <td>{formatDays(emp.pillarADays)}</td>
                    <td>{formatDays(emp.pillarBDays)}</td>
                    <td>{formatDays(emp.pillarCDays)}</td>
                    <td className="saas-stat-danger" style={{ fontWeight: 700 }}>{formatDays(emp.totalDeductionDays)}</td>
                    <td className="saas-stat-success">{formatHours(emp.totalOtHours)}</td>
                    <td className="saas-stat-success">{formatHours(emp.otDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </ReportScrollTable>
            <ReportPaginationBar
              {...summaryPagination}
              i18nPrefix="deductionReports"
              t={t}
            />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeductionReports;
