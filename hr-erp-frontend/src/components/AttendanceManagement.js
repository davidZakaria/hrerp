import React, { useState, useEffect } from 'react';

const AttendanceManagement = () => {
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);

  function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchMonthlyReport();
    }
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/attendance/months', {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableMonths(data.months);
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:5001/api/attendance/monthly-report/${selectedMonth}`, {
        headers: { 'x-auth-token': token }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAttendanceReport(data);
      } else {
        setError(data.msg || 'Failed to fetch attendance report');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadResult(null);
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    uploadFiles.forEach(file => {
      formData.append('attendanceFiles', file);
    });

    try {
      const res = await fetch('http://localhost:5001/api/attendance/upload', {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(`Successfully processed ${data.results.successfulRecords} attendance records!`);
        setUploadResult(data.results);
        setUploadFiles([]);
        // Refresh the report
        fetchMonthlyReport();
        fetchAvailableMonths();
      } else {
        setError(data.msg || 'Upload failed');
      }
    } catch (err) {
      setError('Server error during upload');
    } finally {
      setUploading(false);
    }
  };

  const viewEmployeeDetails = async (employee) => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(
        `http://localhost:5001/api/attendance/employee/${employee.user.id}/${selectedMonth}`,
        { headers: { 'x-auth-token': token } }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        setSelectedEmployee(data);
        setShowEmployeeDetail(true);
      } else {
        setError(data.msg || 'Failed to fetch employee details');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: { background: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' },
      late: { background: '#FFF3E0', color: '#EF6C00', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' },
      absent: { background: '#FFEBEE', color: '#C62828', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' },
      excused: { background: '#E3F2FD', color: '#1565C0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' },
      on_leave: { background: '#F3E5F5', color: '#6A1B9A', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }
    };

    return (
      <span style={styles[status] || styles.present}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div>
      <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>Attendance Management</h2>

      {/* Upload Section */}
      <div className="elegant-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Upload Attendance Files</h3>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Upload XLS/XLSX files from biometric devices (up to 10 files at once)
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="file"
            multiple
            accept=".xls,.xlsx"
            onChange={handleFileSelect}
            className="form-input-elegant"
            style={{ padding: '0.75rem' }}
          />
          {uploadFiles.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Selected files ({uploadFiles.length}):</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {uploadFiles.map((file, idx) => (
                  <li key={idx} style={{ color: '#666' }}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload}
          disabled={uploading || uploadFiles.length === 0}
          className="btn-elegant btn-success"
          style={{ opacity: (uploading || uploadFiles.length === 0) ? 0.6 : 1 }}
        >
          {uploading ? 'Uploading...' : 'Upload Attendance Files'}
        </button>

        {uploadResult && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: '#F5F5F5', 
            borderRadius: '8px' 
          }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Upload Results:</h4>
            <ul style={{ paddingLeft: '1.5rem', color: '#333' }}>
              <li>Files processed: {uploadResult.processedFiles} / {uploadResult.totalFiles}</li>
              <li>Total records: {uploadResult.totalRecords}</li>
              <li style={{ color: '#2E7D32' }}>✓ Successful: {uploadResult.successfulRecords}</li>
              <li style={{ color: '#C62828' }}>✗ Failed: {uploadResult.failedRecords}</li>
              {uploadResult.unmatchedCodes && uploadResult.unmatchedCodes.length > 0 && (
                <li style={{ color: '#EF6C00' }}>
                  ⚠ Unmatched employee codes: {uploadResult.unmatchedCodes.length}
                </li>
              )}
            </ul>

            {uploadResult.unmatchedCodes && uploadResult.unmatchedCodes.length > 0 && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: '#EF6C00' }}>
                  View unmatched codes
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {uploadResult.unmatchedCodes.map((item, idx) => (
                    <li key={idx}>
                      Code: {item.code} - {item.name} (File: {item.file})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* View Attendance Section */}
      <div className="elegant-card">
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Monthly Attendance Report</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label-elegant">Select Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-input-elegant"
            style={{ maxWidth: '200px' }}
          >
            <option value={getCurrentMonth()}>Current Month</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {loading && <div className="spinner-elegant"></div>}

        {attendanceReport && !loading && (
          <div>
            <div style={{ marginBottom: '1.5rem', color: '#666' }}>
              <strong>Total Employees:</strong> {attendanceReport.totalEmployees}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table-elegant">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Total Days</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Excused</th>
                    <th>On Leave</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceReport.report.map((emp, idx) => (
                    <tr key={idx}>
                      <td>{emp.user.name}</td>
                      <td><code>{emp.user.employeeCode || 'N/A'}</code></td>
                      <td>{emp.user.department}</td>
                      <td>{emp.stats.totalDays}</td>
                      <td style={{ color: '#2E7D32' }}>{emp.stats.present}</td>
                      <td style={{ color: '#EF6C00' }}>{emp.stats.late}</td>
                      <td style={{ color: '#C62828' }}>{emp.stats.unexcusedAbsences}</td>
                      <td style={{ color: '#1565C0' }}>{emp.stats.excused}</td>
                      <td style={{ color: '#6A1B9A' }}>{emp.stats.onLeave}</td>
                      <td>
                        <button
                          onClick={() => viewEmployeeDetails(emp)}
                          className="btn-elegant btn-info"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {showEmployeeDetail && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowEmployeeDetail(false)}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>
              Attendance Details - {selectedEmployee.user.name}
            </h3>

            <div style={{ marginBottom: '1.5rem', background: '#F5F5F5', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Employee Code:</strong> {selectedEmployee.user.employeeCode || 'N/A'}
                </div>
                <div>
                  <strong>Department:</strong> {selectedEmployee.user.department}
                </div>
                <div>
                  <strong>Work Schedule:</strong> {
                    selectedEmployee.user.workSchedule 
                      ? `${selectedEmployee.user.workSchedule.startTime} - ${selectedEmployee.user.workSchedule.endTime}`
                      : 'Not set'
                  }
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Summary Statistics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#E8F5E9', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2E7D32' }}>
                    {selectedEmployee.stats.present}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Present</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#FFF3E0', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#EF6C00' }}>
                    {selectedEmployee.stats.late}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Late</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#FFEBEE', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#C62828' }}>
                    {selectedEmployee.stats.unexcusedAbsences}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Unexcused Absences</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#E3F2FD', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1565C0' }}>
                    {selectedEmployee.stats.excused}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Excused</div>
                </div>
                <div style={{ padding: '0.75rem', background: '#F3E5F5', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6A1B9A' }}>
                    {selectedEmployee.stats.onLeave}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>On Leave</div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Daily Attendance</h4>
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
                  {selectedEmployee.records.map((record, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.clockIn || '-'}</td>
                      <td>{record.clockOut || '-'}</td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td>{record.minutesLate > 0 ? `${record.minutesLate} min` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button 
                onClick={() => setShowEmployeeDetail(false)}
                className="btn-elegant"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;

