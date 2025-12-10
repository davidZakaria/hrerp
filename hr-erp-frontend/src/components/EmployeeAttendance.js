import React, { useState, useEffect } from 'react';

const EmployeeAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  useEffect(() => {
    fetchMyAttendance();
  }, [selectedMonth]);

  const fetchMyAttendance = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:5001/api/attendance/my-attendance/${selectedMonth}`, {
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: { background: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
      late: { background: '#FFF3E0', color: '#EF6C00', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
      absent: { background: '#FFEBEE', color: '#C62828', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
      excused: { background: '#E3F2FD', color: '#1565C0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
      on_leave: { background: '#F3E5F5', color: '#6A1B9A', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }
    };

    return (
      <span style={styles[status] || styles.present}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    // Current month and previous 5 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
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

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ color: '#000000', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Select Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ maxWidth: '250px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', color: '#000000', background: '#ffffff' }}
        >
          {getMonthOptions().map(opt => (
            <option key={opt.value} value={opt.value} style={{ color: '#000000' }}>{opt.label}</option>
          ))}
        </select>
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
          </div>

          {/* Daily Breakdown */}
          {attendanceData.records && attendanceData.records.length > 0 ? (
            <div style={{ overflowX: 'auto', background: '#ffffff', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000000', fontWeight: 'bold' }}>Daily Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Clock In</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Clock Out</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Late</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.records.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={{ padding: '10px', color: '#000000', fontSize: '0.9rem' }}>{formatDate(record.date)}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem', fontWeight: '500' }}>
                        {record.missedClockIn ? (
                          <span style={{ color: '#F44336', fontWeight: 'bold' }}>❌ MISSED</span>
                        ) : (
                          <span style={{ color: '#000000' }}>{record.clockIn}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.9rem', fontWeight: '500' }}>
                        {record.missedClockOut ? (
                          <span style={{ color: '#FF9800', fontWeight: 'bold' }}>⚠️ MISSED</span>
                        ) : (
                          <span style={{ color: '#000000' }}>{record.clockOut || '-'}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>{getStatusBadge(record.status)}</td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>
                        {record.minutesLate > 0 ? (
                          <span style={{ color: '#F44336', fontWeight: 'bold' }}>
                            {record.minutesLate} min
                          </span>
                        ) : (
                          <span style={{ color: '#000000' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>
                        {record.minutesOvertime > 0 ? (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                            +{record.minutesOvertime} min
                          </span>
                        ) : (
                          <span style={{ color: '#000000' }}>-</span>
                        )}
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
              No attendance records found for this month.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeAttendance;

