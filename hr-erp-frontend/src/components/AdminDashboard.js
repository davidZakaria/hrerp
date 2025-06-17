import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ALS from './ALS/ALS';
import LogoutButton from './LogoutButton';

const AdminDashboard = () => {
  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Forms Management state
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState('');
  const [comments, setComments] = useState({});
  const [formsSearch, setFormsSearch] = useState('');
  const [vacationDaysMap, setVacationDaysMap] = useState({});
  
  // User Management state
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  
  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showVacationManager, setShowVacationManager] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Reports state
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  
  // Vacation Manager state
  const [allEmployees, setAllEmployees] = useState([]);
  const [vacationEdits, setVacationEdits] = useState({});
  const [vacationManagerLoading, setVacationManagerLoading] = useState(false);
  const [vacationManagerError, setVacationManagerError] = useState('');
  const [vacationManagerSuccess, setVacationManagerSuccess] = useState('');
  const [vacationManagerSearch, setVacationManagerSearch] = useState('');
  
  // Create User state
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    department: '', 
    role: 'employee' 
  });
  const [message, setMessage] = useState('');

  // Fetch vacation days for a user
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

  // Fetch all forms
  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    setFormsError('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('http://localhost:5000/api/forms/admin', {
        headers: { 'x-auth-token': token }
      });
      const data = res.data;
      setForms(data);
      // Fetch vacation days for each unique user
      const userIds = Array.from(new Set(data.map(f => f.user?._id).filter(Boolean)));
      userIds.forEach(userId => fetchVacationDays(userId));
    } catch (err) {
      console.error('Forms fetch error:', err);
      if (err.response) {
        // Server responded with error status
        setFormsError(err.response.data?.msg || `Server error: ${err.response.status}`);
      } else if (err.request) {
        // Request was made but no response received
        setFormsError('No response from server. Please check if the server is running.');
      } else {
        // Something else happened
        setFormsError(`Error: ${err.message}`);
      }
    }
    setFormsLoading(false);
  }, [fetchVacationDays]);

  // Fetch all users (active and pending)
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { 'x-auth-token': token }
      });
      const allUsers = res.data;
      setUsers(allUsers.filter(user => user.status === 'active'));
      setPendingUsers(allUsers.filter(user => user.status === 'pending'));
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError('Error fetching users');
    }
    setUsersLoading(false);
  };

  // Approve pending user
  const handleApproveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/users/${userId}/status`, 
        { status: 'active' },
        { headers: { 'x-auth-token': token } }
      );
      setMessage('User approved successfully');
      fetchUsers(); // Refresh the lists
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error approving user');
    }
  };

  // Reject pending user
  const handleRejectUser = async (userId) => {
    if (window.confirm('Are you sure you want to reject this user registration?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/users/${userId}`, {
          headers: { 'x-auth-token': token }
        });
        setMessage('User registration rejected');
        fetchUsers(); // Refresh the lists
      } catch (err) {
        setMessage(err.response?.data?.msg || 'Error rejecting user');
      }
    }
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/users', 
        { ...newUser, status: 'active' }, // Admin-created users are active by default
        { headers: { 'x-auth-token': token } }
      );
      setMessage('User created successfully');
      setNewUser({ name: '', email: '', password: '', department: '', role: 'employee' });
      setShowCreateUserModal(false);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error creating user');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/users/${userId}`, {
          headers: { 'x-auth-token': token }
        });
        setMessage('User deleted successfully');
        fetchUsers();
      } catch (err) {
        setMessage(err.response?.data?.msg || 'Error deleting user');
      }
    }
  };

  // Forms Management Functions
  const handleCommentChange = (id, value) => {
    setComments({ ...comments, [id]: value });
  };

  const handleFormAction = async (id, status) => {
    const token = localStorage.getItem('token');
    setFormsError('');
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
      const data = await res.json();
      if (res.ok) {
        fetchForms();
        const form = forms.find(f => f._id === id);
        if (form && form.user?._id) fetchVacationDays(form.user._id);
      } else {
        setFormsError(data.msg || 'Failed to update form.');
        if (data.msg?.includes('insufficient vacation days')) {
          handleCommentChange(id, data.msg);
        }
      }
    } catch (err) {
      setFormsError('Error connecting to server.');
    }
  };

  const handleDeleteForm = async (id) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      const token = localStorage.getItem('token');
      setFormsError('');
      try {
        const res = await fetch(`http://localhost:5000/api/forms/${id}`, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          fetchForms();
        } else {
          const data = await res.json();
          setFormsError(data.msg || 'Failed to delete form.');
        }
      } catch (err) {
        setFormsError('Error connecting to server.');
      }
    }
  };

  // Vacation Management Functions
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

  // Utility functions
  const getStatusBadge = (status) => {
    const statusClass = status === 'active' ? 'badge-success' : 
                       status === 'pending' ? 'badge-warning' : 'badge-danger';
    return <span className={`badge-elegant ${statusClass}`}>{status}</span>;
  };

  const handleShowReport = () => {
    setShowReport(true);
    fetchVacationDaysReport();
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter functions
  const filteredForms = forms.filter(form =>
    form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(usersSearch.toLowerCase())
  );

  const filteredPendingUsers = pendingUsers.filter(user =>
    user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(usersSearch.toLowerCase())
  );

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'forms') {
      fetchForms();
    } else if (activeTab === 'users' || activeTab === 'overview') {
      fetchUsers();
    }
  }, [activeTab, fetchForms]);

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchForms();
  }, [fetchForms]);

  if (usersLoading && activeTab === 'overview') {
    return (
      <div className="dashboard-container">
        <div className="spinner-elegant"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">Admin Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Navigation Tabs */}
      <div className="elegant-card" style={{ marginBottom: '2rem' }}>
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
          <button 
            className={`tab-button ${activeTab === 'forms' ? 'active' : ''}`}
            onClick={() => setActiveTab('forms')}
          >
            📋 Forms Management
          </button>
          <button 
            className={`tab-button ${activeTab === 'ats' ? 'active' : ''}`}
            onClick={() => setActiveTab('ats')}
          >
            🎯 ATS System
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Stats Cards */}
            <div className="grid-4">
              <div className="stats-card hover-lift">
                <div className="stats-number">{users.length}</div>
                <div className="stats-label">Active Users</div>
              </div>
              <div className="stats-card hover-lift">
                <div className="stats-number">{pendingUsers.length}</div>
                <div className="stats-label">Pending Approvals</div>
              </div>
              <div className="stats-card hover-lift">
                <div className="stats-number">{forms.length}</div>
                <div className="stats-label">Total Forms</div>
              </div>
              <div className="stats-card hover-lift">
                <div className="stats-number">{forms.filter(f => f.status === 'pending').length}</div>
                <div className="stats-label">Pending Forms</div>
              </div>
            </div>

            {/* Pending User Approvals */}
            {pendingUsers.length > 0 && (
              <div className="elegant-card">
                <h2 className="section-title">
                  🔔 Pending User Registrations ({pendingUsers.length})
                </h2>
                <div className="pending-users-grid">
                  {pendingUsers.map(user => (
                    <div key={user._id} className="pending-user-card">
                      <div className="user-info">
                        <h3>{user.name}</h3>
                        <p>{user.email}</p>
                        <p><strong>Department:</strong> {user.department}</p>
                        <p><strong>Registered:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="user-actions">
                        <button 
                          className="btn-elegant btn-success"
                          onClick={() => handleApproveUser(user._id)}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className="btn-elegant btn-danger"
                          onClick={() => handleRejectUser(user._id)}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="elegant-card">
              <h2 className="section-title">Quick Actions</h2>
              <div className="action-buttons">
                <button 
                  className="btn-elegant btn-success"
                  onClick={() => setShowCreateUserModal(true)}
                >
                  👤 Create New User
                </button>
                <button 
                  className="btn-elegant"
                  onClick={() => {
                    setShowVacationManager(true);
                    fetchAllEmployees();
                  }}
                >
                  🏖️ Manage Vacation Days
                </button>
                <button 
                  className="btn-elegant"
                  onClick={handleShowReport}
                >
                  📊 Vacation Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2 className="section-title">User Management</h2>
              <div className="section-actions">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="search-input"
                />
                <button 
                  className="btn-elegant btn-success"
                  onClick={() => setShowCreateUserModal(true)}
                >
                  Create New User
                </button>
              </div>
            </div>

            {usersError && <div className="error-message">{usersError}</div>}

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
              <div className="elegant-card">
                <h3 className="subsection-title">
                  Pending Registrations ({pendingUsers.length})
                </h3>
                <div className="table-container">
                  <table className="table-elegant">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Managed Departments</th>
                        <th>Registration Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPendingUsers.map(user => (
                        <tr key={user._id} className="hover-lift">
                          <td className="text-elegant">{user.name}</td>
                          <td className="text-elegant">{user.email}</td>
                          <td>
                            <span className={`role-badge role-${user.role}`}>
                              {user.role === 'manager' ? 'Manager' : 'Employee'}
                            </span>
                          </td>
                          <td className="text-elegant">{user.department}</td>
                          <td className="text-elegant">
                            {user.role === 'manager' ? (
                              user.managedDepartments && user.managedDepartments.length > 0 ? (
                                <div className="managed-departments">
                                  {user.managedDepartments.map((dept, index) => (
                                    <span key={index} className="department-tag">
                                      {dept}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="no-departments">No departments assigned</span>
                              )
                            ) : (
                              <span className="not-applicable">N/A</span>
                            )}
                          </td>
                          <td className="text-elegant">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="action-buttons-inline">
                              <button 
                                className="btn-elegant btn-success btn-sm"
                                onClick={() => handleApproveUser(user._id)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn-elegant btn-danger btn-sm"
                                onClick={() => handleRejectUser(user._id)}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Active Users Section */}
            <div className="elegant-card">
              <h3 className="subsection-title">
                Active Users ({users.length})
              </h3>
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user._id} className="hover-lift">
                        <td className="text-elegant">{user.name}</td>
                        <td className="text-elegant">{user.email}</td>
                        <td className="text-elegant">{user.department}</td>
                        <td className="text-elegant">{user.role}</td>
                        <td className="text-elegant">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td>
                          <button 
                            className="btn-elegant btn-danger btn-sm"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Forms Management Tab */}
        {activeTab === 'forms' && (
          <div className="forms-section">
            <div className="section-header">
              <h2 className="section-title">📋 Forms Management Dashboard</h2>
              <div className="section-actions">
                <input
                  type="text"
                  placeholder="🔍 Search by employee name, email, or department..."
                  value={formsSearch}
                  onChange={(e) => setFormsSearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Forms Summary Cards */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}>
                <div className="stats-number">{forms.filter(f => f.status === 'pending').length}</div>
                <div className="stats-label">Pending Manager</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)' }}>
                <div className="stats-number">{forms.filter(f => f.status === 'manager_approved').length}</div>
                <div className="stats-label">Awaiting HR</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)' }}>
                <div className="stats-number">{forms.filter(f => f.status === 'approved').length}</div>
                <div className="stats-label">Approved</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #f44336, #d32f2f)' }}>
                <div className="stats-number">{forms.filter(f => f.status === 'rejected').length}</div>
                <div className="stats-label">Rejected</div>
              </div>
            </div>

            {formsError && <div className="error-message">{formsError}</div>}
            {formsLoading && <div className="spinner-elegant"></div>}

            {/* Pending Manager Approval Section */}
            <div className="elegant-card" style={{ marginBottom: '2rem' }}>
              <h3 className="subsection-title" style={{ color: '#ff9800', marginBottom: '1rem' }}>
                ⏳ Pending Manager Approval ({forms.filter(f => f.status === 'pending').length})
              </h3>
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Manager</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.filter(form => 
                      form.status === 'pending' && 
                      (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                       form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()))
                    ).map(form => (
                      <tr key={form._id} className="hover-lift">
                        <td>
                          <div className="employee-info">
                            <div className="employee-name">{form.user?.name}</div>
                            <div className="employee-email">{form.user?.email}</div>
                          </div>
                        </td>
                        <td className="text-elegant">{form.user?.department}</td>
                        <td className="text-elegant">
                          <span style={{ color: '#666', fontStyle: 'italic' }}>
                            Awaiting manager review
                          </span>
                        </td>
                        <td className="text-elegant">{form.type}</td>
                        <td className="text-elegant">
                          {form.type === 'vacation' ? (
                            <>
                              <div>From: {form.startDate?.slice(0,10)}</div>
                              <div>To: {form.endDate?.slice(0,10)}</div>
                            </>
                          ) : (
                            <>
                              <div>From: {form.fromHour || '-'}</div>
                              <div>To: {form.toHour || '-'}</div>
                            </>
                          )}
                        </td>
                        <td className="text-elegant">
                          <div className="reason-text">{form.reason}</div>
                        </td>
                        <td>
                          <span className="status-badge status-pending">
                            Pending Manager
                          </span>
                        </td>
                        <td className="text-elegant">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {forms.filter(f => f.status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          No forms pending manager approval
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Awaiting HR Approval Section */}
            <div className="elegant-card" style={{ marginBottom: '2rem' }}>
              <h3 className="subsection-title" style={{ color: '#2196f3', marginBottom: '1rem' }}>
                👨‍💼 Awaiting HR Approval ({forms.filter(f => f.status === 'manager_approved').length})
              </h3>
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Days Left</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Manager Approval</th>
                      <th>HR Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.filter(form => 
                      form.status === 'manager_approved' && 
                      (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                       form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()))
                    ).map(form => (
                      <tr key={form._id} className="hover-lift">
                        <td>
                          <div className="employee-info">
                            <div className="employee-name">{form.user?.name}</div>
                            <div className="employee-email">{form.user?.email}</div>
                          </div>
                        </td>
                        <td className="text-elegant">{form.user?.department}</td>
                        <td className="text-elegant">
                          {form.user?._id ? (
                            <>
                              {vacationDaysMap[form.user._id] !== undefined ? (
                                <>
                                  {vacationDaysMap[form.user._id]}
                                  {vacationDaysMap[form.user._id] === 0 && (
                                    <span className="no-days-warning">
                                      (No days left!)
                                    </span>
                                  )}
                                </>
                              ) : '...'
                              }
                            </>
                          ) : '-'}
                        </td>
                        <td className="text-elegant">{form.type}</td>
                        <td className="text-elegant">
                          {form.type === 'vacation' ? (
                            <>
                              <div>From: {form.startDate?.slice(0,10)}</div>
                              <div>To: {form.endDate?.slice(0,10)}</div>
                            </>
                          ) : (
                            <>
                              <div>From: {form.fromHour || '-'}</div>
                              <div>To: {form.toHour || '-'}</div>
                            </>
                          )}
                        </td>
                        <td className="text-elegant">
                          <div className="reason-text">{form.reason}</div>
                        </td>
                        <td className="text-elegant">
                          <div className="manager-approval-info">
                            <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '4px' }}>
                              ✅ Approved by Manager
                            </div>
                            {form.managerApprovedAt && (
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {new Date(form.managerApprovedAt).toLocaleDateString()}
                              </div>
                            )}
                            {form.managerComment && (
                              <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px', fontStyle: 'italic' }}>
                                "{form.managerComment}"
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="form-actions">
                            <div className="action-buttons-inline" style={{ marginBottom: '8px' }}>
                              <button
                                onClick={() => handleFormAction(form._id, 'approved')}
                                className="btn-elegant btn-success btn-sm"
                              >
                                Final Approve
                              </button>
                              <button
                                onClick={() => handleFormAction(form._id, 'rejected')}
                                className="btn-elegant btn-danger btn-sm"
                              >
                                Reject
                              </button>
                            </div>
                            <textarea
                              placeholder="HR comment..."
                              value={comments[form._id] || ''}
                              onChange={(e) => handleCommentChange(form._id, e.target.value)}
                              className="comment-textarea"
                              style={{ fontSize: '0.8rem' }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {forms.filter(f => f.status === 'manager_approved').length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          No forms awaiting HR approval
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Completed Forms Section */}
            <div className="elegant-card">
              <h3 className="subsection-title" style={{ color: '#666', marginBottom: '1rem' }}>
                📋 All Forms History ({forms.filter(f => ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length})
              </h3>
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Final Status</th>
                      <th>Comments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.filter(form => 
                      ['approved', 'rejected', 'manager_rejected'].includes(form.status) &&
                      (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                       form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()))
                    ).map(form => (
                      <tr key={form._id} className="hover-lift">
                        <td>
                          <div className="employee-info">
                            <div className="employee-name">{form.user?.name}</div>
                            <div className="employee-email">{form.user?.email}</div>
                          </div>
                        </td>
                        <td className="text-elegant">{form.user?.department}</td>
                        <td className="text-elegant">{form.type}</td>
                        <td className="text-elegant">
                          {form.type === 'vacation' ? (
                            <>
                              <div>From: {form.startDate?.slice(0,10)}</div>
                              <div>To: {form.endDate?.slice(0,10)}</div>
                            </>
                          ) : (
                            <>
                              <div>From: {form.fromHour || '-'}</div>
                              <div>To: {form.toHour || '-'}</div>
                            </>
                          )}
                        </td>
                        <td className="text-elegant">
                          <div className="reason-text">{form.reason}</div>
                        </td>
                        <td>
                          <span className={`status-badge status-${form.status}`}>
                            {form.status === 'manager_rejected' ? 'Rejected by Manager' : form.status}
                          </span>
                        </td>
                        <td className="text-elegant">
                          <div style={{ fontSize: '0.8rem' }}>
                            {form.managerComment && (
                              <div style={{ marginBottom: '4px' }}>
                                <strong>Manager:</strong> {form.managerComment}
                              </div>
                            )}
                            {form.adminComment && (
                              <div>
                                <strong>HR:</strong> {form.adminComment}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteForm(form._id)}
                            className="btn-elegant btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {forms.filter(f => ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          No completed forms found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ATS System Tab */}
        {activeTab === 'ats' && (
          <div className="ats-section">
            <div className="section-header">
              <h2 className="section-title">🎯 Applicant Tracking System</h2>
              <div className="section-actions">
                <div className="ats-info-badge">
                  Professional Recruitment Management
                </div>
              </div>
            </div>
            <div className="ats-wrapper">
              <ALS />
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-elegant">
          <div className="modal-content-elegant">
            <h2 className="text-gradient">Create New User</h2>
            <form className="form-elegant" onSubmit={handleCreateUser}>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="form-input-elegant"
                  required
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="form-input-elegant"
                  required
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="form-input-elegant"
                  required
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Department</label>
                <select
                  value={newUser.department}
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  className="form-input-elegant"
                  required
                >
                  <option value="">Select Department</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="IT">Information Technology</option>
                  <option value="Operations">Operations</option>
                  <option value="Customer Service">Customer Service</option>
                  <option value="Legal">Legal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="form-input-elegant"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="action-buttons">
                <button type="submit" className="btn-elegant btn-success">
                  Create User
                </button>
                <button 
                  type="button" 
                  className="btn-elegant"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vacation Manager Modal */}
      {showVacationManager && (
        <div className="modal-elegant" onClick={() => setShowVacationManager(false)}>
          <div className="modal-content-elegant" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'relative', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-gradient" style={{ margin: 0 }}>Manage Vacation Days</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowVacationManager(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666',
                  transition: 'all 0.3s ease',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#333';
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#666';
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                title="Close"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by name..."
              value={vacationManagerSearch}
              onChange={e => setVacationManagerSearch(e.target.value)}
              className="search-input"
              style={{ marginBottom: '1rem' }}
            />
            {vacationManagerLoading && <div className="spinner-elegant"></div>}
            {vacationManagerError && <div className="error-message">{vacationManagerError}</div>}
            {vacationManagerSuccess && <div className="success-message">{vacationManagerSuccess}</div>}
            
            <div className="table-container">
              <table className="table-elegant">
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
                          className="vacation-input"
                        />
                      </td>
                      <td>
                        <button 
                          className="btn-elegant btn-success btn-sm" 
                          onClick={() => handleVacationSave(emp._id)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="action-buttons">
              <button 
                className="btn-elegant"
                onClick={() => setShowVacationManager(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Days Report Modal */}
      {showReport && (
        <div className="modal-elegant">
          <div className="modal-content-elegant" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="text-gradient">Vacation Days Report</h2>
              <button 
                className="btn-elegant"
                onClick={handlePrint}
              >
                Print Report
              </button>
            </div>

            {reportLoading && <div className="spinner-elegant"></div>}
            {reportError && <div className="error-message">{reportError}</div>}
            
            {!reportLoading && !reportError && (
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Vacation Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(employee => (
                      <tr key={employee._id}>
                        <td>{employee.name}</td>
                        <td>{employee.department}</td>
                        <td>{employee.email}</td>
                        <td className={employee.vacationDaysLeft === 0 ? 'no-days-left' : ''}>
                          {employee.vacationDaysLeft}
                          {employee.vacationDaysLeft === 0 && (
                            <span className="no-days-warning"> (No days left!)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="action-buttons">
              <button 
                className="btn-elegant"
                onClick={() => setShowReport(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Notification */}
      {message && (
        <div className={`notification ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
          <button 
            onClick={() => setMessage('')}
            className="notification-close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 