import React, { useState, useEffect, useMemo } from 'react';
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

const KPI_CARD =
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm text-center';
const KPI_VALUE = '!text-indigo-600 dark:!text-indigo-400 text-2xl font-bold';
const KPI_LABEL =
  'text-xs uppercase tracking-wider font-semibold !text-slate-500 dark:!text-slate-400 mt-1';
const TH =
  'px-3 py-3 text-xs font-bold uppercase !text-slate-600 dark:!text-slate-400 whitespace-nowrap';
const TD = 'px-3 py-3 !text-slate-900 dark:!text-white text-sm';

function KpiCard({ value, label, valueClass = KPI_VALUE }) {
  return (
    <div className={KPI_CARD}>
      <div className={valueClass}>{value}</div>
      <div className={KPI_LABEL}>{label}</div>
    </div>
  );
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

  const filteredReport = useMemo(() => {
    const report = attendanceReport?.report || [];
    if (!report.length) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return report;
    return report.filter(emp =>
      (emp.user.name || '').toLowerCase().includes(q) ||
      (emp.user.employeeCode || '').toLowerCase().includes(q) ||
      (emp.user.department || '').toLowerCase().includes(q)
    );
  }, [attendanceReport?.report, searchQuery]);

  const setCurrentMonth = () => {
    const d = getDefaultDateRange();
    setRangeStart(d.startDate);
    setRangeEnd(d.endDate);
  };

  return (
    <div className="manager-team-attendance">
      <div className="mb-6">
        <h2 className="text-xl font-bold !text-slate-900 dark:!text-white m-0 mb-1">
          {t('managerDashboard.teamAttendance', 'Team Attendance')}
        </h2>
        <p className="text-sm !text-slate-500 dark:!text-slate-400 m-0">
          {t(
            'managerDashboard.teamAttendanceDescription',
            "View and search your team members' attendance for the selected month"
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-semibold !text-slate-700 dark:!text-slate-300 mb-1.5">
            {t('managerDashboard.startDate', 'Start date')}
          </label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="form-input-elegant max-w-[180px]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold !text-slate-700 dark:!text-slate-300 mb-1.5">
            {t('managerDashboard.endDate', 'End date')}
          </label>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="form-input-elegant max-w-[180px]"
          />
        </div>
        <div>
          <button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 !text-white rounded-lg px-4 py-2 border-none font-medium shadow-sm cursor-pointer"
            onClick={setCurrentMonth}
          >
            {t('managerDashboard.currentMonth', 'This month')}
          </button>
        </div>
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-semibold !text-slate-700 dark:!text-slate-300 mb-1.5">
            {t('managerDashboard.searchEmployee', 'Search Employee')}
          </label>
          <input
            type="text"
            placeholder={t(
              'managerDashboard.searchEmployeePlaceholder',
              'Search by name, code, or department...'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input-elegant w-full"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 !text-rose-700 dark:!text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-8 text-center">
          <div className="manager-attendance-spinner mx-auto mb-3" aria-hidden />
          <p className="!text-slate-600 dark:!text-slate-400 m-0">{t('managerDashboard.loading', 'Loading...')}</p>
        </div>
      )}

      {attendanceReport && !loading && (
        <>
          {attendanceReport.kpi && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard value={attendanceReport.kpi.totalPresent} label="Present days" />
              <KpiCard
                value={attendanceReport.kpi.totalAbsences}
                label="Absences"
                valueClass="!text-rose-600 dark:!text-rose-400 text-2xl font-bold"
              />
              <KpiCard
                value={`${attendanceReport.kpi.totalLateHours}h`}
                label="Late hours"
                valueClass="!text-amber-600 dark:!text-amber-400 text-2xl font-bold"
              />
              <KpiCard
                value={attendanceReport.kpi.pendingMissedPunches}
                label="Missed punches"
                valueClass="!text-violet-600 dark:!text-violet-400 text-2xl font-bold"
              />
            </div>
          )}

          {attendanceReport.totalEmployees === 0 ? (
            <div className="text-center py-10 !text-slate-500 dark:!text-slate-400">
              <span className="text-4xl block mb-3" aria-hidden>
                👥
              </span>
              <p className="!text-slate-900 dark:!text-white text-lg m-0 mb-1">
                {t('managerDashboard.noTeamMembersInManagedDepts', 'No team members in your managed departments')}
              </p>
              <small className="text-sm italic">
                {t(
                  'managerDashboard.noTeamMembersHint',
                  'Ask HR to assign employees to your departments or verify your managed departments.'
                )}
              </small>
            </div>
          ) : (
            <>
              {attendanceReport.overtimeSummary && attendanceReport.overtimeSummary.totalOvertimeMinutes > 0 && (
                <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                  <h4 className="m-0 mb-2 text-sm font-semibold !text-indigo-800 dark:!text-indigo-200">
                    {t('managerDashboard.overtimeSummary', 'Overtime Summary')}
                  </h4>
                  <div className="flex flex-wrap gap-4 text-sm !text-slate-700 dark:!text-slate-300">
                    <span>
                      {attendanceReport.overtimeSummary.totalOvertimeHours}h{' '}
                      {t('managerDashboard.totalOvertime', 'total overtime')}
                    </span>
                    <span>
                      {attendanceReport.overtimeSummary.employeesWithOvertime.length}{' '}
                      {t('managerDashboard.employeesWithOvertime', 'employees with overtime')}
                    </span>
                  </div>
                </div>
              )}

              <p className="mb-4 text-sm !text-slate-700 dark:!text-slate-300">
                <strong className="!text-slate-900 dark:!text-white">
                  {t('managerDashboard.totalEmployees', 'Total Employees')}:
                </strong>{' '}
                {attendanceReport.totalEmployees}
                {searchQuery && (
                  <span className="ml-3 !text-indigo-600 dark:!text-indigo-400">
                    ({t('managerDashboard.showingResults', 'Showing')} {filteredReport.length}{' '}
                    {t('managerDashboard.results', 'results')})
                  </span>
                )}
              </p>

              <div className="manager-team-table-wrap responsive-table-wrap overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className={`${TH} text-left min-w-[140px]`}>
                        {t('managerDashboard.employee', 'Employee')}
                      </th>
                      <th className={`${TH} text-center min-w-[70px]`}>{t('managerDashboard.code', 'Code')}</th>
                      <th className={`${TH} text-left min-w-[110px]`}>
                        {t('managerDashboard.department', 'Department')}
                      </th>
                      <th className={`${TH} text-center min-w-[50px]`}>{t('managerDashboard.days', 'Days')}</th>
                      <th className={`${TH} text-center min-w-[60px] !text-emerald-600 dark:!text-emerald-400`}>
                        {t('managerDashboard.present', 'Present')}
                      </th>
                      <th className={`${TH} text-center min-w-[50px] !text-amber-600 dark:!text-amber-400`}>
                        {t('managerDashboard.late', 'Late')}
                      </th>
                      <th className={`${TH} text-center min-w-[60px] !text-rose-600 dark:!text-rose-400`}>
                        {t('managerDashboard.absent', 'Absent')}
                      </th>
                      <th className={`${TH} text-center min-w-[55px] !text-violet-600 dark:!text-violet-400`}>
                        {t('managerDashboard.leave', 'Leave')}
                      </th>
                      <th className={`${TH} text-center min-w-[45px]`}>WFH</th>
                      <th className={`${TH} text-center min-w-[60px]`}>
                        {t('managerDashboard.excused', 'Excused')}
                      </th>
                      <th className={`${TH} text-center min-w-[65px]`}>FP</th>
                      <th className={`${TH} text-center min-w-[60px] !text-rose-600 dark:!text-rose-400`}>
                        {t('managerDashboard.deduct', 'Deduct')}
                      </th>
                      <th className={`${TH} text-center min-w-[55px] !text-emerald-600 dark:!text-emerald-400`}>
                        OT
                      </th>
                      <th className={`${TH} text-center min-w-[100px]`}>
                        {t('managerDashboard.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReport.map((emp, idx) => (
                      <tr
                        key={emp.user?.id || idx}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700'
                        }
                      >
                        <td className={`${TD} font-medium`}>{emp.user.name}</td>
                        <td className={`${TD} text-center`}>
                          <code className="bg-slate-100 dark:bg-slate-700 !text-slate-600 dark:!text-slate-300 px-1.5 py-0.5 rounded text-xs">
                            {emp.user.employeeCode || 'N/A'}
                          </code>
                        </td>
                        <td className={`${TD} !text-slate-600 dark:!text-slate-400`}>{emp.user.department}</td>
                        <td className={`${TD} text-center font-semibold`}>{emp.stats.totalDays}</td>
                        <td className={`${TD} text-center font-semibold !text-emerald-600 dark:!text-emerald-400`}>
                          {emp.stats.present}
                        </td>
                        <td className={`${TD} text-center font-semibold !text-amber-600 dark:!text-amber-400`}>
                          {emp.stats.late}
                        </td>
                        <td className={`${TD} text-center font-semibold !text-rose-600 dark:!text-rose-400`}>
                          {emp.stats.unexcusedAbsences}
                        </td>
                        <td className={`${TD} text-center font-semibold !text-violet-600 dark:!text-violet-400`}>
                          {emp.stats.onLeave || 0}
                        </td>
                        <td className={`${TD} text-center`}>
                          {(emp.stats.wfh || 0) > 0 ? (
                            <span className="bg-indigo-50 dark:bg-indigo-900/30 !text-indigo-700 dark:!text-indigo-300 px-2 py-0.5 rounded font-bold text-xs">
                              {emp.stats.wfh}
                            </span>
                          ) : (
                            <span className="!text-slate-400">0</span>
                          )}
                        </td>
                        <td className={`${TD} text-center font-semibold`}>{emp.stats.excused || 0}</td>
                        <td className={`${TD} text-center`}>
                          {(emp.stats.fingerprintMisses || 0) > 0 ? (
                            <span className="font-bold !text-amber-600 dark:!text-amber-400">
                              {emp.stats.fingerprintMisses}
                            </span>
                          ) : (
                            <span className="!text-slate-400">0</span>
                          )}
                        </td>
                        <td className={`${TD} text-center`}>
                          {(emp.stats.totalFingerprintDeduction || 0) > 0 ? (
                            <span className="bg-rose-50 dark:bg-rose-900/30 !text-rose-700 dark:!text-rose-300 px-2 py-0.5 rounded font-bold text-xs">
                              -{emp.stats.totalFingerprintDeduction}
                            </span>
                          ) : (
                            <span className="!text-slate-400">0</span>
                          )}
                        </td>
                        <td className={`${TD} text-center`}>
                          {(emp.stats.totalMinutesOvertime || 0) > 0 ? (
                            <span className="bg-emerald-50 dark:bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-300 px-2 py-0.5 rounded font-bold text-xs">
                              +{emp.stats.totalMinutesOvertime}
                            </span>
                          ) : (
                            <span className="!text-slate-400">0</span>
                          )}
                        </td>
                        <td className={`${TD} text-center`}>
                          <button
                            type="button"
                            onClick={() => viewEmployeeDetails(emp)}
                            className="bg-indigo-600 hover:bg-indigo-700 !text-white rounded-lg px-3 py-1.5 text-xs font-medium border-none shadow-sm cursor-pointer"
                          >
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
    </div>
  );
};

export default ManagerTeamAttendance;
