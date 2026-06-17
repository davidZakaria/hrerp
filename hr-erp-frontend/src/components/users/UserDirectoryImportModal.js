import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';

const STATUS_CLASS = {
  matched: 'user-import-status--matched',
  unchanged: 'user-import-status--unchanged',
  unmatched: 'user-import-status--unmatched',
  skipped: 'user-import-status--skipped',
  duplicate: 'user-import-status--duplicate'
};

const EDITABLE_FIELDS = [
  'employeeCode',
  'name',
  'nameArabic',
  'jobTitle',
  'department',
  'location',
  'nationalId'
];

function patchRow(row, field, value) {
  return { ...row, [field]: value, apply: row.userId ? row.apply : false };
}

export default function UserDirectoryImportModal({ open, onClose, onApplied, allUsers = [] }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [modificationReason, setModificationReason] = useState('NJD employee directory import');

  const departmentOptions = useMemo(() => {
    const fromRows = rows.map((r) => r.department).filter(Boolean);
    const fromUsers = allUsers.map((u) => u.department).filter(Boolean);
    return [...new Set([...fromRows, ...fromUsers])].sort((a, b) => a.localeCompare(b));
  }, [rows, allUsers]);

  const selectedCount = rows.filter((r) => r.apply).length;

  if (!open) return null;

  const resetPreview = () => {
    setSummary(null);
    setRows([]);
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/users/import/preview`, formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSummary(res.data.summary);
      setRows(res.data.rows || []);
      setFileName(res.data.fileName || file.name);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || t('userImport.parseFailed'));
      resetPreview();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!rows.length) return;
    setApplying(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = rows.map((row) => ({
        rowIndex: row.rowIndex,
        apply: !!row.apply,
        userId: row.userId || null,
        employeeCode: row.employeeCode || '',
        name: row.name || '',
        nameArabic: row.nameArabic || '',
        jobTitle: row.jobTitle || '',
        department: row.department || '',
        location: row.location || '',
        nationalId: row.nationalId || ''
      }));
      const res = await axios.post(
        `${API_URL}/api/users/import/apply`,
        { rows: payload, modificationReason },
        { headers: { 'x-auth-token': token } }
      );
      if (onApplied) onApplied(res.data);
      resetPreview();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || t('userImport.applyFailed'));
    } finally {
      setApplying(false);
    }
  };

  const linkUser = (rowIndex, userId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const user = allUsers.find((u) => String(u._id) === String(userId));
        if (!user) {
          return { ...row, userId: null, apply: false, status: 'unmatched' };
        }
        return {
          ...row,
          userId: String(user._id),
          status: 'matched',
          matchMethod: 'manual',
          apply: true,
          current: {
            name: user.name || '',
            nameArabic: user.nameArabic || '',
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            location: user.location || '',
            employeeCode: user.employeeCode || '',
            nationalId: user.nationalId || '',
            email: user.email || ''
          }
        };
      })
    );
  };

  return (
    <div className="modal-elegant user-import-modal" onClick={onClose}>
      <div
        className="modal-content-elegant user-import-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '96vw', width: '1200px' }}
      >
        <div className="modal-header-elegant">
          <h2>{t('userImport.title')}</h2>
          <button type="button" className="modal-close-elegant" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <div className="user-import-body">
          <p className="user-import-desc">{t('userImport.description')}</p>

          <div className="user-import-upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="user-import-file-input"
            />
            {fileName && <span className="user-import-file-name">{fileName}</span>}
            {loading && <span className="user-import-loading">{t('userImport.parsing')}</span>}
          </div>

          <p className="user-import-columns-hint">{t('userImport.columnsHint')}</p>

          {summary && (
            <div className="user-import-summary">
              <span>{t('userImport.total', { count: summary.total })}</span>
              <span>{t('userImport.matched', { count: summary.matched })}</span>
              <span>{t('userImport.unchanged', { count: summary.unchanged })}</span>
              <span>{t('userImport.unmatched', { count: summary.unmatched })}</span>
              <span>{t('userImport.skipped', { count: summary.skipped })}</span>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="user-import-actions-row">
                <button
                  type="button"
                  className="btn-elegant"
                  onClick={() => setRows((prev) => prev.map((r) => ({ ...r, apply: r.userId && r.status !== 'skipped' && r.status !== 'duplicate' })))}
                >
                  {t('userImport.selectAllMatched')}
                </button>
                <button
                  type="button"
                  className="btn-elegant"
                  onClick={() => setRows((prev) => prev.map((r) => ({ ...r, apply: false })))}
                >
                  {t('userImport.clearSelection')}
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
                      <th>{t('userImport.status')}</th>
                      <th>{t('common.employeeCode')}</th>
                      <th>{t('userImport.nameEn')}</th>
                      <th>{t('userImport.nameAr')}</th>
                      <th>{t('userImport.jobTitle')}</th>
                      <th>{t('common.department')}</th>
                      <th>{t('userImport.location')}</th>
                      <th>{t('userImport.linkUser')}</th>
                      <th>{t('userImport.currentEmail')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowIndex} className={row.apply ? 'user-import-row--selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!row.apply}
                            disabled={!row.userId || row.status === 'skipped'}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.rowIndex === row.rowIndex ? { ...r, apply: e.target.checked } : r
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <span className={`user-import-status ${STATUS_CLASS[row.status] || ''}`}>
                            {t(`userImport.status_${row.status}`, { defaultValue: row.status })}
                          </span>
                          {row.matchMethod && (
                            <div className="user-import-match-method">{row.matchMethod}</div>
                          )}
                          {(row.warnings || []).map((w) => (
                            <div key={w} className="user-import-warning">{w}</div>
                          ))}
                        </td>
                        {EDITABLE_FIELDS.map((field) => (
                          <td key={field}>
                            {field === 'department' ? (
                              <select
                                className="user-import-cell-input"
                                value={row[field] || ''}
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((r) =>
                                      r.rowIndex === row.rowIndex ? patchRow(r, field, e.target.value) : r
                                    )
                                  )
                                }
                              >
                                <option value="">{t('userImport.pickDepartment')}</option>
                                {departmentOptions.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                                {row[field] && !departmentOptions.includes(row[field]) && (
                                  <option value={row[field]}>{row[field]}</option>
                                )}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="user-import-cell-input"
                                value={row[field] || ''}
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((r) =>
                                      r.rowIndex === row.rowIndex ? patchRow(r, field, e.target.value) : r
                                    )
                                  )
                                }
                              />
                            )}
                            {row.current && row.changes?.[field] && (
                              <div className="user-import-was" title={t('userImport.previousValue')}>
                                {row.current[field] || '—'}
                              </div>
                            )}
                          </td>
                        ))}
                        <td>
                          {row.status === 'unmatched' && (
                            <select
                              className="user-import-cell-input"
                              value={row.userId || ''}
                              onChange={(e) => linkUser(row.rowIndex, e.target.value)}
                            >
                              <option value="">{t('userImport.manualLink')}</option>
                              {allUsers.map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.name} ({u.email})
                                </option>
                              ))}
                            </select>
                          )}
                          {row.userId && row.status !== 'unmatched' && (
                            <span className="user-import-linked">{t('userImport.linked')}</span>
                          )}
                        </td>
                        <td className="user-import-email">{row.current?.email || '—'}</td>
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
          <button type="button" className="btn-elegant" onClick={onClose} disabled={applying}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-elegant btn-success"
            disabled={applying || selectedCount === 0}
            onClick={handleApply}
          >
            {applying ? t('userImport.applying') : t('userImport.applySelected', { count: selectedCount })}
          </button>
        </div>
      </div>
    </div>
  );
}
