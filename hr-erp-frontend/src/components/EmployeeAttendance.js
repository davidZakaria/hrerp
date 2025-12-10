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
    <div className="elegant-card" style={{ marginTop: '2rem' }}>
      <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>My Attendance</h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="form-label-elegant">Select Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="form-input-elegant"
          style={{ maxWidth: '250px' }}
        >
          {getMonthOptions().map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#FFEBEE', 
          color: '#C62828', 
          borderRadius: '8px', 
          marginBottom: '1rem' 
        }}>
          {error}
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
              padding: '1rem', 
              background: '#E8F5E9', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2E7D32' }}>
                {attendanceData.stats.present}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Present</div>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: '#FFF3E0', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#EF6C00' }}>
                {attendanceData.stats.late}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Late</div>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: '#FFEBEE', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#C62828' }}>
                {attendanceData.stats.unexcusedAbsences}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Unexcused Absences</div>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: '#E3F2FD', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1565C0' }}>
                {attendanceData.stats.excused}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Excused</div>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: '#F3E5F5', 
              borderRadius: '8px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6A1B9A' }}>
                {attendanceData.stats.onLeave}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>On Leave</div>
            </div>
          </div>

          {/* Daily Breakdown */}
          {attendanceData.records && attendanceData.records.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <h4 style={{ marginBottom: '1rem', color: '#333' }}>Daily Breakdown</h4>
              <table className="table-elegant">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    <th>Minutes Late</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.records.map((record, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.clockIn || '-'}</td>
                      <td>{record.clockOut || '-'}</td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td>
                        {record.minutesLate > 0 ? (
                          <span style={{ color: '#EF6C00', fontWeight: 'bold' }}>
                            {record.minutesLate} min
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#F5F5F5', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <strong>Note:</strong> Absences covered by approved vacation/excuse/sick leave forms are marked as "Excused" or "On Leave".
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

