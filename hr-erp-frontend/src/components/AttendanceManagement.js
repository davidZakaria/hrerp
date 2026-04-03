import React, { useState, useEffect } from 'react';
import API_URL from '../config/api';
import EmployeeAttendanceDetailModal from './EmployeeAttendanceDetailModal';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

const AttendanceManagement = () => {
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [rangeStart, setRangeStart] = useState(() => getDefaultDateRange().startDate);
  const [rangeEnd, setRangeEnd] = useState(() => getDefaultDateRange().endDate);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvedForms, setApprovedForms] = useState([]);
  const [activeView, setActiveView] = useState('summary'); // 'summary' or 'detailed'
  const [zktecoEnabled, setZktecoEnabled] = useState(false);

  useEffect(() => {
    fetchZktecoStatus();
  }, []);

  const fetchZktecoStatus = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/zkteco-status`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setZktecoEnabled(data.zktecoEnabled);
      }
    } catch (err) {
      console.error('Error fetching ZKTeco status:', err);
    }
  };

  useEffect(() => {
    if (rangeStart && rangeEnd) {
      fetchAttendanceReport();
      fetchApprovedForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd]);

  const fetchApprovedForms = async () => {
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/forms/approved-by-range?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setApprovedForms(data.forms || data);
      }
    } catch (err) {
      console.error('Error fetching approved forms:', err);
    }
  };

  const fetchAttendanceReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();
      const res = await fetch(`${API_URL}/api/attendance/report?${qs}`, {
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
        fetchAttendanceReport();
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
    const qs = new URLSearchParams({ startDate: rangeStart, endDate: rangeEnd }).toString();

    try {
      const res = await fetch(
        `${API_URL}/api/attendance/employee/${employee.user.id}/detail?${qs}`,
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

  const refetchEmployeeDetail = async () => {
    if (!selectedEmployee?.user?.id) return;
    await viewEmployeeDetails({ user: selectedEmployee.user });
    fetchAttendanceReport();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: { background: '#22c55e', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      late: { background: '#f97316', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      absent: { background: '#ef4444', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      excused: { background: '#3b82f6', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      on_leave: { background: '#a855f7', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' },
      wfh: { background: '#06b6d4', color: '#ffffff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }
    };

    const labels = {
      wfh: '🏠 WFH',
      on_leave: '🏖️ ON LEAVE'
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
        
        /* Detailed attendance view styles - Dark Theme */
        .attendance-detailed-card {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
          border: 1px solid #334155 !important;
          color: #e2e8f0 !important;
        }
        .attendance-detailed-card h4 {
          color: #f1f5f9 !important;
        }
        .attendance-detailed-card code {
          background: #334155 !important;
          color: #94a3b8 !important;
        }
        .attendance-detailed-card .employee-info {
          color: #94a3b8 !important;
        }
        .attendance-detailed-table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .attendance-detailed-table th {
          background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          padding: 12px 10px !important;
          border-bottom: 2px solid #3b82f6 !important;
        }
        .attendance-detailed-table td {
          padding: 10px !important;
          color: #e2e8f0 !important;
          border-bottom: 1px solid #334155 !important;
        }
        .attendance-detailed-table tr:nth-child(even) td {
          background: rgba(30, 41, 59, 0.7) !important;
        }
        .attendance-detailed-table tr:nth-child(odd) td {
          background: rgba(15, 23, 42, 0.7) !important;
        }
        .attendance-detailed-table .clock-time {
          color: #f1f5f9 !important;
          font-family: 'Courier New', monospace !important;
          font-weight: 700 !important;
          font-size: 0.95rem !important;
        }
        .attendance-detailed-table .late-value {
          color: #f87171 !important;
          font-weight: 700 !important;
        }
        .attendance-detailed-table .overtime-value {
          color: #4ade80 !important;
          font-weight: 700 !important;
        }
        .attendance-detailed-table .dash-value {
          color: #64748b !important;
        }
      `}</style>
      <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>Attendance Management</h2>

      {/* ZKTeco status banner */}
      {zktecoEnabled && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.05) 100%)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '12px',
          color: '#1565C0',
          fontSize: '0.95rem'
        }}>
          <strong>ZKTeco real-time sync:</strong> Devices push attendance automatically. Manual upload remains available as fallback.
        </div>
      )}

      {/* Upload Section */}
      <div className="elegant-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Upload Attendance Files</h3>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Upload XLS/XLSX files manually, or use ZKTeco real-time push (configure device to point to this server). Up to 10 files at once.
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
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div style={{ marginTop: '1rem', color: '#C62828' }}>
                <strong>⚠ File errors:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {uploadResult.errors.map((item, idx) => (
                    <li key={idx}>
                      {item.file}: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {uploadResult.summary?.map((fileSummary, fidx) =>
              (fileSummary.errors?.length > 0 || fileSummary.sampleKeys || fileSummary.validRows === 0) ? (
                <details key={fidx} style={{ marginTop: '1rem', color: '#C62828' }} open={fileSummary.validRows === 0}>
                  <summary style={{ cursor: 'pointer' }}>
                    ⚠ {fileSummary.filename}: {fileSummary.validRows} valid, {fileSummary.errors?.length || 0} failed
                    {fileSummary.sampleKeys && ` — Columns: [${fileSummary.sampleKeys.join(', ')}]`}
                    {fileSummary.validRows === 0 && fileSummary.errors?.[0]?.error && !fileSummary.sampleKeys && ` — ${fileSummary.errors[0].error}`}
                  </summary>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', maxHeight: '200px', overflow: 'auto' }}>
                    {fileSummary.errors?.slice(0, 10).map((err, idx) => (
                      <li key={idx}>
                        Row {err.row}: {err.error}
                        {err.data && ` — Sample: ${JSON.stringify(err.data).slice(0, 80)}...`}
                      </li>
                    ))}
                    {fileSummary.errors?.length > 10 && (
                      <li><em>... and {fileSummary.errors.length - 10} more</em></li>
                    )}
                  </ul>
                </details>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* View Attendance Section */}
      <div className="elegant-card">
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Attendance report</h3>
        
        {/* Controls Row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label-elegant">Start date</label>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="form-input-elegant"
              style={{ maxWidth: '180px' }}
            />
          </div>
          <div>
            <label className="form-label-elegant">End date</label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="form-input-elegant"
              style={{ maxWidth: '180px' }}
            />
          </div>
          <div>
            <button
              type="button"
              className="btn-elegant"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              onClick={() => {
                const d = getDefaultDateRange();
                setRangeStart(d.startDate);
                setRangeEnd(d.endDate);
              }}
            >
              This month
            </button>
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
            {attendanceReport.kpi && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ padding: '1rem', background: '#E8F5E9', borderRadius: '10px', border: '2px solid #4CAF50', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1B5E20' }}>{attendanceReport.kpi.totalPresent}</div>
                  <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Total present (days)</div>
                </div>
                <div style={{ padding: '1rem', background: '#FFEBEE', borderRadius: '10px', border: '2px solid #F44336', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#B71C1C' }}>{attendanceReport.kpi.totalAbsences}</div>
                  <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Total absences</div>
                </div>
                <div style={{ padding: '1rem', background: '#FFF3E0', borderRadius: '10px', border: '2px solid #FF9800', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#E65100' }}>{attendanceReport.kpi.totalLateHours}h</div>
                  <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Total late hours</div>
                </div>
                <div style={{ padding: '1rem', background: '#F3E5F5', borderRadius: '10px', border: '2px solid #9C27B0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4A148C' }}>{attendanceReport.kpi.pendingMissedPunches}</div>
                  <div style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Missed punch events</div>
                </div>
              </div>
            )}
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
                    ⏱️ Overtime summary (selected range)
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
                  📝 {approvedForms.length} approved leave/excuse forms in range
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
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                        borderRadius: '12px', 
                        padding: '1.5rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        border: '1px solid #334155'
                      }}>
                        {/* Employee Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '1rem',
                          paddingBottom: '1rem',
                          borderBottom: '2px solid #334155',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}>
                          <div>
                            <h4 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.3rem', fontWeight: '700' }}>
                              {emp.user.name}
                            </h4>
                            <div className="employee-info" style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                              <code style={{ background: '#334155', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                {emp.user.employeeCode || 'N/A'}
                              </code>
                              <span style={{ margin: '0 0.5rem', color: '#64748b' }}>•</span>
                              <span style={{ color: '#94a3b8' }}>{emp.user.department}</span>
                              <span style={{ margin: '0 0.5rem', color: '#64748b' }}>•</span>
                              <span style={{ color: '#94a3b8' }}>Schedule: {emp.user.workSchedule ? `${emp.user.workSchedule.startTime} - ${emp.user.workSchedule.endTime}` : 'Default (10:00-19:00)'}</span>
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
                            background: 'rgba(59, 130, 246, 0.1)', 
                            border: '1px solid #3b82f6',
                            padding: '1rem', 
                            borderRadius: '8px', 
                            marginBottom: '1rem' 
                          }}>
                            <strong style={{ color: '#60a5fa', fontSize: '0.9rem' }}>📝 Approved Requests:</strong>
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
                              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)' }}>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Date</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Day</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Clock In</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Clock Out</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Status</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#f87171', fontWeight: '600' }}>Late</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#4ade80', fontWeight: '600' }}>Overtime</th>
                                <th style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '2px solid #3b82f6', color: '#fbbf24', fontWeight: '600' }}>Deduction</th>
                                <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #3b82f6', color: '#ffffff', fontWeight: '600' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emp.records.map((record, rIdx) => {
                                const recordDate = new Date(record.date);
                                const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'short' });
                                const isWeekend = recordDate.getDay() === 0 || recordDate.getDay() === 6;
                                
                                return (
                                  <tr key={rIdx} style={{ 
                                    background: isWeekend ? 'rgba(51, 65, 85, 0.5)' : (rIdx % 2 === 0 ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.7)'),
                                    borderBottom: '1px solid #334155'
                                  }}>
                                    <td style={{ padding: '10px', color: '#e2e8f0', fontWeight: '500' }}>{formatDate(record.date)}</td>
                                    <td style={{ padding: '10px', color: isWeekend ? '#64748b' : '#cbd5e1', fontWeight: '500' }}>{dayName}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.missedClockIn ? (
                                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>❌ MISSED</span>
                                      ) : (
                                        <span className="clock-time" style={{ fontFamily: "'Courier New', monospace", color: '#f1f5f9', fontWeight: '700', fontSize: '0.95rem' }}>{record.clockIn || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.missedClockOut ? (
                                        <span style={{ color: '#fb923c', fontWeight: 'bold' }}>⚠️ MISSED</span>
                                      ) : (
                                        <span className="clock-time" style={{ fontFamily: "'Courier New', monospace", color: '#f1f5f9', fontWeight: '700', fontSize: '0.95rem' }}>{record.clockOut || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing</span>}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{getStatusBadge(record.status)}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.minutesLate > 0 ? (
                                        <span className="late-value" style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.95rem' }}>{record.minutesLate}m</span>
                                      ) : (
                                        <span className="dash-value" style={{ color: '#64748b' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {record.minutesOvertime > 0 ? (
                                        <span className="overtime-value" style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '0.95rem' }}>+{record.minutesOvertime}m</span>
                                      ) : (
                                        <span className="dash-value" style={{ color: '#64748b' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      {(record.fingerprintDeduction || 0) > 0 ? (
                                        <span style={{ 
                                          background: 'rgba(248, 113, 113, 0.2)', 
                                          color: '#f87171', 
                                          padding: '4px 10px', 
                                          borderRadius: '4px',
                                          fontWeight: 'bold',
                                          fontSize: '0.85rem'
                                        }}>
                                          -{record.fingerprintDeduction}d
                                        </span>
                                      ) : (
                                        <span style={{ color: '#64748b' }}>-</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                                      {record.relatedForm && (
                                        <span style={{ 
                                          background: record.status === 'on_leave' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                                          color: record.status === 'on_leave' ? '#c084fc' : '#60a5fa',
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
                                          background: 'rgba(251, 191, 36, 0.2)', 
                                          color: '#fbbf24', 
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

      <EmployeeAttendanceDetailModal
        open={showEmployeeDetail && !!selectedEmployee}
        onClose={() => setShowEmployeeDetail(false)}
        payload={selectedEmployee}
        canFixPunch
        onFixed={refetchEmployeeDetail}
      />
    </div>
  );
};

export default AttendanceManagement;

