import React, { useCallback, useEffect, useMemo, useState } from 'react';
import API_URL from '../../config/api';
import {
  ANNUAL_LEAVE_QUOTA,
  CASUAL_LEAVE_QUOTA,
  LOW_ANNUAL_BALANCE,
  LOW_CASUAL_BALANCE,
  BalanceBadge,
  StatusBadge
} from './vacationBalanceUi';
import {
  REPORT_SCROLL_TABLE_CSS,
  ReportScrollTable
} from '../ReportTableNav';

function emptyEdits() {
  return {};
}

const VacationManagerModal = ({ open, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [edits, setEdits] = useState(emptyEdits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/vacation-days-report`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(Array.isArray(data) ? data : []);
        setEdits(emptyEdits());
      } else {
        setError(data.msg || 'Failed to fetch employees.');
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
    fetchEmployees();
  }, [open, fetchEmployees]);

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (departmentFilter && emp.department !== departmentFilter) return false;
      if (!q) return true;
      return [emp.name, emp.email, emp.department].some((field) =>
        String(field ?? '').toLowerCase().includes(q)
      );
    });
  }, [employees, search, departmentFilter]);

  const getAnnualValue = (emp) =>
    edits[emp._id]?.annual !== undefined ? edits[emp._id].annual : emp.vacationDaysLeft;

  const getCasualValue = (emp) =>
    edits[emp._id]?.casual !== undefined ? edits[emp._id].casual : emp.casualDaysLeft;

  const isDirty = (emp) => {
    const edit = edits[emp._id];
    if (!edit) return false;
    if (edit.annual !== undefined && Number(edit.annual) !== Number(emp.vacationDaysLeft)) return true;
    if (edit.casual !== undefined && Number(edit.casual) !== Number(emp.casualDaysLeft)) return true;
    return false;
  };

  const handleEdit = (userId, field, value) => {
    setSuccess('');
    setEdits((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const handleSave = async (emp) => {
    setError('');
    setSuccess('');
    const annual = Number(getAnnualValue(emp));
    const casual = Number(getCasualValue(emp));

    if (Number.isNaN(annual) || annual < 0) {
      setError(`Invalid annual balance for ${emp.name}.`);
      return;
    }
    if (Number.isNaN(casual) || casual < 0) {
      setError(`Invalid casual balance for ${emp.name}.`);
      return;
    }

    const body = {};
    if (annual !== Number(emp.vacationDaysLeft)) body.vacationDaysLeft = annual;
    if (casual !== Number(emp.casualDaysLeft ?? 0)) body.casualDaysLeft = casual;

    if (Object.keys(body).length === 0) {
      setSuccess('No changes to save.');
      return;
    }

    setSavingId(emp._id);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/users/${emp._id}/vacation-days`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees((rows) =>
          rows.map((row) =>
            row._id === emp._id
              ? {
                  ...row,
                  vacationDaysLeft: body.vacationDaysLeft ?? row.vacationDaysLeft,
                  casualDaysLeft: body.casualDaysLeft ?? row.casualDaysLeft
                }
              : row
          )
        );
        setEdits((prev) => {
          const next = { ...prev };
          delete next[emp._id];
          return next;
        });
        setSuccess(`Updated leave balances for ${emp.name}.`);
      } else {
        setError(data.msg || 'Failed to update leave balances.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setSavingId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-elegant saas-vacation-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vacation-manager-title"
      onClick={onClose}
    >
      <style>{REPORT_SCROLL_TABLE_CSS}</style>
      <div
        className="saas-vacation-report saas-vacation-manager bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="saas-vacation-report-header">
          <div>
            <h2
              id="vacation-manager-title"
              className="!text-slate-900 dark:!text-white saas-panel-heading"
              style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}
            >
              Manage Leave Balances
            </h2>
            <p className="saas-section-subtitle" style={{ margin: '0.35rem 0 0' }}>
              Adjust annual ({ANNUAL_LEAVE_QUOTA} Days) and casual ({CASUAL_LEAVE_QUOTA} Days) balances per employee
            </p>
          </div>
          <button type="button" className="saas-vacation-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
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
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="saas-vacation-loading">
            <div className="spinner-elegant" />
            <p className="!text-slate-700 dark:!text-slate-200">Loading employees…</p>
          </div>
        )}

        {error && (
          <div className="saas-vacation-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="saas-vacation-success" role="status">
            {success}
          </div>
        )}

        {!loading && (
          <ReportScrollTable className="saas-vacation-table-wrap" maxHeight={520}>
            <table className="ot-reconciliation-table saas-table vacation-report-table vacation-manager-table">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">
                    Department
                  </th>
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                    Annual ({ANNUAL_LEAVE_QUOTA} Days)
                  </th>
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                    Casual ({CASUAL_LEAVE_QUOTA} Days)
                  </th>
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                    Status
                  </th>
                  <th className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 saas-th-center">
                    Actions
                  </th>
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
                  filteredRows.map((emp) => {
                    const annualValue = getAnnualValue(emp);
                    const casualValue = getCasualValue(emp);
                    const annualNum = Number(annualValue ?? 0);
                    const casualNum = Number(casualValue ?? 0);
                    const dirty = isDirty(emp);

                    return (
                      <tr key={emp._id}>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3">
                          <div className="saas-vacation-manager-name">{emp.name}</div>
                          <div className="saas-vacation-manager-email">{emp.email}</div>
                        </td>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3">{emp.department || '—'}</td>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={annualValue ?? ''}
                            onChange={(e) => handleEdit(emp._id, 'annual', e.target.value)}
                            className="saas-vacation-balance-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2"
                            aria-label={`Annual leave balance for ${emp.name}`}
                          />
                          <BalanceBadge
                            remaining={annualNum}
                            quota={ANNUAL_LEAVE_QUOTA}
                            lowThreshold={LOW_ANNUAL_BALANCE}
                            label="Annual"
                          />
                        </td>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={casualValue ?? ''}
                            onChange={(e) => handleEdit(emp._id, 'casual', e.target.value)}
                            className="saas-vacation-balance-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2"
                            aria-label={`Casual leave balance for ${emp.name}`}
                          />
                          <BalanceBadge
                            remaining={casualNum}
                            quota={CASUAL_LEAVE_QUOTA}
                            lowThreshold={LOW_CASUAL_BALANCE}
                            label="Casual"
                          />
                        </td>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                          <StatusBadge annualLeft={annualNum} casualLeft={casualNum} />
                        </td>
                        <td className="!text-slate-900 dark:!text-white px-4 py-3 saas-td-center">
                          <button
                            type="button"
                            className={`btn-elegant saas-vacation-save-btn ${dirty ? 'btn-primary-elegant' : 'btn-secondary-elegant saas-btn-secondary'}`}
                            onClick={() => handleSave(emp)}
                            disabled={!dirty || savingId === emp._id}
                          >
                            {savingId === emp._id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ReportScrollTable>
        )}

        <div className="saas-vacation-report-footer">
          <button type="button" className="btn-elegant btn-secondary-elegant saas-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VacationManagerModal;
