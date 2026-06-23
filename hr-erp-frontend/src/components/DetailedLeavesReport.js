import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import { ReportPeriodFilter, useReportPeriodRange } from './ReportPeriodFilter';
import {
  REPORT_SCROLL_TABLE_CSS,
  ReportPaginationBar,
  ReportScrollTable
} from './ReportTableNav';

function formatDays(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(1);
}

function formatQuota(value, quota) {
  return `${formatDays(value)} / ${quota}`;
}

function currentMonthYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const DetailedLeavesReport = () => {
  const { t } = useTranslation();
  const {
    rangeStart,
    rangeEnd,
    selectedPeriod,
    applyPeriod,
    setRangeStart,
    setRangeEnd
  } = useReportPeriodRange();
  const [periodMode, setPeriodMode] = useState('payPeriod');
  const [calendarMonth, setCalendarMonth] = useState(currentMonthYmd);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = periodMode === 'calendar'
        ? new URLSearchParams({ month: calendarMonth }).toString()
        : new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/detailed-leaves-report?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || 'Failed to load detailed leaves report');
      }
      setReport(data);
      setPage(1);
    } catch (err) {
      setError(err.message || 'Failed to load detailed leaves report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [periodMode, calendarMonth, rangeStart, rangeEnd]);

  useEffect(() => {
    if (periodMode === 'payPeriod' && (!rangeStart || !rangeEnd)) return;
    if (periodMode === 'calendar' && !calendarMonth) return;
    fetchReport();
  }, [fetchReport, periodMode, calendarMonth, rangeStart, rangeEnd]);

  const rows = report?.rows || [];
  const annualQuota = report?.annualQuota ?? 15;
  const casualQuota = report?.casualQuota ?? 6;
  const periodLabel = periodMode === 'calendar'
    ? calendarMonth
    : `${rangeStart} → ${rangeEnd}`;

  const departmentOptions = useMemo(() => {
    const depts = new Set();
    rows.forEach((row) => {
      if (row.department) depts.add(row.department);
    });
    return Array.from(depts).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterDepartment && row.department !== filterDepartment) return false;
      if (q) {
        const code = String(row.employeeCode || '').toLowerCase();
        const name = String(row.name || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterSearch, filterDepartment]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredRows.slice(pageStart, pageStart + rowsPerPage);

  const varianceClass = (variance) => (Number(variance) > 0 ? 'saas-stat-danger' : 'saas-stat-success');
  const deductionClass = (deduction) => (Number(deduction) > 0 ? 'saas-stat-danger' : 'saas-stat-success');

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
    link.download = `${filenamePrefix}_${periodLabel.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportCsv = () => {
    const dataRows = filteredRows.length ? filteredRows : rows;
    if (!dataRows.length) {
      alert(t('detailedLeavesReport.noDataToExport'));
      return;
    }

    const headers = [
      t('detailedLeavesReport.employeeCode'),
      t('detailedLeavesReport.employeeName'),
      t('detailedLeavesReport.jobTitle'),
      t('detailedLeavesReport.department'),
      t('detailedLeavesReport.location'),
      t('detailedLeavesReport.approvedAnnual', { quota: annualQuota }),
      t('detailedLeavesReport.approvedCasual', { quota: casualQuota }),
      t('detailedLeavesReport.approvedSick'),
      t('detailedLeavesReport.absentRaw'),
      t('detailedLeavesReport.absentActual'),
      t('detailedLeavesReport.variance'),
      t('detailedLeavesReport.deduction'),
      t('detailedLeavesReport.reason')
    ];

    const lines = dataRows.map((row) => csvLine([
      row.employeeCode,
      row.name,
      row.jobTitle || '',
      row.department || '',
      row.location || '',
      formatQuota(row.approvedAnnual, annualQuota),
      formatQuota(row.approvedCasual, casualQuota),
      formatDays(row.approvedSick),
      formatDays(row.absentRaw),
      formatDays(row.absentActual),
      formatDays(row.variance),
      formatDays(row.deduction),
      row.reason || ''
    ]));

    downloadCsv([csvLine(headers), ...lines], 'detailed_leaves_report');
  };

  return (
    <div className="saas-leaves-report">
      <style>{REPORT_SCROLL_TABLE_CSS}</style>

      <div style={{ marginBottom: '1.25rem' }}>
        <h3 className="!text-slate-900 dark:!text-white saas-panel-heading" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          {t('detailedLeavesReport.title')}
        </h3>
        <p className="saas-section-subtitle" style={{ margin: '0.5rem 0 0', maxWidth: '52rem' }}>
          {t('detailedLeavesReport.subtitle')}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn-elegant ${periodMode === 'payPeriod' ? 'btn-primary-elegant' : 'btn-secondary-elegant'}`}
          onClick={() => setPeriodMode('payPeriod')}
        >
          {t('detailedLeavesReport.payPeriodMode')}
        </button>
        <button
          type="button"
          className={`btn-elegant ${periodMode === 'calendar' ? 'btn-primary-elegant' : 'btn-secondary-elegant'}`}
          onClick={() => setPeriodMode('calendar')}
        >
          {t('detailedLeavesReport.calendarMonthMode')}
        </button>
      </div>

      {periodMode === 'payPeriod' ? (
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
      ) : (
        <div className="dash-panel-card saas-filter-panel" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="form-label-elegant">{t('detailedLeavesReport.month')}</span>
              <input
                type="month"
                className="form-input-elegant saas-input"
                value={calendarMonth}
                onChange={(e) => setCalendarMonth(e.target.value)}
                style={{ minWidth: '10rem' }}
              />
            </label>
            <button type="button" className="btn-elegant btn-secondary-elegant" onClick={fetchReport} disabled={loading}>
              {loading ? t('detailedLeavesReport.loading') : t('detailedLeavesReport.refresh')}
            </button>
          </div>
          <small className="!text-slate-500 dark:!text-slate-400" style={{ display: 'block', marginTop: '0.5rem' }}>
            {t('detailedLeavesReport.calendarModeHint')}
          </small>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <button type="button" className="btn-elegant btn-primary-elegant" onClick={exportCsv} disabled={loading || !rows.length}>
          {t('detailedLeavesReport.exportCsv')}
        </button>
        <input
          type="search"
          className="form-input-elegant saas-input"
          placeholder={t('detailedLeavesReport.searchPlaceholder')}
          value={filterSearch}
          onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
          style={{ minWidth: '12rem', flex: '1 1 12rem' }}
        />
        <select
          className="form-input-elegant saas-input"
          value={filterDepartment}
          onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }}
          style={{ minWidth: '10rem' }}
        >
          <option value="">{t('detailedLeavesReport.allDepartments')}</option>
          {departmentOptions.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="saas-stat-danger" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {loading && !report && (
        <p className="!text-slate-500 dark:!text-slate-400">{t('detailedLeavesReport.loading')}</p>
      )}

      {!loading && report && filteredRows.length === 0 && (
        <p className="!text-slate-500 dark:!text-slate-400">{t('detailedLeavesReport.noRows')}</p>
      )}

      {pageRows.length > 0 && (
        <>
          <ReportScrollTable>
            <table className="ot-reconciliation-table report-scroll-table">
              <thead>
                <tr>
                  <th>{t('detailedLeavesReport.employeeCode')}</th>
                  <th>{t('detailedLeavesReport.employeeName')}</th>
                  <th>{t('detailedLeavesReport.jobTitle')}</th>
                  <th>{t('detailedLeavesReport.department')}</th>
                  <th>{t('detailedLeavesReport.location')}</th>
                  <th>{t('detailedLeavesReport.approvedAnnual', { quota: annualQuota })}</th>
                  <th>{t('detailedLeavesReport.approvedCasual', { quota: casualQuota })}</th>
                  <th>{t('detailedLeavesReport.approvedSick')}</th>
                  <th>{t('detailedLeavesReport.absentRaw')}</th>
                  <th>{t('detailedLeavesReport.absentActual')}</th>
                  <th>{t('detailedLeavesReport.variance')}</th>
                  <th>{t('detailedLeavesReport.deduction')}</th>
                  <th>{t('detailedLeavesReport.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={`${row.employeeCode}-${row.name}`}>
                    <td>{row.employeeCode || '—'}</td>
                    <td className="!text-slate-900 dark:!text-white" style={{ fontWeight: 600 }}>{row.name || '—'}</td>
                    <td>{row.jobTitle || '—'}</td>
                    <td>{row.department || '—'}</td>
                    <td>{row.location || '—'}</td>
                    <td>{formatQuota(row.approvedAnnual, annualQuota)}</td>
                    <td>{formatQuota(row.approvedCasual, casualQuota)}</td>
                    <td>{formatDays(row.approvedSick)}</td>
                    <td>{formatDays(row.absentRaw)}</td>
                    <td>{formatDays(row.absentActual)}</td>
                    <td className={varianceClass(row.variance)}>
                      {formatDays(row.variance)}
                    </td>
                    <td className={deductionClass(row.deduction)}>
                      {formatDays(row.deduction)}
                    </td>
                    <td>{row.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportScrollTable>

          <ReportPaginationBar
            page={safePage}
            setPage={setPage}
            pageSize={rowsPerPage}
            setPageSize={(n) => { setRowsPerPage(n); setPage(1); }}
            totalPages={totalPages}
            total={filteredRows.length}
            startIndex={pageStart}
            i18nPrefix="deductionReports"
            t={t}
          />
        </>
      )}
    </div>
  );
};

export default DetailedLeavesReport;
