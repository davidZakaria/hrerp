import React from 'react';
import { useTranslation } from 'react-i18next';

function badgeClass(kind) {
  const map = {
    neutral: 'insights-badge insights-badge--neutral',
    good: 'insights-badge insights-badge--good',
    warn: 'insights-badge insights-badge--warn',
    bad: 'insights-badge insights-badge--bad'
  };
  return map[kind] || map.neutral;
}

function vacationBadgeClass(days) {
  return days < 5 ? badgeClass('warn') : badgeClass('good');
}

function absenceBadgeClass(days) {
  if (days >= 3) return badgeClass('bad');
  if (days > 0) return badgeClass('warn');
  return badgeClass('neutral');
}

function attendanceBadgeClass(rate) {
  if (rate === '-') return badgeClass('neutral');
  const n = parseFloat(rate);
  if (n >= 90) return badgeClass('good');
  if (n >= 75) return badgeClass('warn');
  return badgeClass('bad');
}

export default function AdminEmployeeInsights({
  employeeSummary,
  summaryLoading,
  insightsPeriodMonth,
  onInsightsPeriodChange,
  insightsPeriodOptions,
  onRefresh
}) {
  const { t } = useTranslation();

  const handleExportCsv = () => {
    if (!employeeSummary) return;
    const headers = ['Name', 'Email', 'Department', 'Role', 'Vacation Days', 'Present', 'Absent', 'Late', 'Deduction Days', 'OT Hours', 'Attendance %'];
    const csvContent = [
      headers.join(','),
      ...employeeSummary.allEmployees.map((emp) => [
        `"${emp.name}"`,
        `"${emp.email}"`,
        `"${emp.department}"`,
        emp.role,
        emp.vacationDaysLeft,
        emp.presentDays,
        emp.absentDays,
        emp.lateDays,
        emp.deductions,
        emp.totalOtHours ?? 0,
        emp.attendanceRate
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employee_insights_${employeeSummary.periodStart || employeeSummary.currentMonth}.csv`;
    link.click();
  };

  const handlePrint = () => {
    if (!employeeSummary) return;
    const printContent = document.getElementById('employee-insights-table');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Employee Insights - ${employeeSummary.periodLabel || employeeSummary.currentMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f1f5f9; color: #334155; padding: 12px 8px; text-align: left; font-size: 12px; }
            td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; }
            tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Employee Insights Report</h1>
          <p>Period: ${employeeSummary.periodLabel || employeeSummary.currentMonth}</p>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const summaryStats = employeeSummary
    ? [
        { value: employeeSummary.totalEmployees, label: 'Total Employees' },
        { value: employeeSummary.averageVacationDays, label: 'Avg Vacation Days' },
        { value: `${employeeSummary.attendanceRate}%`, label: 'Attendance Rate' },
        { value: employeeSummary.totalDeductions, label: t('adminDashboard.insightsTotalDeductionDays') },
        { value: employeeSummary.totalOtHours ?? 0, label: t('adminDashboard.insightsTotalOtHours') }
      ]
    : [];

  const hasAlerts =
    employeeSummary &&
    (employeeSummary.summary.lowVacationCount > 0 ||
      employeeSummary.summary.highAbsenceCount > 0 ||
      employeeSummary.summary.deductionCount > 0);

  return (
    <div className="dash-insights-shell dash-insights-section">
      <div className="dash-insights-toolbar">
        <div>
          <h2 className="dash-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('adminDashboard.employeeInsights')}
            {summaryLoading && (
              <span className="text-sm text-slate-500 dark:text-slate-400" style={{ fontWeight: 'normal' }}>
                ({t('adminDashboard.insightsLoading')})
              </span>
            )}
          </h2>
          {employeeSummary?.periodLabel && (
            <p className="dash-insights-period">
              {t('adminDashboard.insightsPeriod')}: {employeeSummary.periodLabel}
            </p>
          )}
        </div>
        <div className="dash-insights-actions">
          <div>
            <label className="form-label-elegant">{t('adminDashboard.insightsPayPeriod')}</label>
            <select
              className="form-input-elegant"
              value={insightsPeriodMonth}
              onChange={(e) => onInsightsPeriodChange(e.target.value)}
            >
              {insightsPeriodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-elegant btn-primary" onClick={onRefresh} disabled={summaryLoading}>
            {summaryLoading ? t('adminDashboard.insightsLoading') : t('adminDashboard.refresh')}
          </button>
          {employeeSummary && (
            <>
              <button type="button" className="btn-elegant" onClick={handleExportCsv}>
                {t('adminDashboard.exportCsv')}
              </button>
              <button type="button" className="btn-elegant" onClick={handlePrint}>
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {employeeSummary && (
        <>
          <div className="dash-insights-stat-grid">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="dash-insight-stat">
                <div className="dash-insight-stat-value">{stat.value}</div>
                <div className="dash-insight-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="dash-insights-table-wrap">
            <div className="dash-insights-table-head">
              <h3>All Employees Data</h3>
              <span className="dash-insights-table-meta">
                {employeeSummary.allEmployees?.length || 0} employees |{' '}
                {employeeSummary.periodLabel || employeeSummary.currentMonth}
              </span>
            </div>
            <div className="dash-insights-table-scroll">
              <table id="employee-insights-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Employee</th>
                    <th style={{ textAlign: 'left' }}>Department</th>
                    <th style={{ textAlign: 'center' }}>Vacation Days</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>Late</th>
                    <th style={{ textAlign: 'center' }}>{t('adminDashboard.insightsColDeductionDays')}</th>
                    <th style={{ textAlign: 'center' }}>{t('adminDashboard.insightsColOtHours')}</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummary.allEmployees?.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{emp.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.email}</div>
                      </td>
                      <td>{emp.department}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={vacationBadgeClass(emp.vacationDaysLeft)}>{emp.vacationDaysLeft}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={badgeClass('good')}>{emp.presentDays || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={absenceBadgeClass(emp.absentDays || 0)}>{emp.absentDays || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={(emp.lateDays || 0) > 5 ? badgeClass('warn') : badgeClass('neutral')}>
                          {emp.lateDays || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={(emp.deductions || 0) > 0 ? badgeClass('bad') : badgeClass('neutral')}
                          title={emp.deductions > 0 ? `A: ${emp.pillarADays} | B: ${emp.pillarBDays} | C: ${emp.pillarCDays}` : ''}
                        >
                          {emp.deductions > 0 ? Number(emp.deductions).toFixed(4) : '0'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={(emp.totalOtHours ?? 0) > 0 ? badgeClass('good') : badgeClass('neutral')}>
                          {Number(emp.totalOtHours ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={attendanceBadgeClass(emp.attendanceRate)}>
                          {emp.attendanceRate !== '-' ? `${emp.attendanceRate}%` : 'No data'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!employeeSummary.allEmployees || employeeSummary.allEmployees.length === 0) && (
              <div className="dash-insights-empty">No employee data available</div>
            )}
          </div>

          {hasAlerts && (
            <div id="employee-insights-alerts" className="dash-insights-alerts">
              {employeeSummary.summary.lowVacationCount > 0 && (
                <div className="dash-insights-alert dash-insights-alert--warn">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden="true">⚠️</span>
                  <div>
                    <div className="dash-insights-alert-title">
                      {employeeSummary.summary.lowVacationCount} {t('adminDashboard.insightsAlertEmployees')}
                    </div>
                    <div className="dash-insights-alert-desc">{t('adminDashboard.insightsAlertLowVacation')}</div>
                  </div>
                </div>
              )}
              {employeeSummary.summary.highAbsenceCount > 0 && (
                <div className="dash-insights-alert dash-insights-alert--danger">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden="true">🚨</span>
                  <div>
                    <div className="dash-insights-alert-title">
                      {employeeSummary.summary.highAbsenceCount} {t('adminDashboard.insightsAlertEmployees')}
                    </div>
                    <div className="dash-insights-alert-desc">{t('adminDashboard.insightsAlertHighAbsence')}</div>
                  </div>
                </div>
              )}
              {employeeSummary.summary.deductionCount > 0 && (
                <div className="dash-insights-alert dash-insights-alert--info">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden="true">⚡</span>
                  <div>
                    <div className="dash-insights-alert-title">
                      {employeeSummary.summary.deductionCount} {t('adminDashboard.insightsAlertEmployees')}
                    </div>
                    <div className="dash-insights-alert-desc">{t('adminDashboard.insightsAlertDeductions')}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!employeeSummary && !summaryLoading && (
        <div className="dash-insights-no-data">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">📊</div>
          <div>{t('adminDashboard.noInsightsData')}</div>
        </div>
      )}
    </div>
  );
}
