import React, { useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';

const FIELDS = ['employeeCode', 'name', 'jobTitle', 'location'];

export default function UserTitleLocationImportModal({ open, onClose, onApplied, allUsers = [] }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  if (!open) return null;

  const reset = () => {
    setSummary(null);
    setRows([]);
    setFileName('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/users/import/title-location/preview`, formData, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' }
      });
      setSummary(res.data.summary);
      setRows(res.data.rows || []);
      setFileName(res.data.fileName || file.name);
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
      reset();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
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
        jobTitle: row.jobTitle || '',
        location: row.location || ''
      }));
      await axios.post(
        `${API_URL}/api/users/import/title-location/apply`,
        { rows: payload, modificationReason: 'NJD title & location import' },
        { headers: { 'x-auth-token': token } }
      );
      reset();
      onApplied?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
    } finally {
      setApplying(false);
    }
  };

  const linkUser = (rowIndex, userId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const user = allUsers.find((u) => String(u._id) === String(userId));
        if (!user) return { ...row, userId: null, apply: false, status: 'unmatched' };
        return {
          ...row,
          userId: String(user._id),
          status: 'matched',
          apply: true,
          current: {
            name: user.name,
            email: user.email,
            department: user.department,
            employeeCode: user.employeeCode || '',
            jobTitle: user.jobTitle || '',
            location: user.location || ''
          }
        };
      })
    );
  };

  const selected = rows.filter((r) => r.apply).length;

  return (
    <div className="modal-elegant user-import-modal" onClick={onClose}>
      <div className="modal-content-elegant user-import-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '96vw', width: '1100px' }}>
        <div className="modal-header-elegant">
          <h2>{t('userTitleImport.title')}</h2>
          <button type="button" className="modal-close-elegant" onClick={onClose}>×</button>
        </div>

        <div className="user-import-body">
          <p className="user-import-desc">{t('userTitleImport.description')}</p>
          <p className="user-import-columns-hint">{t('userTitleImport.columnsHint')}</p>

          <div className="user-import-upload-row">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} />
            {fileName && <span className="user-import-file-name">{fileName}</span>}
            {loading && <span>{t('userTitleImport.parsing')}</span>}
          </div>

          {summary && (
            <div className="user-import-summary">
              <span>{t('userTitleImport.total', { count: summary.total })}</span>
              <span>{t('userTitleImport.matched', { count: summary.matched })}</span>
              <span>{t('userTitleImport.unmatched', { count: summary.unmatched })}</span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="user-import-table-wrap">
              <table className="user-import-table">
                <thead>
                  <tr>
                    <th>{t('userTitleImport.apply')}</th>
                    <th>{t('userTitleImport.status')}</th>
                    <th>{t('common.employeeCode')}</th>
                    <th>{t('common.name')}</th>
                    <th>{t('userTitleImport.jobTitle')}</th>
                    <th>{t('userTitleImport.location')}</th>
                    <th>{t('common.department')}</th>
                    <th>{t('userTitleImport.linkUser')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowIndex}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!row.apply}
                          disabled={!row.userId}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.rowIndex === row.rowIndex ? { ...r, apply: e.target.checked } : r))
                            )
                          }
                        />
                      </td>
                      <td>{row.status}</td>
                      {FIELDS.map((field) => (
                        <td key={field}>
                          <input
                            className="user-import-cell-input"
                            value={row[field] || ''}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) => (r.rowIndex === row.rowIndex ? { ...r, [field]: e.target.value } : r))
                              )
                            }
                          />
                        </td>
                      ))}
                      <td>{row.current?.department || '—'}</td>
                      <td>
                        {row.status === 'unmatched' ? (
                          <select className="user-import-cell-input" value={row.userId || ''} onChange={(e) => linkUser(row.rowIndex, e.target.value)}>
                            <option value="">{t('userTitleImport.manualLink')}</option>
                            {allUsers.map((u) => (
                              <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <div className="user-import-error">{error}</div>}
        </div>

        <div className="user-import-footer" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-elegant" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn-elegant btn-success" disabled={applying || selected === 0} onClick={handleApply}>
            {applying ? t('userTitleImport.applying') : t('userTitleImport.applySelected', { count: selected })}
          </button>
        </div>
      </div>
    </div>
  );
}
