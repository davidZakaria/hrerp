import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';
import EmployeeAttendanceDetailModal from './EmployeeAttendanceDetailModal';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

const ManagerTeamAttendance = () => {
  const { t } = useTranslation();
  const [rangeStart, setRangeStart] = useState(() => getDefaultDateRange().startDate);
  const [rangeEnd, setRangeEnd] = useState(() => getDefaultDateRange().endDate);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (rangeStart && rangeEnd) {
      fetchTeamReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd]);

  const fetchTeamReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/team-report?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceReport(data);
      } else {
        setError(data.msg || t('managerDashboard.teamAttendanceFetchError', 'Failed to fetch team attendance'));
      }
    } catch (err) {
      setError(t('managerDashboard.serverError', 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const viewEmployeeDetails = async (employee) => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
    try {
      const res = await fetch(
        `${API_URL}/api/attendance/team-employee/${employee.user.id}/detail?${qs}`,
        { headers: { 'x-auth-token': token } }
      );
      const data = await res.json();
      if (res.ok) {
        setSelectedEmployee(data);
        setShowEmployeeDetail(true);
      } else {
        setError(data.msg || t('managerDashboard.employeeDetailFetchError', 'Failed to fetch employee details'));
      }
    } catch (err) {
      setError(t('managerDashboard.serverError', 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const filterReport = (report) => {
    if (!report) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return report;
    return report.filter(emp =>
      (emp.user.name || '').toLowerCase().includes(q) ||
      (emp.user.employeeCode || '').toLowerCase().includes(q) ||
      (emp.user.department || '').toLowerCase().includes(q)
    );
  };

  const filteredReport = filterReport(attendanceReport?.report || []);

  return (
    <div className="manager-team-attendance section">
      <style>{`
        .manager-team-attendance .attendance-modal-custom * {
          color: #000000 !important;
        }
        .manager-team-attendance .attendance-modal-custom h3, .manager-team-attendance .attendance-modal-custom h4, .manager-team-attendance .attendance-modal-custom strong, .manager-team-attendance .attendance-modal-custom span, .manager-team-attendance .attendance-modal-custom div {
          color: #000000 !important;
        }
      `}</style>
      <div className="section-header">
        <h2>{t('managerDashboard.teamAttendance', 'Team Attendance')}</h2>
        <small className="section-subtitle">
          {t('managerDashboard.teamAttendanceDescription', 'View and search your team members\' attendance for the selected month')}
        </small>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label-elegant" style={{ color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            {t('managerDashboard.startDate', 'Start date')}
          </label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="form-input-elegant"
            style={{ maxWidth: '180px', background: 'rgba(12,10,8,0.65)', color: '#fff', border: '2px solid rgba(201,162,39,0.35)', borderRadius: '8px', padding: '12px 16px' }}
          />
        </div>
        <div>
          <label className="form-label-elegant" style={{ color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            {t('managerDashboard.endDate', 'End date')}
          </label>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="form-input-elegant"
            style={{ maxWidth: '180px', background: 'rgba(12,10,8,0.65)', color: '#fff', border: '2px solid rgba(201,162,39,0.35)', borderRadius: '8px', padding: '12px 16px' }}
          />
        </div>
        <div>
          <button
            type="button"
            className="btn-manager"
            style={{ padding: '12px 16px', marginTop: '22px' }}
            onClick={() => {
              const d = getDefaultDateRange();
              setRangeStart(d.startDate);
              setRangeEnd(d.endDate);
            }}
          >
            {t('managerDashboard.currentMonth', 'This month')}
          </button>
        </div>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label className="form-label-elegant" style={{ color: '#fff', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            {t('managerDashboard.searchEmployee', 'Search Employee')}:
          </label>
          <input
            type="text"
            placeholder={t('managerDashboard.searchEmployeePlaceholder', 'Search by name, code, or department...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input-elegant"
            style={{ width: '100%', background: 'rgba(12,10,8,0.65)', color: '#fff', border: '2px solid rgba(201,162,39,0.35)', borderRadius: '8px', padding: '12px 16px' }}
          />
        </div>
      </div>

      {error && (
        <div className="message error" style={{ marginBottom: '1rem', padding: '15px', borderRadius: '8px', background: 'rgba(244, 67, 54, 0.2)', color: '#f44336', border: '1px solid rgba(244, 67, 54, 0.4)' }}>
          {error}
        </div>
      )}
      {loading && (
        <div className="loading-container" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>{t('managerDashboard.loading', 'Loading...')}</p>
        </div>
      )}

      {attendanceReport && !loading && (
        <>
          {attendanceReport.kpi && (
            <div className="attendance-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="attendance-kpi-card" style={{ padding: '0.75rem', background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: '8px', textAlign: 'center', color: '#111827' }}>
                <div className="kpi-value kpi-value--present" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#14532d' }}>{attendanceReport.kpi.totalPresent}</div>
                <div className="kpi-label" style={{ fontSize: '0.75rem', color: '#111827', fontWeight: 600 }}>Present days</div>
              </div>
              <div className="attendance-kpi-card" style={{ padding: '0.75rem', background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)', borderRadius: '8px', textAlign: 'center', color: '#111827' }}>
                <div className="kpi-value kpi-value--absences" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#991b1b' }}>{attendanceReport.kpi.totalAbsences}</div>
                <div className="kpi-label" style={{ fontSize: '0.75rem', color: '#111827', fontWeight: 600 }}>Absences</div>
              </div>
              <div className="attendance-kpi-card" style={{ padding: '0.75rem', background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '8px', textAlign: 'center', color: '#111827' }}>
                <div className="kpi-value kpi-value--late" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9a3412' }}>{attendanceReport.kpi.totalLateHours}h</div>
                <div className="kpi-label" style={{ fontSize: '0.75rem', color: '#111827', fontWeight: 600 }}>Late hours</div>
              </div>
              <div className="attendance-kpi-card" style={{ padding: '0.75rem', background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.35)', borderRadius: '8px', textAlign: 'center', color: '#111827' }}>
                <div className="kpi-value kpi-value--missed" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6b4f1e' }}>{attendanceReport.kpi.pendingMissedPunches}</div>
                <div className="kpi-label" style={{ fontSize: '0.75rem', color: '#111827', fontWeight: 600 }}>Missed punches</div>
              </div>
            </div>
          )}
          {attendanceReport.totalEmployees === 0 ? (
            <div className="no-content" style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.7)' }}>
              <span className="no-content-icon" style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>👥</span>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{t('managerDashboard.noTeamMembersInManagedDepts', 'No team members in your managed departments')}</p>
              <small style={{ fontStyle: 'italic' }}>{t('managerDashboard.noTeamMembersHint', 'Ask HR to assign employees to your departments or verify your managed departments.')}</small>
            </div>
          ) : (
            <>
              {attendanceReport.overtimeSummary && attendanceReport.overtimeSummary.totalOvertimeMinutes > 0 && (
                <div style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.12) 0%, rgba(107, 79, 30, 0.06) 100%)', border: '1px solid rgba(201, 162, 39, 0.35)', borderRadius: '12px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#e5c76b' }}>{t('managerDashboard.overtimeSummary', 'Overtime Summary')}</h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{attendanceReport.overtimeSummary.totalOvertimeHours}h {t('managerDashboard.totalOvertime', 'total overtime')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{attendanceReport.overtimeSummary.employeesWithOvertime.length} {t('managerDashboard.employeesWithOvertime', 'employees with overtime')}</span>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                <strong>{t('managerDashboard.totalEmployees', 'Total Employees')}:</strong> {attendanceReport.totalEmployees}
                {searchQuery && (
                  <span style={{ marginLeft: '1rem', color: '#e5c76b' }}>
                    ({t('managerDashboard.showingResults', 'Showing')} {filteredReport.length} {t('managerDashboard.results', 'results')})
                  </span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'separate', borderSpacing: '0', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(12,10,8,0.45)', boxShadow: 'inset 0 -2px 0 rgba(201,162,39,0.35)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '140px' }}>{t('managerDashboard.employee', 'Employee')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '70px' }}>{t('managerDashboard.code', 'Code')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '110px' }}>{t('managerDashboard.department', 'Department')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '50px' }}>{t('managerDashboard.days', 'Days')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.present', 'Present')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fb923c', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '50px' }}>{t('managerDashboard.late', 'Late')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.absent', 'Absent')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#c084fc', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '55px' }}>{t('managerDashboard.leave', 'Leave')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#d4a84b', fontWeight: '600', borderBottom: '2px solid rgba(201,162,39,0.35)', minWidth: '45px' }}>WFH</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#e5c76b', fontWeight: '600', borderBottom: '2px solid rgba(201,162,39,0.35)', minWidth: '60px' }}>{t('managerDashboard.excused', 'Excused')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fbbf24', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '65px' }}>FP</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.deduct', 'Deduct')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '55px' }}>OT</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '100px' }}>{t('managerDashboard.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReport.map((emp, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: '500' }}>{emp.user.name}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <code style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {emp.user.employeeCode || 'N/A'}
                          </code>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#94a3b8', fontSize: '0.85rem' }}>{emp.user.department}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#cbd5e1', fontWeight: '600' }}>{emp.stats.totalDays}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600' }}>{emp.stats.present}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#fb923c', fontWeight: '600' }}>{emp.stats.late}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600' }}>{emp.stats.unexcusedAbsences}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#c084fc', fontWeight: '600' }}>{emp.stats.onLeave || 0}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.wfh || 0) > 0 ? <span style={{ background: 'rgba(201,162,39,0.2)', color: '#e5c76b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>{emp.stats.wfh}</span> : <span style={{ color: '#64748b' }}>0</span>}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#e5c76b', fontWeight: '600' }}>{emp.stats.excused || 0}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.fingerprintMisses || 0) > 0 ? <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{emp.stats.fingerprintMisses}</span> : <span style={{ color: '#64748b' }}>0</span>}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.totalFingerprintDeduction || 0) > 0 ? <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>-{emp.stats.totalFingerprintDeduction}</span> : <span style={{ color: '#64748b' }}>0</span>}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.totalMinutesOvertime || 0) > 0 ? <span style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>+{emp.stats.totalMinutesOvertime}</span> : <span style={{ color: '#64748b' }}>0</span>}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button onClick={() => viewEmployeeDetails(emp)} className="btn-manager" style={{ padding: '6px 14px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #c9a227, #6b4f1e)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            {t('managerDashboard.viewDetails', 'View Details')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <EmployeeAttendanceDetailModal
        open={showEmployeeDetail && !!selectedEmployee}
        onClose={() => setShowEmployeeDetail(false)}
        payload={selectedEmployee}
        canFixPunch={false}
        onFixed={async () => {
          if (selectedEmployee?.user?.id) await viewEmployeeDetails({ user: selectedEmployee.user });
        }}
      />

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ManagerTeamAttendance;
