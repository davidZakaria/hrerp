import React, { useState, useEffect } from 'react';
import API_URL from '../config/api';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [approvedForms, setApprovedForms] = useState([]);
  const [activeView, setActiveView] = useState('summary'); // 'summary' or 'detailed'

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
      fetchApprovedForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const fetchApprovedForms = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch approved vacation, excuse, and sick leave forms for the month
      const res = await fetch(`${API_URL}/api/forms/approved-by-month/${selectedMonth}`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setApprovedForms(data);
      }
    } catch (err) {
      console.error('Error fetching approved forms:', err);
    }
  };

  const fetchAvailableMonths = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/months`, {
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
      const res = await fetch(`${API_URL}/api/attendance/monthly-report/${selectedMonth}`, {
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
      const res = await fetch(`${API_URL}/api/attendance/upload`, {
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
        `${API_URL}/api/attendance/employee/${employee.user.id}/${selectedMonth}`,
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
      on_leave: { background: '#F3E5F5', color: '#6A1B9A', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' },
      wfh: { background: '#E1F5FE', color: '#0277BD', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }
    };

    const labels = {
      wfh: '🏠 WFH'
    };

    return (
      <span style={styles[status] || styles.present}>
        {labels[status] || status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div>
      <style>{`
        .attendance-modal-custom * {
          color: #000000 !important;
        }
        .attendance-modal-custom h3 {
          color: #000000 !important;
          text-shadow: none !important;
        }
        .attendance-modal-custom h4 {
          color: #000000 !important;
        }
        .attendance-modal-custom strong {
          color: #000000 !important;
        }
        .attendance-modal-custom span {
          color: #000000 !important;
        }
        .attendance-modal-custom div {
          color: #000000 !important;
        }
        
        /* Detailed attendance view styles */
        .attendance-detailed-card {
          background: #ffffff !important;
          color: #1a1a1a !important;
        }
        .attendance-detailed-card h4 {
          color: #1a1a1a !important;
        }
        .attendance-detailed-card td {
          color: #1a1a1a !important;
        }
        .attendance-detailed-card .clock-time {
          color: #1a1a1a !important;
          font-family: 'Courier New', monospace !important;
          font-weight: 700 !important;
          font-size: 0.95rem !important;
        }
        .attendance-detailed-card .late-value {
          color: #D32F2F !important;
          font-weight: 700 !important;
        }
        .attendance-detailed-card .overtime-value {
          color: #2E7D32 !important;
          font-weight: 700 !important;
        }
        .attendance-detailed-card .dash-value {
          color: #888888 !important;
        }
        .attendance-detailed-table th {
          background: #2d3748 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          padding: 12px 10px !important;
        }
        .attendance-detailed-table td {
          padding: 10px !important;
          color: #1a1a1a !important;
        }
        .attendance-detailed-table tr:nth-child(even) {
          background: #f8f9fa !important;
        }
        .attendance-detailed-table tr:nth-child(odd) {
          background: #ffffff !important;
        }
      `}</style>
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
              {uploadResult.weekendSkipped > 0 && (
                <li style={{ color: '#9C27B0' }}>
                  📅 Weekend records skipped: {uploadResult.weekendSkipped} (Fri/Sat)
                </li>
              )}
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
        
        {/* Controls Row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div>
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
          
          {/* Search Filter */}
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label className="form-label-elegant">🔍 Search Employee:</label>
            <input
              type="text"
              placeholder="Search by name, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input-elegant"
              style={{ width: '100%' }}
            />
          </div>

          {/* View Toggle */}
          <div>
            <label className="form-label-elegant">View Mode:</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveView('summary')}
                className={`btn-elegant ${activeView === 'summary' ? 'btn-success' : ''}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                📊 Summary
              </button>
              <button
                onClick={() => setActiveView('detailed')}
                className={`btn-elegant ${activeView === 'detailed' ? 'btn-success' : ''}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                📋 Detailed
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {loading && <div className="spinner-elegant"></div>}

        {attendanceReport && !loading && (
          <div>
            {/* Overtime Summary Panel */}
            {attendanceReport.overtimeSummary && attendanceReport.overtimeSummary.totalOvertimeMinutes > 0 && (
              <div style={{ 
                marginBottom: '2rem', 
                background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
                borderRadius: '16px',
                border: '1px solid #4a5568',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '1.5rem',
                  borderBottom: '2px solid #4a5568'
                }}>
                  <h4 style={{ 
                    margin: 0, 
                    color: '#ffffff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    ⏱️ Overtime Summary This Month
                  </h4>
                </div>

                {/* Summary Cards */}
                <div style={{ 
                  padding: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  borderBottom: '1px solid #4a5568'
                }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #0f4c3a 0%, #1a5f4a 100%)',
                    padding: '1.25rem', 
                    borderRadius: '12px',
                    border: '1px solid #10b981',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#34d399', marginBottom: '0.5rem' }}>
                      {attendanceReport.overtimeSummary.totalOvertimeHours}h
                    </div>
                    <div style={{ color: '#a7f3d0', fontSize: '0.9rem', fontWeight: '500' }}>Total Overtime Hours</div>
                  </div>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
                    padding: '1.25rem', 
                    borderRadius: '12px',
                    border: '1px solid #3b82f6',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#60a5fa', marginBottom: '0.5rem' }}>
                      {attendanceReport.overtimeSummary.employeesWithOvertime.length}
                    </div>
                    <div style={{ color: '#bfdbfe', fontSize: '0.9rem', fontWeight: '500' }}>Employees with Overtime</div>
                  </div>
                </div>

                {/* Employee Overtime List */}
                {attendanceReport.overtimeSummary.employeesWithOvertime.length > 0 && (
                  <div style={{ padding: '1.5rem' }}>
                    <h5 style={{ 
                      color: '#e2e8f0', 
                      fontSize: '1.1rem', 
                      marginBottom: '1rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      👥 Employee Overtime Details
                    </h5>
                    <div style={{
                      display: 'grid',
                      gap: '0.75rem'
                    }}>
                      {attendanceReport.overtimeSummary.employeesWithOvertime
                        .sort((a, b) => b.overtimeHours - a.overtimeHours)
                        .map((emp, idx) => (
                        <div key={idx} style={{ 
                          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                          padding: '1rem 1.25rem', 
                          borderRadius: '10px',
                          border: '1px solid #4a5568',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.transform = 'translateX(4px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#4a5568';
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                        }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              color: '#ffffff', 
                              fontSize: '1rem', 
                              fontWeight: '600',
                              marginBottom: '0.25rem'
                            }}>
                              {emp.name}
                            </div>
                            {emp.department && (
                              <div style={{ 
                                color: '#a0aec0', 
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <span>🏢</span>
                                <span>{emp.department}</span>
                              </div>
                            )}
                          </div>
                          <div style={{
                            background: 'linear-gradient(135deg, #E65100 0%, #FF6F00 100%)',
                            color: '#ffffff',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            minWidth: '100px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(230, 81, 0, 0.3)',
                            border: '1px solid #FF6F00'
                          }}>
                            +{emp.overtimeHours}h
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Total Employees:</strong> {attendanceReport.totalEmployees}
                {searchQuery && (
                  <span style={{ marginLeft: '1rem', color: '#4a90e2' }}>
                    (Showing {attendanceReport.report.filter(emp => 
                      emp.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (emp.user.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      emp.user.department.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length} results)
                  </span>
                )}
              </div>
              {approvedForms.length > 0 && (
                <span style={{ background: '#E3F2FD', color: '#1565C0', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                  📝 {approvedForms.length} Approved Leave/Excuse Forms This Month
                </span>
              )}
            </div>

            {/* Summary View */}
            {activeView === 'summary' && (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={{ 
                  width: '100%', 
                  minWidth: '1200px',
                  borderCollapse: 'separate',
                  borderSpacing: '0',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '150px' }}>Employee</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '60px' }}>Code</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left', color: '#fff', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '120px' }}>Department</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '50px' }}>Days</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '60px' }}>Present</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fb923c', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '50px' }}>Late</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '55px' }}>Absent</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#c084fc', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '55px' }}>Leave</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#38bdf8', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '50px' }}>WFH</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#60a5fa', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '60px' }}>Excused</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fbbf24', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '70px' }}>FP Miss</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '70px' }}>Deduct</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '70px' }}>OT</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center', color: '#fff', fontWeight: '600', borderBottom: '2px solid #4a5568', minWidth: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.report
                      .filter(emp => 
                        emp.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (emp.user.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        emp.user.department.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((emp, idx) => (
                      <tr key={idx} style={{ 
                        background: idx % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                        borderBottom: '1px solid #334155'
                      }}>
                        <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: '500' }}>{emp.user.name}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <code style={{ background: '#334155', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {emp.user.employeeCode || 'N/A'}
                          </code>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#94a3b8', fontSize: '0.85rem' }}>{emp.user.department}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#cbd5e1', fontWeight: '600' }}>{emp.stats.totalDays}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#4ade80', fontWeight: '600', fontSize: '1rem' }}>{emp.stats.present}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#fb923c', fontWeight: '600', fontSize: '1rem' }}>{emp.stats.late}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f87171', fontWeight: '600', fontSize: '1rem' }}>{emp.stats.unexcusedAbsences}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#c084fc', fontWeight: '600', fontSize: '1rem' }}>{emp.stats.onLeave || 0}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.wfh || 0) > 0 ? (
                            <span style={{ 
                              background: 'rgba(56, 189, 248, 0.2)', 
                              color: '#38bdf8', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              🏠 {emp.stats.wfh}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#60a5fa', fontWeight: '600', fontSize: '1rem' }}>{emp.stats.excused || 0}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.fingerprintMisses || 0) > 0 ? (
                            <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' }}>
                              {emp.stats.fingerprintMisses}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.totalFingerprintDeduction || 0) > 0 ? (
                            <span style={{ 
                              background: 'rgba(248, 113, 113, 0.2)', 
                              color: '#f87171', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              -{emp.stats.totalFingerprintDeduction}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {(emp.stats.totalMinutesOvertime || 0) > 0 ? (
                            <span style={{ 
                              background: 'rgba(74, 222, 128, 0.2)', 
                              color: '#4ade80', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              +{emp.stats.totalMinutesOvertime}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => viewEmployeeDetails(emp)}
                            className="btn-elegant btn-info"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Detailed View - Shows each employee's daily clock in/out */}
            {activeView === 'detailed' && (
              <div>
                {attendanceReport.report
                  .filter(emp => 
                    emp.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (emp.user.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    emp.user.department.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((emp, idx) => {
                    // Get approved forms for this employee
                    const employeeForms = approvedForms.filter(f => f.user?._id === emp.user.id || f.user === emp.user.id);
                    
                    return (
                      <div key={idx} className="attendance-detailed-card" style={{ 
                        marginBottom: '2rem', 
                        background: '#ffffff', 
                        borderRadius: '12px', 
                        padding: '1.5rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid #d0d0d0'
                      }}>
                        {/* Employee Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '1rem',
                          paddingBottom: '1rem',
                          borderBottom: '2px solid #e0e0e0',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}>
                          <div>
                            <h4 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.3rem', fontWeight: '700' }}>
                              {emp.user.name}
                            </h4>
                            <div style={{ color: '#555555', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                              <code style={{ background: '#e8e8e8', color: '#333333', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                {emp.user.employeeCode || 'N/A'}
                              </code>
                              <span style={{ margin: '0 0.5rem', color: '#888888' }}>•</span>
                              <span style={{ color: '#444444' }}>{emp.user.department}</span>
                              <span style={{ margin: '0 0.5rem', color: '#888888' }}>•</span>
                              <span style={{ color: '#666666' }}>Schedule: {emp.user.workSchedule ? `${emp.user.workSchedule.startTime} - ${emp.user.workSchedule.endTime}` : 'Default (10:00-19:00)'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                              ✓ {emp.stats.present} Present
                            </span>
                            <span style={{ background: '#FFF3E0', color: '#E65100', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                              ⏰ {emp.stats.late} Late
                            </span>
                            <span style={{ background: '#FFEBEE', color: '#C62828', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                              ✗ {emp.stats.unexcusedAbsences} Absent
                            </span>
                            {emp.stats.onLeave > 0 && (
                              <span style={{ background: '#F3E5F5', color: '#6A1B9A', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                                🏖️ {emp.stats.onLeave} On Leave
                              </span>
                            )}
                            {(emp.stats.wfh || 0) > 0 && (
                              <span style={{ background: '#E1F5FE', color: '#0277BD', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                🏠 {emp.stats.wfh} WFH
                              </span>
                            )}
                            {(emp.stats.totalFingerprintDeduction || 0) > 0 && (
                              <span style={{ background: '#FFCDD2', color: '#B71C1C', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                ⚠️ -{emp.stats.totalFingerprintDeduction} days deduction
                              </span>
                            )}
                            {(emp.stats.totalMinutesOvertime || 0) > 0 && (
                              <span style={{ background: '#C8E6C9', color: '#1B5E20', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                ⏱️ +{Math.round(emp.stats.totalMinutesOvertime / 60 * 10) / 10}h overtime
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Approved Forms for this Employee */}
                        {employeeForms.length > 0 && (
                          <div style={{ 
                            background: '#E3F2FD', 
                            padding: '1rem', 
                            borderRadius: '8px', 
                            marginBottom: '1rem' 
                          }}>
                            <strong style={{ color: '#1565C0', fontSize: '0.9rem' }}>📝 Approved Requests:</strong>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              {employeeForms.map((form, fIdx) => (
                                <span key={fIdx} style={{ 
                                  background: form.type === 'vacation' ? '#9C27B0' : form.type === 'excuse' ? '#1976D2' : '#FF9800',
                                  color: 'white',
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}>
                                  {form.type === 'vacation' && `🏖️ Vacation: ${new Date(form.startDate).toLocaleDateString()} - ${new Date(form.endDate).toLocaleDateString()}`}
                                  {form.type === 'excuse' && `⏰ Excuse: ${new Date(form.excuseDate).toLocaleDateString()} (${form.fromHour}-${form.toHour})`}
                                  {form.type === 'sick_leave' && `🏥 Sick: ${new Date(form.sickLeaveStartDate).toLocaleDateString()} - ${new Date(form.sickLeaveEndDate).toLocaleDateString()}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Daily Records Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table className="attendance-detailed-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '800px' }}>
                            <thead>
                              <tr style={{ background: '#2d3748' }}>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Day</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Clock In</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Clock Out</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Late</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Overtime</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Deduction</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #4a5568', color: '#ffffff', fontWeight: '600' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emp.records.map((record, rIdx) => {
                                const recordDate = new Date(record.date);
                                const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'short' });
                                const isWeekend = recordDate.getDay() === 0 || recordDate.getDay() === 6;
                                
                                return (
                                  <tr key={rIdx} style={{ 
                                    background: isWeekend ? '#f0f0f0' : (rIdx % 2 === 0 ? '#ffffff' : '#f8f9fa'),
                                    borderBottom: '1px solid #e0e0e0'
                                  }}>
                                    <td style={{ padding: '10px', color: '#1a1a1a', fontWeight: '500' }}>{formatDate(record.date)}</td>
                                    <td style={{ padding: '10px', color: isWeekend ? '#888888' : '#333333', fontWeight: '500' }}>{dayName}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.missedClockIn ? (
                                        <span style={{ color: '#D32F2F', fontWeight: 'bold' }}>❌ MISSED</span>
                                      ) : (
                                        <span className="clock-time" style={{ fontFamily: "'Courier New', monospace", color: '#1a1a1a', fontWeight: '700', fontSize: '0.95rem' }}>{record.clockIn || '-'}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.missedClockOut ? (
                                        <span style={{ color: '#F57C00', fontWeight: 'bold' }}>⚠️ MISSED</span>
                                      ) : (
                                        <span className="clock-time" style={{ fontFamily: "'Courier New', monospace", color: '#1a1a1a', fontWeight: '700', fontSize: '0.95rem' }}>{record.clockOut || '-'}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{getStatusBadge(record.status)}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.minutesLate > 0 ? (
                                        <span className="late-value" style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: '0.95rem' }}>{record.minutesLate}m</span>
                                      ) : (
                                        <span className="dash-value" style={{ color: '#888888' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.minutesOvertime > 0 ? (
                                        <span className="overtime-value" style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: '0.95rem' }}>+{record.minutesOvertime}m</span>
                                      ) : (
                                        <span className="dash-value" style={{ color: '#888888' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {(record.fingerprintDeduction || 0) > 0 ? (
                                        <span style={{ 
                                          background: '#FFEBEE', 
                                          color: '#C62828', 
                                          padding: '4px 10px', 
                                          borderRadius: '4px',
                                          fontWeight: 'bold',
                                          fontSize: '0.85rem'
                                        }}>
                                          -{record.fingerprintDeduction}d
                                        </span>
                                      ) : (
                                        <span style={{ color: '#888888' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                                      {record.relatedForm && (
                                        <span style={{ 
                                          background: record.status === 'on_leave' ? '#F3E5F5' : '#E3F2FD',
                                          color: record.status === 'on_leave' ? '#6A1B9A' : '#1565C0',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          marginRight: '4px',
                                          fontWeight: '500'
                                        }}>
                                          {record.status === 'on_leave' ? '🏖️ Approved Leave' : '✓ Excused'}
                                        </span>
                                      )}
                                      {record.fingerprintMissType && record.fingerprintMissType !== 'none' && (
                                        <span style={{ 
                                          background: '#FFF3E0', 
                                          color: '#E65100', 
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.8rem',
                                          fontWeight: '500'
                                        }}>
                                          ⚠️ Forgot {record.fingerprintMissType === 'both' ? 'In & Out' : record.fingerprintMissType === 'clock_in' ? 'Clock In' : 'Clock Out'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {showEmployeeDetail && selectedEmployee && (
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
          onClick={() => setShowEmployeeDetail(false)}
        >
          <div 
            className="attendance-modal-custom"
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: '#f5f5f5',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ 
              marginBottom: '1.5rem', 
              color: '#000000', 
              fontWeight: 'bold',
              fontSize: '1.5rem',
              textAlign: 'center'
            }}>
              Attendance Details - {selectedEmployee.user.name}
            </h3>

            <div style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ fontSize: '0.95rem' }}>
                  <strong style={{ color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Employee Code:</strong> 
                  <span style={{ color: '#000000', fontSize: '1rem' }}>{selectedEmployee.user.employeeCode || 'N/A'}</span>
                </div>
                <div style={{ fontSize: '0.95rem' }}>
                  <strong style={{ color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Department:</strong> 
                  <span style={{ color: '#000000', fontSize: '1rem' }}>{selectedEmployee.user.department}</span>
                </div>
                <div style={{ fontSize: '0.95rem' }}>
                  <strong style={{ color: '#000000', display: 'block', marginBottom: '0.25rem' }}>Work Schedule:</strong> 
                  <span style={{ color: '#000000', fontSize: '1rem' }}>{
                    selectedEmployee.user.workSchedule 
                      ? `${selectedEmployee.user.workSchedule.startTime} - ${selectedEmployee.user.workSchedule.endTime}`
                      : 'Not set'
                  }</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000000', fontSize: '1.1rem', fontWeight: 'bold' }}>Summary Statistics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #4CAF50', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.present}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Present</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #FF9800', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.late}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Late</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #F44336', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.unexcusedAbsences}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Unexcused Absences</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #2196F3', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.excused}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Excused</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #9C27B0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.onLeave}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>On Leave</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #0277BD', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    🏠 {selectedEmployee.stats.wfh || 0}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Work From Home</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #FF5722', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {selectedEmployee.stats.totalFingerprintDeduction || 0}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Days Deducted</div>
                </div>
                <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '8px', textAlign: 'center', border: '3px solid #8BC34A', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000' }}>
                    {Math.round((selectedEmployee.stats.totalMinutesOvertime || 0) / 60 * 10) / 10}h
                  </div>
                  <div style={{ fontSize: '1rem', color: '#000000', fontWeight: 'bold', marginTop: '0.5rem' }}>Overtime</div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#ffffff', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', color: '#000000', fontSize: '1.1rem', fontWeight: 'bold' }}>Daily Attendance</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Clock In</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Clock Out</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Late</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#000000', fontWeight: 'bold', fontSize: '0.95rem' }}>Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployee.records.map((record, idx) => (
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
                          <span style={{ color: '#F44336', fontWeight: 'bold' }}>{record.minutesLate} min</span>
                        ) : (
                          <span style={{ color: '#000000' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.9rem' }}>
                        {record.minutesOvertime > 0 ? (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>+{record.minutesOvertime} min</span>
                        ) : (
                          <span style={{ color: '#000000' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button 
                onClick={() => setShowEmployeeDetail(false)}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#4a90e2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
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

