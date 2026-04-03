import React, { useState, useEffect } from 'react';
import API_URL from '../config/api';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

const BADGE_STYLES = {
  present: { background: '#E8F5E9', color: '#2E7D32' },
  late: { background: '#FFF8E1', color: '#F57F17' },
  absent: { background: '#FFEBEE', color: '#C62828' },
  weekly_off: { background: '#ECEFF1', color: '#546E7A' },
  holiday: { background: '#ECEFF1', color: '#455A64' },
  missed_punch: { background: '#FFF3E0', color: '#E65100' },
  on_leave: { background: '#F3E5F5', color: '#6A1B9A' },
  wfh: { background: '#E1F5FE', color: '#0277BD' },
  excused: { background: '#E8EAF6', color: '#3949AB' }
};

const EmployeeAttendance = () => {
  const [rangeStart, setRangeStart] = useState(() => getDefaultDateRange().startDate);
  const [rangeEnd, setRangeEnd] = useState(() => getDefaultDateRange().endDate);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd]);

  const fetchMyAttendance = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();

    try {
      const res = await fetch(`${API_URL}/api/attendance/my-attendance?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAttendanceData(data);
      } else {
        setError(data.msg || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  if (!attendanceData && !loading && !error) {
    return null;
  }

  return (
    <div className="elegant-card employee-attendance-section" style={{ marginTop: '2rem', background: '#f8f8f8', padding: '2rem', borderRadius: '12px' }}>
      <style>{`
        .employee-attendance-section,
        .employee-attendance-section *,
        .employee-attendance-section h3,
        .employee-attendance-section h4,
        .employee-attendance-section strong,
        .employee-attendance-section span:not(.status-badge),
        .employee-attendance-section div,
        .employee-attendance-section td,
        .employee-attendance-section th,
        .employee-attendance-section label {
          color: #000000 !important;
          text-shadow: none !important;
        }
        .employee-attendance-section table {
          background: #ffffff !important;
        }
        .employee-attendance-section select {
          background: #ffffff !important;
          color: #000000 !important;
          border: 2px solid #4a90e2 !important;
          padding: 0.5rem !important;
          font-weight: bold !important;
        }
        .employee-attendance-section select option {
          background: #ffffff !important;
          color: #000000 !important;
          padding: 0.5rem !important;
          font-weight: bold !important;
        }
      `}</style>
      <h3 style={{ marginBottom: '1.5rem', color: '#000000', fontWeight: 'bold', fontSize: '1.5rem' }}>My Attendance</h3>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ color: '#000000', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Start date</label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', color: '#000000', background: '#ffffff' }}
          />
        </div>
        <div>
          <label style={{ color: '#000000', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>End date</label>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', color: '#000000', background: '#ffffff' }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const d = getDefaultDateRange();
            setRangeStart(d.startDate);
            setRangeEnd(d.endDate);
          }}
          style={{ padding: '0.5rem 1rem', background: '#4a90e2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          This month
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#FFEBEE', 
          color: '#000000', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          border: '2px solid #F44336',
          fontWeight: 'bold'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner-elegant"></div>
        </div>
      )}

      {attendanceData && !loading && (
        <>
          {/* Summary Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #4CAF50',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.present}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Present</div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #FF9800',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.late}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Late</div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #F44336',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.unexcusedAbsences}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Unexcused Absences</div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #2196F3',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.excused}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>Excused</div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #9C27B0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.onLeave}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>On Leave</div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              background: '#ffffff', 
              borderRadius: '8px', 
              textAlign: 'center',
              border: '3px solid #0277BD',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                {attendanceData.stats.wfh || 0}
              </div>
              <div style={{ color: '#000000', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>WFH</div>
            </div>
          </div>

          {/* Daily Breakdown */}
          {attendanceData.detailRows && attendanceData.detailRows.length > 0 ? (
            <div style={{ overflowX: 'auto', background: '#ffffff', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000000', fontWeight: 'bold' }}>Daily breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Day</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Shift</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>In</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Out</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>Hours</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Exceptions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.detailRows.map((row, idx) => (
                    <tr key={`${row.date}-${idx}`} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={{ padding: '10px', color: '#000000', fontSize: '0.9rem' }}>{row.date}</td>
                      <td style={{ padding: '10px', color: '#000000', fontSize: '0.9rem' }}>{row.dayName}</td>
                      <td style={{ padding: '10px', fontSize: '0.85rem' }}>{row.scheduledShift}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.9rem' }}>{row.clockIn || '—'}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.9rem' }}>{row.clockOut || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{row.totalHoursDisplay}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            ...(BADGE_STYLES[row.dailyStatus] || BADGE_STYLES.present),
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {String(row.dailyStatus || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.85rem', color: '#333' }}>
                        {(row.exceptionLabels || []).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#ffffff', 
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: '#000000',
                border: '1px solid #ddd'
              }}>
                <strong style={{ color: '#000000' }}>Note:</strong> <span style={{ color: '#000000' }}>Absences covered by approved vacation/excuse/sick leave forms are marked as "Excused" or "On Leave".</span>
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              background: '#F5F5F5', 
              borderRadius: '8px',
              color: '#666'
            }}>
              No attendance rows in this date range.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeAttendance;

