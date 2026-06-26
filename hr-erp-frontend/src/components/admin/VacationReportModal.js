import React, { useCallback, useEffect, useMemo, useState } from 'react';
import API_URL from '../../config/api';
import logger from '../../utils/logger';
import {
  ANNUAL_LEAVE_QUOTA,
  CASUAL_LEAVE_QUOTA,
  LOW_ANNUAL_BALANCE,
  LOW_CASUAL_BALANCE,
  BalanceBadge,
  ProgressBar,
  StatusBadge,
  formatDays
} from './vacationBalanceUi';
import {
  REPORT_SCROLL_TABLE_CSS,
  ReportScrollTable
} from '../ReportTableNav';

const VacationReportModal = ({ open, onClose }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/vacation-days-report`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setReportData(Array.isArray(data) ? data : []);
      } else {
        setError(data.msg || 'Failed to fetch report.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setDepartmentFilter('');
    fetchReport();
  }, [open, fetchReport]);

  const departments = useMemo(() => {
    const set = new Set();
    reportData.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reportData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reportData.filter((emp) => {
      if (departmentFilter && emp.department !== departmentFilter) return false;
      if (!q) return true;
      return [emp.name, emp.email, emp.department].some((field) =>
        String(field ?? '').toLowerCase().includes(q)
      );
    });
  }, [reportData, search, departmentFilter]);

  const summary = useMemo(() => {
    const total = reportData.length;
    const noAnnualLeft = reportData.filter((emp) => Number(emp.vacationDaysLeft) <= 0).length;
    const avgAnnual = total
      ? Math.round(
          reportData.reduce((acc, emp) => acc + Number(emp.vacationDaysLeft || 0), 0) / total
        )
      : 0;
    return { total, noAnnualLeft, avgAnnual };
  }, [reportData]);

  const handlePrint = () => {
    if (!reportData.length) {
      alert('No report data available to print.');
      return;
    }

    const rowsHtml = filteredRows.map((emp) => {
      const annual = Number(emp.vacationDaysLeft ?? 0);
      const casual = Number(emp.casualDaysLeft ?? 0);
      const status =
        annual <= 0 && casual <= 0 ? 'Depleted' : annual <= LOW_ANNUAL_BALANCE || casual <= LOW_CASUAL_BALANCE ? 'Low' : 'Healthy';
      const badgeClass = status === 'Depleted' ? 'badge-critical' : status === 'Low' ? 'badge-warning' : 'badge-good';
      return `<tr>
        <td>${emp.name}</td>
        <td>${emp.email}</td>
        <td>${emp.department || '—'}</td>
        <td><span class="badge ${badgeClass}">${formatDays(annual)} / ${ANNUAL_LEAVE_QUOTA}</span></td>
        <td><span class="badge ${badgeClass}">${formatDays(casual)} / ${CASUAL_LEAVE_QUOTA}</span></td>
        <td>${status}</td>
      </tr>`;
    }).join('');

    const reportHTML = `<!DOCTYPE html><html><head><title>Vacation Days Report</title><style>
      body{font-family:Arial,sans-serif;margin:20px;color:#333}
      .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #6366f1;padding-bottom:16px}
      .title{font-size:22px;font-weight:bold;margin:0;color:#0f172a}
      .policy{font-size:13px;color:#64748b;margin-top:8px}
      .summary{display:flex;justify-content:space-around;margin:16px 0;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px}
      .summary-number{font-size:22px;font-weight:bold;color:#4f46e5}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f1f5f9;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.05em;padding:10px;text-align:left;border-bottom:2px solid #e2e8f0}
      td{padding:10px;border-bottom:1px solid #e2e8f0;color:#334155}
      .badge{padding:3px 8px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block}
      .badge-good{background:#ecfdf5;color:#047857}
      .badge-warning{background:#fffbeb;color:#b45309}
      .badge-critical{background:#fff1f2;color:#be123c}
      @media print{.badge{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
      <div class="header">
        <h1 class="title">Vacation Days Report</h1>
        <p class="policy">Policy: ${ANNUAL_LEAVE_QUOTA} Annual Days · ${CASUAL_LEAVE_QUOTA} Casual Days</p>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
      <div class="summary">
        <div><div class="summary-number">${summary.total}</div><div>Total Employees</div></div>
        <div><div class="summary-number">${summary.noAnnualLeft}</div><div>No Annual Days Left</div></div>
        <div><div class="summary-number">${summary.avgAnnual}</div><div>Avg Annual Remaining</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Employee</th><th>Email</th><th>Department</th>
          <th>Annual (${ANNUAL_LEAVE_QUOTA} Days)</th><th>Casual (${CASUAL_LEAVE_QUOTA} Days)</th><th>Status</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script>
    </body></html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      logger.log('Vacation report print window opened');
    } else {
      alert('Please allow pop-ups to enable printing.');
    }
  };

  if (!open) return null;

  return (
    <div className="modal-elegant saas-vacation-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="vacation-report-title">
      <style>{REPORT_SCROLL_TABLE_CSS}</style>
      <div
        className="saas-vacation-report bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="saas-vacation-report-header">
          <div>
            <h2 id="vacation-report-title" className="!text-slate-900 dark:!text-white saas-panel-heading" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              Vacation Days Report
            </h2>
            <p className="saas-section-subtitle" style={{ margin: '0.35rem 0 0' }}>
              {ANNUAL_LEAVE_QUOTA} Annual Days · {CASUAL_LEAVE_QUOTA} Casual Days — employee leave balances
            </p>
          </div>
          <div className="saas-vacation-report-actions">
            <button type="button" className="btn-elegant btn-secondary-elegant saas-btn-secondary" onClick={handlePrint} disabled={loading || !!error}>
              Print Report
            </button>
            <button type="button" className="saas-vacation-close-btn" onClick={onClose} aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <div className="saas-filter-panel saas-vacation-filters">
          <input
            type="search"
            className="form-input-elegant saas-input saas-vacation-search bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2"
            placeholder="Search by name, email, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input-elegant saas-input saas-vacation-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="saas-vacation-loading">
            <div className="spinner-elegant" />
            <p className="!text-slate-700 dark:!text-slate-200">Generating report…</p>
          </div>
        )}

        {error && (
          <div className="saas-vacation-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="saas-summary-panel saas-vacation-summary">
              <div className="saas-vacation-stat">
                <span className="saas-summary-label">Total employees</span>
                <span className="saas-summary-value !text-slate-900 dark:!text-white">{summary.total}</span>
              </div>
              <div className="saas-vacation-stat">
                <span className="saas-summary-label">No annual days left</span>
                <span className="saas-summary-value !text-slate-900 dark:!text-white">{summary.noAnnualLeft}</span>
              </div>
              <div className="saas-vacation-stat">
                <span className="saas-summary-label">Avg annual remaining</span>
                <span className="saas-summary-value !text-slate-900 dark:!text-white">{summary.avgAnnual} / {ANNUAL_LEAVE_QUOTA}</span>
              </div>
            </div>

            <ReportScrollTable className="saas-vacation-table-wrap" maxHeight={480}>
              <table className="ot-reconciliation-table saas-table vacation-report-table">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">Employee</th>
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">Department</th>
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                      Annual ({ANNUAL_LEAVE_QUOTA} Days)
                    </th>
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                      Casual ({CASUAL_LEAVE_QUOTA} Days)
                    </th>
                    <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="!text-slate-900 dark:!text-white saas-vacation-empty">
                        No employees match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((employee) => {
                      const annualLeft = Number(employee.vacationDaysLeft ?? 0);
                      const casualLeft = Number(employee.casualDaysLeft ?? 0);
                      return (
                        <tr key={employee._id}>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3">{employee.name}</td>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3">{employee.email}</td>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3">{employee.department || '—'}</td>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                            <BalanceBadge
                              remaining={annualLeft}
                              quota={ANNUAL_LEAVE_QUOTA}
                              lowThreshold={LOW_ANNUAL_BALANCE}
                              label="Annual"
                            />
                            <ProgressBar remaining={annualLeft} quota={ANNUAL_LEAVE_QUOTA} lowThreshold={LOW_ANNUAL_BALANCE} />
                          </td>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                            <BalanceBadge
                              remaining={casualLeft}
                              quota={CASUAL_LEAVE_QUOTA}
                              lowThreshold={LOW_CASUAL_BALANCE}
                              label="Casual"
                            />
                            <ProgressBar remaining={casualLeft} quota={CASUAL_LEAVE_QUOTA} lowThreshold={LOW_CASUAL_BALANCE} />
                          </td>
                          <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                            <StatusBadge annualLeft={annualLeft} casualLeft={casualLeft} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </ReportScrollTable>
          </>
        )}

        <div className="saas-vacation-report-footer">
          <button type="button" className="btn-elegant btn-secondary-elegant saas-btn-secondary" onClick={onClose}>
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default VacationReportModal;
