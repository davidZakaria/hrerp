import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const ManagerTeamAttendance = () => {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchTeamReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/months`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableMonths(data.months);
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const fetchTeamReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/team-report/${selectedMonth}`, {
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
    try {
      const res = await fetch(
        `${API_URL}/api/attendance/team-employee/${employee.user.id}/${selectedMonth}`,
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: { background: '#22c55e', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      late: { background: '#f97316', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      absent: { background: '#ef4444', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      excused: { background: '#3b82f6', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      on_leave: { background: '#a855f7', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      wfh: { background: '#06b6d4', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }
    };
    const labels = {
      wfh: 'WFH',
      on_leave: 'ON LEAVE'
    };
    return (
      <span style={styles[status] || styles.present}>
        {labels[status] || status.replace('_', ' ').toUpperCase()}
      </span>
    );
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
            {t('managerDashboard.selectMonth', 'Select Month')}:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input-elegant"
            style={{ maxWidth: '200px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '12px 16px' }}
          >
            <option value={getCurrentMonth()}>{t('managerDashboard.currentMonth', 'Current Month')}</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
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
            style={{ width: '100%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '12px 16px' }}
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
          {attendanceReport.totalEmployees === 0 ? (
            <div className="no-content" style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.7)' }}>
              <span className="no-content-icon" style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>👥</span>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{t('managerDashboard.noTeamMembersInManagedDepts', 'No team members in your managed departments')}</p>
              <small style={{ fontStyle: 'italic' }}>{t('managerDashboard.noTeamMembersHint', 'Ask HR to assign employees to your departments or verify your managed departments.')}</small>
            </div>
          ) : (
            <>
              {attendanceReport.overtimeSummary && attendanceReport.overtimeSummary.totalOvertimeMinutes > 0 && (
                <div style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.05) 100%)', border: '1px solid rgba(33, 150, 243, 0.3)', borderRadius: '12px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>{t('managerDashboard.overtimeSummary', 'Overtime Summary')}</h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{attendanceReport.overtimeSummary.totalOvertimeHours}h {t('managerDashboard.totalOvertime', 'total overtime')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{attendanceReport.overtimeSummary.employeesWithOvertime.length} {t('managerDashboard.employeesWithOvertime', 'employees with overtime')}</span>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                <strong>{t('managerDashboard.totalEmployees', 'Total Employees')}:</strong> {attendanceReport.totalEmployees}
                {searchQuery && (
                  <span style={{ marginLeft: '1rem', color: '#60a5fa' }}>
                    ({t('managerDashboard.showingResults', 'Showing')} {filteredReport.length} {t('managerDashboard.results', 'results')})
                  </span>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'separate', borderSpacing: '0', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '140px' }}>{t('managerDashboard.employee', 'Employee')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '70px' }}>{t('managerDashboard.code', 'Code')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '110px' }}>{t('managerDashboard.department', 'Department')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '50px' }}>{t('managerDashboard.days', 'Days')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.present', 'Present')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fb923c', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '50px' }}>{t('managerDashboard.late', 'Late')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.absent', 'Absent')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#c084fc', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '55px' }}>{t('managerDashboard.leave', 'Leave')}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#38bdf8', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '45px' }}>WFH</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#60a5fa', fontWeight: '600', borderBottom: '2px solid rgba(255,255,255,0.2)', minWidth: '60px' }}>{t('managerDashboard.excused', 'Excused')}</th>
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
                          {(emp.stats.wfh || 0) > 0 ? <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem' }}>{emp.stats.wfh}</span> : <span style={{ color: '#64748b' }}>0</span>}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#60a5fa', fontWeight: '600' }}>{emp.stats.excused || 0}</td>
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
                          <button onClick={() => viewEmployeeDetails(emp)} className="btn-manager" style={{ padding: '6px 14px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #2196F3, #1976D2)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
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

      {showEmployeeDetail && selectedEmployee && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowEmployeeDetail(false)}
        >
          <div
            className="attendance-modal-custom"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#f5f5f5', borderRadius: '12px', padding: '2rem', maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
          >
            <h3 style={{ marginBottom: '1.5rem', color: '#000', fontWeight: 'bold', fontSize: '1.5rem', textAlign: 'center' }}>
              {t('managerDashboard.attendanceDetails', 'Attendance Details')} - {selectedEmployee.user.name}
            </h3>
            <div style={{ marginBottom: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div><strong style={{ color: '#000' }}>{t('managerDashboard.employeeCode', 'Employee Code')}:</strong> <span>{selectedEmployee.user.employeeCode || 'N/A'}</span></div>
                <div><strong style={{ color: '#000' }}>{t('managerDashboard.department', 'Department')}:</strong> <span>{selectedEmployee.user.department}</span></div>
                <div><strong style={{ color: '#000' }}>{t('managerDashboard.workSchedule', 'Work Schedule')}:</strong> <span>{selectedEmployee.user.workSchedule ? `${selectedEmployee.user.workSchedule.startTime} - ${selectedEmployee.user.workSchedule.endTime}` : 'Default (10:00-19:00)'}</span></div>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('managerDashboard.summaryStats', 'Summary Statistics')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '2px solid #4CAF50' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000' }}>{selectedEmployee.stats.present}</div>
                  <div style={{ fontSize: '0.9rem', color: '#000', fontWeight: '600' }}>{t('managerDashboard.present', 'Present')}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '2px solid #FF9800' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000' }}>{selectedEmployee.stats.late}</div>
                  <div style={{ fontSize: '0.9rem', color: '#000', fontWeight: '600' }}>{t('managerDashboard.late', 'Late')}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '2px solid #F44336' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000' }}>{selectedEmployee.stats.unexcusedAbsences}</div>
                  <div style={{ fontSize: '0.9rem', color: '#000', fontWeight: '600' }}>{t('managerDashboard.absent', 'Unexcused Absences')}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '2px solid #2196F3' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000' }}>{selectedEmployee.stats.excused}</div>
                  <div style={{ fontSize: '0.9rem', color: '#000', fontWeight: '600' }}>{t('managerDashboard.excused', 'Excused')}</div>
                </div>
                <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '2px solid #9C27B0' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#000' }}>{selectedEmployee.stats.onLeave || 0}</div>
                  <div style={{ fontSize: '0.9rem', color: '#000', fontWeight: '600' }}>{t('managerDashboard.onLeave', 'On Leave')}</div>
                </div>
              </div>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto', background: '#fff', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{t('managerDashboard.dailyAttendance', 'Daily Attendance')}</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.date', 'Date')}</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.clockIn', 'Clock In')}</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.clockOut', 'Clock Out')}</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.status', 'Status')}</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.late', 'Late')}</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#000', fontWeight: 'bold' }}>{t('managerDashboard.overtime', 'Overtime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployee.records && selectedEmployee.records.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '10px', color: '#000', fontSize: '0.9rem' }}>{formatDate(record.date)}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>{record.missedClockIn ? <span style={{ color: '#F44336', fontWeight: 'bold' }}>MISSED</span> : record.clockIn || '-'}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>{record.missedClockOut ? <span style={{ color: '#FF9800', fontWeight: 'bold' }}>MISSED</span> : record.clockOut || '-'}</td>
                      <td style={{ padding: '10px' }}>{getStatusBadge(record.status)}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>{record.minutesLate > 0 ? <span style={{ color: '#F44336', fontWeight: 'bold' }}>{record.minutesLate}m</span> : '-'}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>{record.minutesOvertime > 0 ? <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>+{record.minutesOvertime}m</span> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setShowEmployeeDetail(false)} style={{ padding: '0.75rem 2rem', backgroundColor: '#4a90e2', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ManagerTeamAttendance;
