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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        className="attendance-modal-custom"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '960px',
          width: '92%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}
      >
        <h3
          style={{
            marginBottom: '1rem',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1.45rem',
            textAlign: 'center'
          }}
        >
          Attendance Details — {user.name}
        </h3>
        <p style={{ textAlign: 'center', color: '#555', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          {payload.startDate?.slice(0, 10)} → {payload.endDate?.slice(0, 10)}
        </p>

        <div
          style={{
            marginBottom: '1.5rem',
            background: '#fff',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            <div>
              <strong style={{ color: '#000', display: 'block', marginBottom: '0.25rem' }}>Employee Code</strong>
              <span style={{ color: '#000' }}>{user.employeeCode || 'N/A'}</span>
            </div>
            <div>
              <strong style={{ color: '#000', display: 'block', marginBottom: '0.25rem' }}>Department</strong>
              <span style={{ color: '#000' }}>{user.department}</span>
            </div>
            <div>
              <strong style={{ color: '#000', display: 'block', marginBottom: '0.25rem' }}>Work Schedule</strong>
              <span style={{ color: '#000' }}>
                {user.workSchedule
                  ? `${user.workSchedule.startTime} - ${user.workSchedule.endTime}`
                  : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ marginBottom: '0.75rem', color: '#000', fontSize: '1.05rem' }}>Summary</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem'
            }}
          >
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
                style={{
                  padding: '0.75rem',
                  background: '#fff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: `2px solid ${color}`
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000' }}>{val}</div>
                <div style={{ fontSize: '0.8rem', color: '#333' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 'min(50vh, 420px)', overflowY: 'auto', background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #eee' }}>
          <h4 style={{ marginBottom: '1rem', color: '#000', fontSize: '1.05rem' }}>Daily breakdown</h4>
          {grouped.map(([monthLabel, rows]) => (
            <div key={monthLabel} style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  zIndex: 1
                }}
              >
                {monthLabel}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>Day</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>Shift</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>In</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>Out</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#000' }}>Hours</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#000' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#000' }}>Exceptions</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: '#000' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.date}-${idx}`}
                      style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ padding: '8px', color: '#000' }}>{row.date}</td>
                      <td style={{ padding: '8px', color: '#000' }}>{row.dayName}</td>
                      <td style={{ padding: '8px', color: '#333' }}>{row.scheduledShift}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{row.clockIn || '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{row.clockOut || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{row.totalHoursDisplay}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
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
                          <span title="Manually adjusted" style={{ marginLeft: 6, fontSize: '1rem' }}>
                            ✎
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', color: '#333', maxWidth: '200px' }}>
                        {(row.exceptionLabels || []).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {canFixPunch && needsFix(row) && (
                          <button
                            type="button"
                            onClick={() => openFix(row)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
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
            <p style={{ color: '#666' }}>No rows in range.</p>
          )}
        </div>

        {fixRow && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px'
            }}
          >
            <h4 style={{ marginBottom: '0.5rem' }}>Fix punch — {fixRow.date}</h4>
            {fixError && <div style={{ color: '#c00', marginBottom: '0.5rem' }}>{fixError}</div>}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <label>
                Clock in (HH:MM)
                <input
                  className="form-input-elegant"
                  value={fixClockIn}
                  onChange={(e) => setFixClockIn(e.target.value)}
                  style={{ display: 'block', marginTop: 4 }}
                />
              </label>
              <label>
                Clock out (HH:MM)
                <input
                  className="form-input-elegant"
                  value={fixClockOut}
                  onChange={(e) => setFixClockOut(e.target.value)}
                  style={{ display: 'block', marginTop: 4 }}
                />
              </label>
            </div>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              Reason (required)
              <textarea
                className="form-input-elegant"
                rows={2}
                value={fixReason}
                onChange={(e) => setFixReason(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-elegant btn-success" disabled={fixLoading} onClick={submitFix}>
                {fixLoading ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-elegant" onClick={() => setFixRow(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#4a90e2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceDetailModal;
