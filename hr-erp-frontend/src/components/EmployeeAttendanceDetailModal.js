import React, { useMemo, useState } from 'react';
import API_URL from '../config/api';

const BADGE_STYLES = {
  present: { background: '#22c55e', color: '#fff' },
  late: { background: '#eab308', color: '#111' },
  absent: { background: '#ef4444', color: '#fff' },
  weekly_off: { background: '#94a3b8', color: '#fff' },
  holiday: { background: '#64748b', color: '#fff' },
  missed_punch: { background: '#f97316', color: '#fff' },
  on_leave: { background: '#a855f7', color: '#fff' },
  wfh: { background: '#0ea5e9', color: '#fff' },
  excused: { background: '#6366f1', color: '#fff' }
};

function formatLabel(key) {
  if (!key) return '';
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByMonth(detailRows) {
  const map = new Map();
  for (const row of detailRows || []) {
    const k = row.monthLabel || 'Other';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return Array.from(map.entries());
}

const EmployeeAttendanceDetailModal = ({
  open,
  onClose,
  payload,
  canFixPunch,
  onFixed
}) => {
  const [fixRow, setFixRow] = useState(null);
  const [fixClockIn, setFixClockIn] = useState('');
  const [fixClockOut, setFixClockOut] = useState('');
  const [fixReason, setFixReason] = useState('');
  const [fixError, setFixError] = useState('');
  const [fixLoading, setFixLoading] = useState(false);

  const grouped = useMemo(() => groupByMonth(payload?.detailRows), [payload]);

  if (!open || !payload) return null;

  const { user, stats, detailRows = [] } = payload;

  const needsFix = (row) =>
    row.attendanceId &&
    (row.missedClockIn || row.missedClockOut) &&
    !row.isSynthetic;

  const openFix = (row) => {
    setFixRow(row);
    setFixClockIn(row.clockIn || '');
    setFixClockOut(row.clockOut || '');
    setFixReason('');
    setFixError('');
  };

  const submitFix = async () => {
    if (!fixRow?.attendanceId) return;
    if (!fixReason.trim()) {
      setFixError('Reason is required');
      return;
    }
    setFixLoading(true);
    setFixError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API_URL}/api/attendance/${fixRow.attendanceId}/fix-punch`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({
            clockIn: fixClockIn,
            clockOut: fixClockOut,
            reason: fixReason.trim()
          })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFixError(data.msg || 'Failed to save');
        return;
      }
      setFixRow(null);
      if (onFixed) onFixed();
    } catch {
      setFixError('Network error');
    } finally {
      setFixLoading(false);
    }
  };

  return (
    <div className="modal-overlay attendance-detail-overlay" onClick={onClose}>
      <div
        className="attendance-modal-custom attendance-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-detail-title"
      >
        <h3 id="attendance-detail-title" className="attendance-detail-title">
          Attendance Details — {user.name}
        </h3>
        <p className="attendance-detail-subtitle">
          {payload.startDate?.slice(0, 10)} → {payload.endDate?.slice(0, 10)}
        </p>

        <div className="attendance-detail-panel attendance-detail-meta">
          <div className="attendance-detail-meta-grid">
            <div>
              <strong>Employee Code</strong>
              <span>{user.employeeCode || 'N/A'}</span>
            </div>
            <div>
              <strong>Department</strong>
              <span>{user.department}</span>
            </div>
            <div>
              <strong>Work Schedule</strong>
              <span>
                {user.workSchedule
                  ? `${user.workSchedule.startTime} - ${user.workSchedule.endTime}`
                  : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        <div className="attendance-detail-summary-section">
          <h4 className="attendance-detail-section-title">Summary</h4>
          <div className="attendance-detail-summary-grid">
            {[
              ['Present', stats?.present ?? 0, '#4CAF50'],
              ['Late', stats?.late ?? 0, '#FF9800'],
              ['Unexcused absences', stats?.unexcusedAbsences ?? 0, '#F44336'],
              ['Excused', stats?.excused ?? 0, '#2196F3'],
              ['On leave', stats?.onLeave ?? 0, '#9C27B0'],
              ['WFH', stats?.wfh ?? 0, '#0277BD']
            ].map(([label, val, color]) => (
              <div
                key={label}
                className="attendance-detail-stat-card"
                style={{ borderColor: color }}
              >
                <div className="attendance-detail-stat-value">{val}</div>
                <div className="attendance-detail-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="attendance-detail-panel attendance-detail-table-wrap">
          <h4 className="attendance-detail-section-title">Daily breakdown</h4>
          {grouped.map(([monthLabel, rows]) => (
            <div key={monthLabel} className="attendance-detail-month-group">
              <div className="attendance-detail-month-bar">{monthLabel}</div>
              <table className="attendance-detail-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Shift</th>
                    <th>In</th>
                    <th>Out</th>
                    <th className="attendance-detail-th-center">Hours</th>
                    <th className="attendance-detail-th-center">Status</th>
                    <th>Exceptions</th>
                    <th className="attendance-detail-th-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`${row.date}-${idx}`}>
                      <td>{row.date}</td>
                      <td>{row.dayName}</td>
                      <td className="attendance-detail-muted">{row.scheduledShift}</td>
                      <td className="attendance-detail-clock">{row.clockIn || '—'}</td>
                      <td className="attendance-detail-clock">{row.clockOut || '—'}</td>
                      <td className="attendance-detail-hours attendance-detail-th-center">{row.totalHoursDisplay}</td>
                      <td className="attendance-detail-th-center">
                        <span
                          style={{
                            ...BADGE_STYLES[row.dailyStatus] || BADGE_STYLES.present,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            display: 'inline-block'
                          }}
                        >
                          {formatLabel(row.dailyStatus)}
                        </span>
                        {row.isEdited && (
                          <span title="Manually adjusted" className="attendance-detail-edited-mark">
                            ✎
                          </span>
                        )}
                      </td>
                      <td className="attendance-detail-muted attendance-detail-exceptions">
                        {(row.exceptionLabels || []).join(', ') || '—'}
                      </td>
                      <td className="attendance-detail-th-center">
                        {canFixPunch && needsFix(row) && (
                          <button
                            type="button"
                            className="attendance-detail-fix-btn"
                            onClick={() => openFix(row)}
                          >
                            Fix punch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {detailRows.length === 0 && (
            <p className="attendance-detail-empty">No rows in range.</p>
          )}
        </div>

        {fixRow && (
          <div className="attendance-detail-panel attendance-detail-fix-panel">
            <h4 className="attendance-detail-section-title">Fix punch — {fixRow.date}</h4>
            {fixError && <div className="attendance-detail-fix-error">{fixError}</div>}
            <div className="attendance-detail-fix-fields">
              <label>
                Clock in (HH:MM)
                <input
                  className="form-input-elegant attendance-detail-fix-input"
                  value={fixClockIn}
                  onChange={(e) => setFixClockIn(e.target.value)}
                />
              </label>
              <label>
                Clock out (HH:MM)
                <input
                  className="form-input-elegant attendance-detail-fix-input"
                  value={fixClockOut}
                  onChange={(e) => setFixClockOut(e.target.value)}
                />
              </label>
            </div>
            <label className="attendance-detail-fix-reason">
              Reason (required)
              <textarea
                className="form-input-elegant"
                rows={2}
                value={fixReason}
                onChange={(e) => setFixReason(e.target.value)}
              />
            </label>
            <div className="attendance-detail-fix-actions">
              <button type="button" className="btn-elegant btn-success" disabled={fixLoading} onClick={submitFix}>
                {fixLoading ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-elegant" onClick={() => setFixRow(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="attendance-detail-footer">
          <button type="button" className="attendance-detail-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceDetailModal;
