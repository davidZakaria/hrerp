import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';

export default function UserDepartmentRepairModal({ open, onClose, onApplied, isSuperAdmin }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [rows, setRows] = useState([]);
  const [excelDeptMap, setExcelDeptMap] = useState({});
  const [canonicalDepartments, setCanonicalDepartments] = useState([]);
  const [modificationReason, setModificationReason] = useState('Department repair from NJD directory compare');

  const selectedFixCount = rows.filter((r) => r.apply).length;

  const systemDeptSummary = useMemo(() => {
    if (!report?.systemDepartmentsInUse) return [];
    return Object.entries(report.systemDepartmentsInUse).sort((a, b) => b[1] - a[1]);
  }, [report]);

  if (!open) return null;

  const reset = () => {
    setReport(null);
    setRows([]);
    setExcelDeptMap({});
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runCompare = async (file, mapping = excelDeptMap) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('departmentMapping', JSON.stringify(mapping));
    const token = localStorage.getItem('token');
    const res = await axios.post(`${API_URL}/api/users/import/department-compare`, formData, {
      headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
    });
    setReport(res.data);
    setCanonicalDepartments(res.data.canonicalDepartments || []);
    setRows(res.data.rows || []);
    const initialMap = {};
    (res.data.excelDepartments || []).forEach((d) => {
      initialMap[d.excelDepartment] = mapping[d.excelDepartment] || d.mapped || d.suggested || '';
    });
    setExcelDeptMap((prev) => ({ ...initialMap, ...prev, ...mapping }));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await runCompare(file, {});
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
      reset();
    } finally {
      setLoading(false);
    }
  };

  const remapping = async (nextMap) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      await runCompare(file, nextMap);
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelMapChange = (excelDepartment, canonical) => {
    const next = { ...excelDeptMap, [excelDepartment]: canonical };
    setExcelDeptMap(next);
    remapping(next);
  };

  const restoreAllBeforeImport = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        apply: !!r.departmentBeforeImport,
        proposedDepartment: r.departmentBeforeImport || r.proposedDepartment
      }))
    );
  };

  const useSuggestedForAll = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        apply: !!(r.suggestedDepartment || r.proposedDepartment),
        proposedDepartment: r.suggestedDepartment || r.proposedDepartment
      }))
    );
  };

  const handleApplyFixes = async () => {
    setApplying(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = rows.map((r) => ({
        userId: r.userId,
        apply: !!r.apply,
        proposedDepartment: r.proposedDepartment
      }));
      const res = await axios.post(
        `${API_URL}/api/users/import/fix-departments`,
        { rows: payload, modificationReason },
        { headers: { 'x-auth-token': token } }
      );
      if (onApplied) onApplied(res.data);
      reset();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleResetManagers = async () => {
    if (!window.confirm(t('deptRepair.resetManagersConfirm'))) return;
    setResetting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/users/managers/reset-scopes`,
        { confirm: 'RESET_MANAGERS', modificationReason: 'Reset all manager scopes for reassignment' },
        { headers: { 'x-auth-token': token } }
      );
      if (onApplied) onApplied({ resetManagers: true });
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="modal-elegant user-import-modal" onClick={onClose}>
      <div
        className="modal-content-elegant user-import-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '98vw', width: '1280px' }}
      >
        <div className="modal-header-elegant">
          <h2>{t('deptRepair.title')}</h2>
          <button type="button" className="modal-close-elegant" onClick={onClose}>×</button>
        </div>

        <div className="user-import-body">
          <p className="user-import-desc">{t('deptRepair.description')}</p>

          <div className="user-import-upload-row">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
            {loading && <span>{t('deptRepair.loading')}</span>}
          </div>

          {report?.summary && (
            <div className="user-import-summary">
              <span>{t('deptRepair.needsFix', { count: report.summary.needsFix })}</span>
              <span>{t('deptRepair.managers', { count: report.summary.managers })}</span>
              <span>{t('deptRepair.nonCanonical', { count: report.summary.nonCanonicalInSystem })}</span>
            </div>
          )}

          {isSuperAdmin && (
            <div className="user-import-actions-row">
              <button type="button" className="btn-elegant btn-danger" disabled={resetting} onClick={handleResetManagers}>
                {resetting ? t('deptRepair.resetting') : t('deptRepair.resetManagers')}
              </button>
              <span className="user-import-columns-hint">{t('deptRepair.resetManagersHint')}</span>
            </div>
          )}

          {(report?.excelDepartments || []).length > 0 && (
            <>
              <h3 className="user-import-section-title">{t('deptRepair.excelMappingTitle')}</h3>
              <div className="user-import-table-wrap" style={{ maxHeight: '220px', marginBottom: '1rem' }}>
                <table className="user-import-table">
                  <thead>
                    <tr>
                      <th>{t('deptRepair.excelDept')}</th>
                      <th>{t('deptRepair.count')}</th>
                      <th>{t('deptRepair.mapToSystem')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.excelDepartments.map((d) => (
                      <tr key={d.excelDepartment}>
                        <td>{d.excelDepartment}{!d.isValidExcel ? ' ⚠' : ''}</td>
                        <td>{d.count}</td>
                        <td>
                          <select
                            className="user-import-cell-input"
                            value={excelDeptMap[d.excelDepartment] || ''}
                            onChange={(e) => handleExcelMapChange(d.excelDepartment, e.target.value)}
                          >
                            <option value="">{t('deptRepair.pickDepartment')}</option>
                            {canonicalDepartments.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {systemDeptSummary.length > 0 && (
            <>
              <h3 className="user-import-section-title">{t('deptRepair.systemInUseTitle')}</h3>
              <div className="user-import-summary" style={{ marginBottom: '1rem' }}>
                {systemDeptSummary.map(([dept, count]) => (
                  <span key={dept}>{dept}: {count}</span>
                ))}
              </div>
            </>
          )}

          {rows.length > 0 && (
            <>
              <div className="user-import-actions-row">
                <button type="button" className="btn-elegant" onClick={restoreAllBeforeImport}>
                  {t('deptRepair.restoreBeforeImport')}
                </button>
                <button type="button" className="btn-elegant" onClick={useSuggestedForAll}>
                  {t('deptRepair.useSuggested')}
                </button>
                <label className="user-import-reason-label">
                  {t('userImport.reasonLabel')}
                  <input
                    type="text"
                    className="form-mgmt-select user-import-reason-input"
                    value={modificationReason}
                    onChange={(e) => setModificationReason(e.target.value)}
                  />
                </label>
              </div>

              <div className="user-import-table-wrap">
                <table className="user-import-table">
                  <thead>
                    <tr>
                      <th>{t('userImport.apply')}</th>
                      <th>{t('common.name')}</th>
                      <th>{t('common.employeeCode')}</th>
                      <th>{t('deptRepair.currentDept')}</th>
                      <th>{t('deptRepair.excelDept')}</th>
                      <th>{t('deptRepair.beforeImport')}</th>
                      <th>{t('deptRepair.fixTo')}</th>
                      <th>{t('adminDashboard.roleLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.userId} className={row.apply ? 'user-import-row--selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!row.apply}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.userId === row.userId ? { ...r, apply: e.target.checked } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td>{row.name}</td>
                        <td>{row.employeeCode || '—'}</td>
                        <td>{row.currentDepartment || '—'}</td>
                        <td>{row.excelDepartmentRaw || '—'}</td>
                        <td>{row.departmentBeforeImport || '—'}</td>
                        <td>
                          <select
                            className="user-import-cell-input"
                            value={row.proposedDepartment || ''}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.userId === row.userId
                                    ? { ...r, proposedDepartment: e.target.value, apply: true }
                                    : r
                                )
                              )
                            }
                          >
                            <option value="">{t('deptRepair.pickDepartment')}</option>
                            {canonicalDepartments.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            {row.proposedDepartment && !canonicalDepartments.includes(row.proposedDepartment) && (
                              <option value={row.proposedDepartment}>{row.proposedDepartment}</option>
                            )}
                          </select>
                        </td>
                        <td>{row.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {error && <div className="user-import-error">{error}</div>}
        </div>

        <div className="modal-footer-elegant user-import-footer">
          <button type="button" className="btn-elegant" onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className="btn-elegant btn-success"
            disabled={applying || selectedFixCount === 0}
            onClick={handleApplyFixes}
          >
            {applying ? t('deptRepair.applying') : t('deptRepair.applyFixes', { count: selectedFixCount })}
          </button>
        </div>
      </div>
    </div>
  );
}
