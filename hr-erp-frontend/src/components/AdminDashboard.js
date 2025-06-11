import React, { useState, useEffect, useCallback } from 'react';
import ALS from './ALS/ALS';

const AdminDashboard = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({});
  const [search, setSearch] = useState('');
  const [vacationDaysMap, setVacationDaysMap] = useState({});
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [activeView, setActiveView] = useState('forms'); // 'forms' or 'ats'
  const [showVacationManager, setShowVacationManager] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [vacationEdits, setVacationEdits] = useState({});
  const [vacationManagerLoading, setVacationManagerLoading] = useState(false);
  const [vacationManagerError, setVacationManagerError] = useState('');
  const [vacationManagerSuccess, setVacationManagerSuccess] = useState('');
  const [vacationManagerSearch, setVacationManagerSearch] = useState('');

  const fetchVacationDays = useCallback(async (userId) => {
    if (!userId || vacationDaysMap[userId] !== undefined) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/forms/vacation-days/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setVacationDaysMap(prev => ({ ...prev, [userId]: data.vacationDaysLeft }));
      }
    } catch (err) {
      // ignore
    }
  }, [vacationDaysMap]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/admin', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setForms(data);
        // Fetch vacation days for each unique user
        const userIds = Array.from(new Set(data.map(f => f.user?._id).filter(Boolean)));
        userIds.forEach(userId => fetchVacationDays(userId));
      } else {
        setError(data.msg || 'Failed to fetch forms.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
    setLoading(false);
  }, [fetchVacationDays]);

  const fetchVacationDaysReport = async () => {
    setReportLoading(true);
    setReportError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/vacation-days-report', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setReportError(data.msg || 'Failed to fetch report.');
      }
    } catch (err) {
      setReportError('Error connecting to server.');
    }
    setReportLoading(false);
  };

  const handleShowReport = () => {
    setShowReport(true);
    fetchVacationDaysReport();
  };

  const handleHideReport = () => {
    setShowReport(false);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (activeView === 'forms') {
      fetchForms();
    }
  }, [activeView, fetchForms]);

  const handleCommentChange = (id, value) => {
    setComments({ ...comments, [id]: value });
  };

  const handleAction = async (id, status) => {
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          status,
          adminComment: comments[id] || ''
        })
      });
      if (res.ok) {
        fetchForms();
        // Refetch vacation days for the employee of this form
        const form = forms.find(f => f._id === id);
        if (form && form.user?._id) fetchVacationDays(form.user._id);
      } else {
        const data = await res.json();
        setError(data.msg || 'Failed to update form.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/forms/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        fetchForms();
      } else {
        const data = await res.json();
        setError(data.msg || 'Failed to delete form.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
  };

  // Filter forms by employee name
  const filteredForms = forms.filter(form =>
    form.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Fetch all employees for vacation manager
  const fetchAllEmployees = async () => {
    setVacationManagerLoading(true);
    setVacationManagerError('');
    setVacationManagerSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/vacation-days-report', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setAllEmployees(data);
        setVacationEdits({});
      } else {
        setVacationManagerError(data.msg || 'Failed to fetch employees.');
      }
    } catch (err) {
      setVacationManagerError('Error connecting to server.');
    }
    setVacationManagerLoading(false);
  };

  const openVacationManager = () => {
    setShowVacationManager(true);
    fetchAllEmployees();
  };
  const closeVacationManager = () => {
    setShowVacationManager(false);
    setVacationManagerError('');
    setVacationManagerSuccess('');
  };

  const handleVacationEdit = (userId, value) => {
    setVacationEdits(edits => ({ ...edits, [userId]: value }));
  };

  const handleVacationSave = async (userId) => {
    setVacationManagerError('');
    setVacationManagerSuccess('');
    const token = localStorage.getItem('token');
    const newDays = Number(vacationEdits[userId]);
    if (isNaN(newDays) || newDays < 0) {
      setVacationManagerError('Invalid vacation days value.');
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}/vacation-days`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ vacationDaysLeft: newDays })
      });
      const data = await res.json();
      if (res.ok) {
        setVacationManagerSuccess('Vacation days updated.');
        setAllEmployees(emps => emps.map(emp => emp._id === userId ? { ...emp, vacationDaysLeft: newDays } : emp));
      } else {
        setVacationManagerError(data.msg || 'Failed to update vacation days.');
      }
    } catch (err) {
      setVacationManagerError('Error connecting to server.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <button 
          className={`njd-btn${activeView === 'forms' ? '' : ' outline'}`}
          onClick={() => setActiveView('forms')}
        >
          Forms Management
        </button>
        <button 
          className={`njd-btn${activeView === 'ats' ? '' : ' outline'}`}
          onClick={() => setActiveView('ats')}
        >
          ATS System
        </button>
        <button
          className="njd-btn"
          style={{ marginLeft: 10, background: '#1976d2', color: '#fff' }}
          onClick={openVacationManager}
        >
          Manage Vacation Days
        </button>
      </div>

      {activeView === 'forms' ? (
        <>
          <h2>Forms Management</h2>
          <button 
            className="njd-btn"
            onClick={handleShowReport} 
          >
            Vacation Days Report
          </button>
          
          {showReport && (
            <div style={{ background: '#fff', padding: 20, border: '1px solid #ccc', marginBottom: 20, borderRadius: '4px' }}>
              <h3>Annual Vacation Days Left Report</h3>
              <button 
                className="njd-btn"
                onClick={handlePrint}
              >
                Print
              </button>
              <button 
                className="njd-btn danger"
                onClick={handleHideReport} 
              >
                Close
              </button>
              {reportLoading && <p>Loading...</p>}
              {reportError && <p style={{ color: 'red' }}>{reportError}</p>}
              <table border="1" cellPadding="8" style={{ marginTop: 10, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Annual Vacation Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.department}</td>
                      <td>{user.vacationDaysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <input
            type="text"
            placeholder="Search by employee name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              marginBottom: 20, 
              width: '60%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          
          <div className="admin-table-container">
            <table className="admin-table" border="0" cellPadding="0">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Vacation Days Left</th>
                  <th>Type</th>
                  <th>Vacation Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Comment</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map(form => (
                  <tr key={form._id}>
                    <td>{form.user?.name} <br />({form.user?.email})</td>
                    <td>{form.user?.department}</td>
                    <td>{form.user?._id ? (vacationDaysMap[form.user._id] !== undefined ? vacationDaysMap[form.user._id] : '...') : '-'}</td>
                    <td>{form.type}</td>
                    <td>{form.type === 'vacation' ? (form.vacationType || '-') : '-'}</td>
                    <td>{form.type === 'vacation' ? (form.startDate?.slice(0,10) || '-') : '-'}</td>
                    <td>{form.type === 'vacation' ? (form.endDate?.slice(0,10) || '-') : '-'}</td>
                    <td>{form.type === 'excuse' ? (form.fromHour || '-') : '-'}</td>
                    <td>{form.type === 'excuse' ? (form.toHour || '-') : '-'}</td>
                    <td>{form.reason}</td>
                    <td>{form.status}</td>
                    <td>{form.adminComment || '-'}</td>
                    <td>{new Date(form.createdAt).toLocaleString()}</td>
                    <td>
                      {form.status === 'pending' && (
                        <div style={{ marginBottom: 8 }}>
                          <input
                            type="text"
                            placeholder="Admin comment (optional)"
                            value={comments[form._id] || ''}
                            onChange={e => handleCommentChange(form._id, e.target.value)}
                            style={{ 
                              width: '100%',
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              marginBottom: 4
                            }}
                          />
                          <button 
                            className="njd-btn"
                            onClick={() => handleAction(form._id, 'approved')} 
                          >
                            Approve
                          </button>
                          <button 
                            className="njd-btn danger"
                            onClick={() => handleAction(form._id, 'rejected')} 
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      <button 
                        className="njd-btn danger"
                        onClick={() => handleDelete(form._id)} 
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <ALS />
      )}

      {showVacationManager && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 400, maxWidth: 600, width: '100%', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.13)' }}>
            <button onClick={closeVacationManager} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>&times;</button>
            <h2 style={{ marginTop: 0 }}>Manage Vacation Days</h2>
            <input
              type="text"
              placeholder="Search by name..."
              value={vacationManagerSearch}
              onChange={e => setVacationManagerSearch(e.target.value)}
              style={{ marginBottom: 12, width: '60%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            {vacationManagerLoading && <p>Loading...</p>}
            {vacationManagerError && <p style={{ color: 'red' }}>{vacationManagerError}</p>}
            {vacationManagerSuccess && <p style={{ color: 'green' }}>{vacationManagerSuccess}</p>}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Vacation Days Left</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allEmployees.filter(emp => emp.name.toLowerCase().includes(vacationManagerSearch.toLowerCase())).map(emp => (
                  <tr key={emp._id}>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={vacationEdits[emp._id] !== undefined ? vacationEdits[emp._id] : emp.vacationDaysLeft}
                        onChange={e => handleVacationEdit(emp._id, e.target.value)}
                        style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #bbb' }}
                      />
                    </td>
                    <td>
                      <button className="njd-btn" style={{ padding: '6px 14px', fontSize: 15 }} onClick={() => handleVacationSave(emp._id)}>
                        Save
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
  );
};

export default AdminDashboard; 