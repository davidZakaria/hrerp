import React, { useState, useEffect } from 'react';
import LogoutButton from './LogoutButton';

const SuperAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modificationReason, setModificationReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({});
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    severity: '',
    startDate: '',
    endDate: ''
  });
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({});
  const [userEdit, setUserEdit] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    vacationDaysLeft: 0,
    status: '',
    managedDepartments: []
  });

  // Create User state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'employee',
    status: 'active',
    vacationDaysLeft: 21,
    managedDepartments: []
  });

  // Available departments
  const availableDepartments = [
    'Human Resources',
    'Finance', 
    'Marketing',
    'Sales',
    'Information Technology',
    'Operations',
    'Customer Service',
    'Legal',
    'Personal Assistant',
    'Service',
    'Driver',
    'Reception',
    'Jamila Engineer',
    'Jura Engineer', 
    'Green Icon Engineer',
    'Green Avenue Engineer',
    'Architectural Engineer',
    'Technical Office Engineer',
    'Other'
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users/all', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.msg || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  const fetchForms = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/all', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setForms(data);
      } else {
        setError(data.msg || 'Failed to fetch forms');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError('');
    const token = localStorage.getItem('token');
    try {
      const queryParams = new URLSearchParams({
        page: auditPage,
        limit: 20,
        ...auditFilters
      });
      
      const res = await fetch(`http://localhost:5000/api/audit?${queryParams}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.audits);
        setAuditPagination(data.pagination);
      } else {
        setAuditError(data.msg || 'Failed to fetch audit logs');
      }
    } catch (err) {
      setAuditError('Error connecting to server');
    }
    setAuditLoading(false);
  };

  const fetchAuditStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/audit/stats', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setAuditStats(data);
      }
    } catch (err) {
      console.error('Error fetching audit stats:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'forms') {
      fetchForms();
    } else if (activeTab === 'logs') {
      fetchAuditLogs();
      fetchAuditStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [auditPage, auditFilters]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUserEdit({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      vacationDaysLeft: user.vacationDaysLeft,
      status: user.status,
      managedDepartments: user.managedDepartments || []
    });
  };

  const handleUserUpdate = async () => {
    if (!modificationReason) {
      setError('Please provide a reason for the modification');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/users/super/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          ...userEdit,
          modificationReason: modificationReason,
          managedDepartments: userEdit.role === 'manager' ? userEdit.managedDepartments : []
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User updated successfully');
        fetchUsers();
        setSelectedUser(null);
        setModificationReason('');
      } else {
        setError(data.msg || 'Failed to update user');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User created successfully');
        setNewUser({
          name: '',
          email: '',
          password: '',
          department: '',
          role: 'employee',
          status: 'active',
          vacationDaysLeft: 21,
          managedDepartments: []
        });
        setShowCreateUserModal(false);
        fetchUsers();
      } else {
        setError(data.msg || 'Failed to create user');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  // Handle department selection for managers (new user)
  const handleDepartmentChange = (department) => {
    const currentDepts = newUser.managedDepartments || [];
    if (currentDepts.includes(department)) {
      setNewUser({
        ...newUser,
        managedDepartments: currentDepts.filter(d => d !== department)
      });
    } else {
      setNewUser({
        ...newUser,
        managedDepartments: [...currentDepts, department]
      });
    }
  };

  // Handle department selection for managers (edit user)
  const handleEditDepartmentChange = (department) => {
    const currentDepts = userEdit.managedDepartments || [];
    if (currentDepts.includes(department)) {
      setUserEdit({
        ...userEdit,
        managedDepartments: currentDepts.filter(d => d !== department)
      });
    } else {
      setUserEdit({
        ...userEdit,
        managedDepartments: [...currentDepts, department]
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'active' || status === 'approved' ? 'badge-success' : 
                       status === 'pending' ? 'badge-warning' : 'badge-danger';
    return <span className={`badge-elegant ${statusClass}`}>{status}</span>;
  };

  return (
    <div className="dashboard-container fade-in">
      <div className="app-header">
        <h1 className="app-title">Super Admin Dashboard</h1>
        <LogoutButton />
      </div>
      
      <div className="main-content">
        <div className="grid-4">
          <div className="stats-card hover-lift">
            <div className="stats-number">{users.length}</div>
            <div className="stats-label">Total Users</div>
          </div>
          <div className="stats-card hover-lift">
            <div className="stats-number">{users.filter(u => u.status === 'active').length}</div>
            <div className="stats-label">Active Users</div>
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

        <div className="elegant-card">
          <div className="action-buttons" style={{ marginBottom: '2rem' }}>
            <button 
              className={`btn-elegant ${activeTab === 'users' ? 'btn-success' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              User Management
            </button>
            <button 
              className={`btn-elegant ${activeTab === 'forms' ? 'btn-success' : ''}`}
              onClick={() => setActiveTab('forms')}
            >
              Form Management
            </button>
            <button 
              className={`btn-elegant ${activeTab === 'logs' ? 'btn-success' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              Audit Logs
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="Search users or forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input-elegant"
              style={{ maxWidth: '400px' }}
            />
          </div>

          {error && (
            <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
              {error}
              <button 
                onClick={() => setError('')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  marginLeft: '10px',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {success && (
            <div className="notification success" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
              {success}
              <button 
                onClick={() => setSuccess('')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  marginLeft: '10px',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {loading && <div className="spinner-elegant"></div>}

          {activeTab === 'users' && (
            <div className="grid-2">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="text-gradient" style={{ margin: 0 }}>User List</h3>
                  <button 
                    className="btn-elegant btn-success"
                    onClick={() => setShowCreateUserModal(true)}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    👤 Create New User
                  </button>
                </div>
                <div className="table-container">
                  <table className="table-elegant">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(user => 
                          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(user => (
                          <tr key={user._id}>
                            <td className="text-elegant">{user.name}</td>
                            <td className="text-elegant">{user.email}</td>
                            <td className="text-elegant">{user.role}</td>
                            <td>{getStatusBadge(user.status)}</td>
                            <td>
                              <button 
                                className="btn-elegant"
                                onClick={() => handleUserSelect(user)}
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedUser && (
                <div className="glass-card">
                  <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>Edit User</h3>
                  <form className="form-elegant" onSubmit={(e) => { e.preventDefault(); handleUserUpdate(); }}>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Name</label>
                      <input
                        type="text"
                        value={userEdit.name}
                        onChange={(e) => setUserEdit({...userEdit, name: e.target.value})}
                        className="form-input-elegant"
                      />
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Email</label>
                      <input
                        type="email"
                        value={userEdit.email}
                        onChange={(e) => setUserEdit({...userEdit, email: e.target.value})}
                        className="form-input-elegant"
                      />
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Department</label>
                      <input
                        type="text"
                        value={userEdit.department}
                        onChange={(e) => setUserEdit({...userEdit, department: e.target.value})}
                        className="form-input-elegant"
                      />
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Role</label>
                      <select
                        value={userEdit.role}
                        onChange={(e) => setUserEdit({...userEdit, role: e.target.value})}
                        className="form-input-elegant"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Status</label>
                      <select
                        value={userEdit.status}
                        onChange={(e) => setUserEdit({...userEdit, status: e.target.value})}
                        className="form-input-elegant"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Vacation Days Left</label>
                      <input
                        type="number"
                        value={userEdit.vacationDaysLeft}
                        onChange={(e) => setUserEdit({...userEdit, vacationDaysLeft: parseInt(e.target.value)})}
                        className="form-input-elegant"
                      />
                    </div>
                    
                    {userEdit.role === 'manager' && (
                      <div className="form-group-elegant">
                        <label className="form-label-elegant">
                          Managed Departments ({userEdit.managedDepartments?.length || 0} selected)
                        </label>
                        <div className="selection-help" style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                          Click on the department cards below to assign departments this manager will oversee.
                        </div>
                        <div className="departments-grid" style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                          gap: '0.5rem',
                          marginTop: '0.5rem',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {availableDepartments.map(dept => (
                            <div 
                              key={dept}
                              onClick={() => handleEditDepartmentChange(dept)}
                              style={{
                                padding: '0.6rem',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                backgroundColor: userEdit.managedDepartments?.includes(dept) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                borderColor: userEdit.managedDepartments?.includes(dept) ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '0.85rem'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={userEdit.managedDepartments?.includes(dept) || false}
                                onChange={() => {}}
                                style={{ marginRight: '0.4rem' }}
                              />
                              <span style={{ color: '#fff' }}>{dept}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">Modification Reason</label>
                      <textarea
                        value={modificationReason}
                        onChange={(e) => setModificationReason(e.target.value)}
                        className="form-input-elegant"
                        rows="3"
                        placeholder="Explain why you're making this change..."
                        required
                      />
                    </div>
                    <div className="action-buttons">
                      <button type="submit" className="btn-elegant btn-success">
                        Update User
                      </button>
                      <button 
                        type="button" 
                        className="btn-elegant"
                        onClick={() => setSelectedUser(null)}
                        style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#333' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'forms' && (
            <div>
              <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>Form Management</h3>
              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms
                      .filter(form => 
                        form.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        form.type?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(form => (
                        <tr key={form._id}>
                          <td className="text-elegant">{form.user?.name}</td>
                          <td className="text-elegant">{form.type}</td>
                          <td>{getStatusBadge(form.status)}</td>
                          <td className="text-elegant">{new Date(form.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="btn-elegant"
                              onClick={() => {}}
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Correct
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>System Audit Logs</h3>
              
              {auditStats.total !== undefined && (
                <div className="grid-4" style={{ marginBottom: '2rem' }}>
                  <div className="stats-card">
                    <div className="stats-number">{auditStats.total}</div>
                    <div className="stats-label">Total Logs</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-number">{auditStats.today}</div>
                    <div className="stats-label">Today</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-number">{auditStats.lastWeek}</div>
                    <div className="stats-label">Last Week</div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-number">{auditStats.bySeverity?.CRITICAL || 0}</div>
                    <div className="stats-label">Critical Events</div>
                  </div>
                </div>
              )}

              <div className="elegant-card" style={{ marginBottom: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#ffffff' }}>Filter Audit Logs</h4>
                <div className="grid-4">
                  <div className="form-group-elegant">
                    <label className="form-label-elegant">Action Type</label>
                    <select
                      value={auditFilters.action}
                      onChange={(e) => setAuditFilters({...auditFilters, action: e.target.value})}
                      className="form-input-elegant"
                    >
                      <option value="">All Actions</option>
                      <option value="USER_LOGIN">User Login</option>
                      <option value="USER_CREATED">User Created</option>
                      <option value="USER_UPDATED">User Updated</option>
                      <option value="USER_DELETED">User Deleted</option>
                      <option value="FORM_CREATED">Form Created</option>
                      <option value="FORM_APPROVED">Form Approved</option>
                      <option value="FORM_REJECTED">Form Rejected</option>
                      <option value="SUPER_ADMIN_ACTION">Super Admin Action</option>
                    </select>
                  </div>
                  <div className="form-group-elegant">
                    <label className="form-label-elegant">Severity</label>
                    <select
                      value={auditFilters.severity}
                      onChange={(e) => setAuditFilters({...auditFilters, severity: e.target.value})}
                      className="form-input-elegant"
                    >
                      <option value="">All Severities</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div className="form-group-elegant">
                    <label className="form-label-elegant">Start Date</label>
                    <input
                      type="date"
                      value={auditFilters.startDate}
                      onChange={(e) => setAuditFilters({...auditFilters, startDate: e.target.value})}
                      className="form-input-elegant"
                    />
                  </div>
                  <div className="form-group-elegant">
                    <label className="form-label-elegant">End Date</label>
                    <input
                      type="date"
                      value={auditFilters.endDate}
                      onChange={(e) => setAuditFilters({...auditFilters, endDate: e.target.value})}
                      className="form-input-elegant"
                    />
                  </div>
                </div>
                <div className="action-buttons" style={{ marginTop: '1rem' }}>
                  <button 
                    className="btn-elegant"
                    onClick={() => setAuditFilters({ action: '', severity: '', startDate: '', endDate: '' })}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {auditError && (
                <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
                  {auditError}
                  <button 
                    onClick={() => setAuditError('')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'inherit', 
                      marginLeft: '10px',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {auditLoading && <div className="spinner-elegant"></div>}

              <div className="table-container">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Target User</th>
                      <th>Description</th>
                      <th>Severity</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log._id}>
                        <td className="text-elegant">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="text-elegant">{log.action.replace(/_/g, ' ')}</td>
                        <td className="text-elegant">
                          {log.performedBy ? `${log.performedBy.name} (${log.performedBy.email})` : 'System'}
                        </td>
                        <td className="text-elegant">
                          {log.targetUser ? `${log.targetUser.name} (${log.targetUser.email})` : '-'}
                        </td>
                        <td className="text-elegant" style={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                          {log.description}
                        </td>
                        <td>
                          <span 
                            className={`badge-elegant ${
                              log.severity === 'CRITICAL' ? 'badge-danger' :
                              log.severity === 'HIGH' ? 'badge-warning' :
                              log.severity === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="text-elegant">{log.ipAddress || '-'}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && !auditLoading && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                          No audit logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {auditPagination.pages > 1 && (
                <div className="action-buttons" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                  <button 
                    className="btn-elegant"
                    onClick={() => setAuditPage(1)}
                    disabled={auditPage === 1}
                  >
                    First
                  </button>
                  <button 
                    className="btn-elegant"
                    onClick={() => setAuditPage(auditPage - 1)}
                    disabled={auditPage === 1}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 1rem', color: '#ffffff' }}>
                    Page {auditPage} of {auditPagination.pages}
                  </span>
                  <button 
                    className="btn-elegant"
                    onClick={() => setAuditPage(auditPage + 1)}
                    disabled={auditPage === auditPagination.pages}
                  >
                    Next
                  </button>
                  <button 
                    className="btn-elegant"
                    onClick={() => setAuditPage(auditPagination.pages)}
                    disabled={auditPage === auditPagination.pages}
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-elegant" onClick={() => setShowCreateUserModal(false)}>
          <div className="modal-content-elegant" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'relative', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="text-gradient" style={{ margin: 0 }}>Create New User</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowCreateUserModal(false)}
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
                title="Close"
              >
                ×
              </button>
            </div>
            
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
                  minLength="6"
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
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group-elegant">
                <label className="form-label-elegant">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({
                    ...newUser, 
                    role: e.target.value, 
                    managedDepartments: e.target.value === 'manager' ? newUser.managedDepartments : []
                  })}
                  className="form-input-elegant"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              
              <div className="form-group-elegant">
                <label className="form-label-elegant">Status</label>
                <select
                  value={newUser.status}
                  onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                  className="form-input-elegant"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="form-group-elegant">
                <label className="form-label-elegant">Vacation Days</label>
                <input
                  type="number"
                  value={newUser.vacationDaysLeft}
                  onChange={(e) => setNewUser({...newUser, vacationDaysLeft: parseInt(e.target.value) || 0})}
                  className="form-input-elegant"
                  min="0"
                  max="365"
                />
              </div>
              
              {newUser.role === 'manager' && (
                <div className="form-group-elegant">
                  <label className="form-label-elegant">
                    Managed Departments ({newUser.managedDepartments?.length || 0} selected)
                  </label>
                  <div className="selection-help" style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Click on the department cards below to assign departments this manager will oversee. Selected departments will be highlighted in blue.
                  </div>
                  <div className="departments-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    {availableDepartments.map(dept => (
                      <div 
                        key={dept}
                        className={`department-card ${newUser.managedDepartments?.includes(dept) ? 'selected' : ''}`}
                        onClick={() => handleDepartmentChange(dept)}
                        style={{
                          padding: '0.8rem',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          backgroundColor: newUser.managedDepartments?.includes(dept) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                          borderColor: newUser.managedDepartments?.includes(dept) ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newUser.managedDepartments?.includes(dept) || false}
                          onChange={() => {}}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span className="department-name" style={{ color: '#fff', fontSize: '0.9rem' }}>{dept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="action-buttons" style={{ marginTop: '2rem' }}>
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
    </div>
  );
};

export default SuperAdminDashboard;
