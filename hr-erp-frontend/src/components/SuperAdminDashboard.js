import React, { useState, useEffect } from 'react';
import LogoutButton from './LogoutButton';
import { useTranslation } from 'react-i18next';
import AttendanceManagement from './AttendanceManagement';

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
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

  // Form Management state
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formEditData, setFormEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Available departments
  const availableDepartments = [
    'Human Resources',
    'Finance', 
    'Marketing',
    'Sales',
    'Information Technology',
    'Operations',
    'Engineer',
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

  // Clear audit logs state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDays, setClearDays] = useState(90);
  const [clearLoading, setClearLoading] = useState(false);
  const [deleteAllLogs, setDeleteAllLogs] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/users/all', {
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
      const res = await fetch('http://localhost:5001/api/forms/all', {
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
      
      const res = await fetch(`http://localhost:5001/api/audit?${queryParams}`, {
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
      const res = await fetch('http://localhost:5001/api/audit/stats', {
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
      const res = await fetch(`http://localhost:5001/api/users/super/${selectedUser._id}`, {
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
      const res = await fetch('http://localhost:5001/api/users', {
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

  // Form Management Functions
  const handleViewForm = (form) => {
    setSelectedForm(form);
    setShowFormModal(true);
  };

  const handleCorrectForm = (form) => {
    setSelectedForm(form);
    setFormEditData({
      type: form.type,
      startDate: form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : '',
      endDate: form.endDate ? new Date(form.endDate).toISOString().split('T')[0] : '',
      days: form.days || '',
      reason: form.reason || '',
      status: form.status
    });
    setShowFormModal(true);
  };

  const handleDeleteForm = (formId) => {
    setShowDeleteConfirm(formId);
  };

  const confirmDeleteForm = async (formId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5001/api/forms/${formId}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Form deleted successfully');
        fetchForms();
        setShowDeleteConfirm(null);
      } else {
        setError(data.msg || 'Failed to delete form');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  const handleFormUpdate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5001/api/forms/${selectedForm._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(formEditData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Form updated successfully');
        fetchForms();
        setShowFormModal(false);
        setSelectedForm(null);
      } else {
        setError(data.msg || 'Failed to update form');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  const handleExportForms = () => {
    try {
      // Create CSV content
      const headers = ['Employee', 'Email', 'Department', 'Form Type', 'Status', 'Start Date', 'End Date', 'Days', 'Reason', 'Submitted Date'];
      const csvContent = [
        headers.join(','),
        ...forms.map(form => [
          `"${form.user?.name || 'Unknown'}"`,
          `"${form.user?.email || 'Unknown'}"`,
          `"${form.user?.department || 'N/A'}"`,
          `"${form.type === 'vacation' ? 'Annual Vacation' :
           form.type.replace('_', ' ')}"`,
          `"${form.status || 'N/A'}"`,
          `"${form.startDate ? new Date(form.startDate).toLocaleDateString() : 'N/A'}"`,
          `"${form.endDate ? new Date(form.endDate).toLocaleDateString() : 'N/A'}"`,
          `"${form.days || 'N/A'}"`,
          `"${form.reason?.replace(/"/g, '""') || 'N/A'}"`,
          `"${new Date(form.createdAt).toLocaleDateString()}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `forms_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Forms exported successfully');
    } catch (err) {
      setError('Error exporting forms');
    }
  };

  // Download audit logs
  const handleDownloadAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams({
        ...auditFilters
      });
      
      const response = await fetch(`http://localhost:5001/api/audit/download?${queryParams}`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSuccess('Audit logs downloaded successfully');
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to download audit logs');
      }
    } catch (err) {
      setError('Error downloading audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Clear audit logs
  const handleClearAuditLogs = async () => {
    try {
      setClearLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5001/api/audit/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          olderThanDays: deleteAllLogs ? 0 : clearDays, // Send 0 days to delete everything
          confirmClear: true,
          deleteAll: deleteAllLogs
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(deleteAllLogs 
          ? `Successfully cleared ALL ${data.deletedCount} audit logs`
          : `Successfully cleared ${data.deletedCount} audit logs older than ${clearDays} days`
        );
        setShowClearModal(false);
        setDeleteAllLogs(false); // Reset the checkbox
        fetchAuditLogs(); // Refresh the logs
        fetchAuditStats(); // Refresh the stats
      } else {
        setError(data.msg || 'Failed to clear audit logs');
      }
    } catch (err) {
      setError('Error clearing audit logs');
    } finally {
      setClearLoading(false);
    }
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
            <button 
              className={`btn-elegant ${activeTab === 'attendance' ? 'btn-success' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              Attendance
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
            <div>
              <div className="section-header-redesign">
                <div className="section-info">
                  <h3 className="text-gradient">User Management</h3>
                  <p className="section-description">Manage system users, roles, and permissions</p>
                </div>
                <div className="section-actions">
                  <button 
                    className="btn-elegant btn-create-user"
                    onClick={() => setShowCreateUserModal(true)}
                  >
                    <span className="btn-icon">👤</span>
                    Create New User
                  </button>
                </div>
              </div>

              <div className="users-container">
                {users
                  .filter(user => 
                    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(user => {
                    const getRoleIcon = (role) => {
                      switch(role) {
                        case 'super_admin': return '⚡';
                        case 'admin': return '👑';
                        case 'manager': return '👔';
                        case 'employee': return '👤';
                        default: return '👤';
                      }
                    };

                    const getRoleColor = (role) => {
                      switch(role) {
                        case 'super_admin': return '#9c27b0';
                        case 'admin': return '#4caf50';
                        case 'manager': return '#ff9800';
                        case 'employee': return '#2196f3';
                        default: return '#747d8c';
                      }
                    };

                    const getStatusColor = (status) => {
                      switch(status) {
                        case 'active': return '#4caf50';
                        case 'inactive': return '#f44336';
                        case 'pending': return '#ff9800';
                        default: return '#747d8c';
                      }
                    };

                    return (
                      <div key={user._id} className="user-card">
                        <div className="user-card-header">
                          <div className="user-avatar">
                            <span className="avatar-icon">{getRoleIcon(user.role)}</span>
                          </div>
                          <div className="user-basic-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                          <div className="user-status-badges">
                            <span 
                              className="role-badge-modern"
                              style={{ backgroundColor: getRoleColor(user.role) }}
                            >
                              {user.role.replace('_', ' ')}
                            </span>
                            <span 
                              className="status-badge-modern"
                              style={{ backgroundColor: getStatusColor(user.status) }}
                            >
                              {user.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="user-card-content">
                          <div className="user-info-grid">
                            <div className="info-item">
                              <span className="info-label">Department:</span>
                              <span className="info-value">{user.department || 'Not assigned'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Vacation Days:</span>
                              <span className="info-value vacation-days">{Number(user.vacationDaysLeft || 0).toFixed(1)} days</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Joined:</span>
                              <span className="info-value">{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Last Login:</span>
                              <span className="info-value">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</span>
                            </div>
                          </div>
                          
                          {user.role === 'manager' && user.managedDepartments && user.managedDepartments.length > 0 && (
                            <div className="managed-departments-display">
                              <span className="info-label">Manages:</span>
                              <div className="departments-tags">
                                {user.managedDepartments.map(dept => (
                                  <span key={dept} className="department-tag-small">{dept}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="user-card-actions">
                          <button 
                            className="btn-elegant btn-edit-user"
                            onClick={() => handleUserSelect(user)}
                          >
                            <span className="btn-icon">✏️</span>
                            Edit User
                          </button>
                          <button 
                            className="btn-elegant btn-view-user"
                            onClick={() => {/* Add view user functionality */}}
                          >
                            <span className="btn-icon">👁️</span>
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                {users.filter(user => 
                  user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.department?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="no-users-message">
                    <div className="no-users-icon">👥</div>
                    <h3>No users found</h3>
                    <p>Try adjusting your search terms or create a new user.</p>
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="modal-elegant" onClick={() => setSelectedUser(null)}>
                  <div className="modal-content-elegant edit-user-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="text-gradient">Edit User: {selectedUser.name}</h2>
                      <button 
                        className="close-btn" 
                        onClick={() => setSelectedUser(null)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          fontSize: '18px',
                          cursor: 'pointer',
                          color: '#fff',
                          transition: 'all 0.3s ease',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
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
                        <select
                          value={userEdit.department}
                          onChange={(e) => setUserEdit({...userEdit, department: e.target.value})}
                          className="form-input-elegant"
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
                          <div className="selection-help">
                            Click on the department cards below to assign departments this manager will oversee.
                          </div>
                          <div className="departments-grid">
                            {availableDepartments.map(dept => (
                              <div 
                                key={dept}
                                className={`department-card ${userEdit.managedDepartments?.includes(dept) ? 'selected' : ''}`}
                                onClick={() => handleEditDepartmentChange(dept)}
                              >
                                <input
                                  type="checkbox"
                                  checked={userEdit.managedDepartments?.includes(dept) || false}
                                  onChange={() => {}}
                                />
                                <span className="department-name">{dept}</span>
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
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'forms' && (
            <div>
              <div className="section-header-redesign">
                <div className="section-info">
                  <h3 className="text-gradient">Form Management</h3>
                  <p className="section-description">Monitor and manage all system forms and applications</p>
                </div>
                <div className="section-actions">
                  <button 
                    className="btn-elegant btn-export"
                    onClick={handleExportForms}
                  >
                    <span className="btn-icon">📊</span>
                    Export Forms
                  </button>
                </div>
              </div>

              <div className="forms-container">
                {forms
                  .filter(form => 
                    form.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    form.type?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(form => {
                    const getFormIcon = (type) => {
                      switch(type) {
                        case 'sick_leave': return '🏥';
                        case 'annual_vacation': return '🏖️';
                        case 'maternity_leave': return '👶';
                        case 'paternity_leave': return '👨‍👶';
                        case 'excuse_hours': return '⏰';
                        default: return '📝';
                      }
                    };

                    const getFormTypeColor = (type) => {
                      switch(type) {
                        case 'sick_leave': return '#f44336';
                        case 'annual_vacation': return '#2196f3';
                        case 'maternity_leave': return '#e91e63';
                        case 'paternity_leave': return '#9c27b0';
                        case 'excuse_hours': return '#ff9800';
                        default: return '#757575';
                      }
                    };

                    const getStatusColor = (status) => {
                      switch(status) {
                        case 'approved': return '#4caf50';
                        case 'rejected': return '#f44336';
                        case 'manager_rejected': return '#f44336';
                        case 'pending': return '#ff9800';
                        default: return '#757575';
                      }
                    };

                    return (
                      <div key={form._id} className="form-card">
                        <div className="form-card-header">
                          <div className="form-icon">
                            <span className="icon-symbol">{getFormIcon(form.type)}</span>
                          </div>
                          <div className="form-basic-info">
                            <div className="form-type">
                              {form.type === 'vacation' ? 'Annual Vacation' :
                               form.type.replace('_', ' ')}
                            </div>
                            <div className="form-employee">{form.user?.name || 'Unknown User'}</div>
                          </div>
                          <div className="form-status-badges">
                            <span 
                              className="form-type-badge"
                              style={{ backgroundColor: getFormTypeColor(form.type) }}
                            >
                              {form.type === 'vacation' ? 'Annual Vacation' :
                               form.type.replace('_', ' ')}
                            </span>
                            <span 
                              className="form-status-badge"
                              style={{ backgroundColor: getStatusColor(form.status) }}
                            >
                              {form.status === 'manager_rejected' ? 'rejected' : form.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="form-card-content">
                          <div className="form-info-grid">
                            <div className="info-item">
                              <span className="info-label">Submitted:</span>
                              <span className="info-value">{new Date(form.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Department:</span>
                              <span className="info-value">{form.user?.department || 'N/A'}</span>
                            </div>
                            {form.type === 'excuse' && (
                              <>
                                <div className="info-item">
                                  <span className="info-label">Excuse Type:</span>
                                  <span className="info-value" style={{ color: form.excuseType === 'paid' ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>
                                    {form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Excuse Date:</span>
                                  <span className="info-value">{form.excuseDate ? new Date(form.excuseDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Time:</span>
                                  <span className="info-value">
                                    {form.fromHour && form.toHour ? `${form.fromHour} - ${form.toHour}` : 'N/A'}
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Duration:</span>
                                  <span className="info-value">
                                    {form.fromHour && form.toHour ? 
                                      `${((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours` : 
                                      'N/A'}
                                  </span>
                                </div>
                              </>
                            )}
                            {form.type === 'vacation' && (
                              <>
                                <div className="info-item">
                                  <span className="info-label">Duration:</span>
                                  <span className="info-value">
                                    {form.startDate && form.endDate ? 
                                      `${new Date(form.startDate).toLocaleDateString()} - ${new Date(form.endDate).toLocaleDateString()}` : 
                                      'N/A'
                                    }
                                  </span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Days Requested:</span>
                                  <span className="info-value">{form.days || 'N/A'} days</span>
                                </div>
                              </>
                            )}
                            {form.type !== 'vacation' && form.type !== 'excuse' && (
                              <>
                                <div className="info-item">
                                  <span className="info-label">Duration:</span>
                                  <span className="info-value">
                                    {form.startDate && form.endDate ? 
                                      `${new Date(form.startDate).toLocaleDateString()} - ${new Date(form.endDate).toLocaleDateString()}` : 
                                      'N/A'
                                    }
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {form.reason && (
                            <div className="form-reason-display">
                              <span className="info-label">Reason:</span>
                              <div className="reason-text-display">{form.reason}</div>
                            </div>
                          )}
                          
                          {form.comments && form.comments.length > 0 && (
                            <div className="form-comments-display">
                              <span className="info-label">Comments:</span>
                              <div className="comments-list">
                                {form.comments.map((comment, index) => (
                                  <div key={index} className="comment-item">
                                    <strong>{comment.by || 'System'}:</strong> {comment.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="form-card-actions">
                          <button 
                            className="btn-elegant btn-view-form"
                            onClick={() => handleViewForm(form)}
                          >
                            <span className="btn-icon">👁️</span>
                            View Details
                          </button>
                          <button 
                            className="btn-elegant btn-correct-form"
                            onClick={() => handleCorrectForm(form)}
                          >
                            <span className="btn-icon">✏️</span>
                            Correct
                          </button>
                          <button 
                            className="btn-elegant btn-delete-form"
                            onClick={() => handleDeleteForm(form._id)}
                          >
                            <span className="btn-icon">🗑️</span>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                {forms.filter(form => 
                  form.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  form.type?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="no-forms-message">
                    <div className="no-forms-icon">📋</div>
                    <h3>No forms found</h3>
                    <p>Try adjusting your search terms or check back later for new submissions.</p>
                  </div>
                )}
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
                      <option value="VACATION_DAYS_MODIFIED">Vacation Days Modified</option>
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
                  <button 
                    className="btn-elegant"
                    onClick={handleDownloadAuditLogs}
                    disabled={loading}
                    style={{ backgroundColor: '#4CAF50', marginLeft: '10px' }}
                  >
                    📥 Download CSV
                  </button>
                  <button 
                    className="btn-elegant"
                    onClick={() => setShowClearModal(true)}
                    style={{ backgroundColor: '#f44336', marginLeft: '10px' }}
                  >
                    🗑️ Clear Old Logs
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

              <div className="audit-logs-container">
                {auditLogs.map(log => {
                  const getActionIcon = (action) => {
                    switch(action) {
                      case 'USER_LOGIN': return '🔐';
                      case 'USER_CREATED': return '👤';
                      case 'USER_UPDATED': return '✏️';
                      case 'USER_DELETED': return '🗑️';
                      case 'FORM_CREATED': return '📝';
                      case 'FORM_APPROVED': return '✅';
                      case 'FORM_REJECTED': return '❌';
                      case 'VACATION_DAYS_MODIFIED': return '🏖️';
                      case 'SUPER_ADMIN_ACTION': return '⚡';
                      default: return '📋';
                    }
                  };

                  const getSeverityColor = (severity) => {
                    switch(severity) {
                      case 'CRITICAL': return '#ff4757';
                      case 'HIGH': return '#ff6b6b';
                      case 'MEDIUM': return '#ffa502';
                      case 'LOW': return '#2ed573';
                      default: return '#747d8c';
                    }
                  };

                  return (
                    <div key={log._id} className="audit-log-card">
                      <div className="audit-log-header">
                        <div className="audit-log-action">
                          <span className="action-icon">{getActionIcon(log.action)}</span>
                          <span className="action-text">{log.action.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="audit-log-meta">
                          <span className="audit-timestamp">
                            {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span 
                            className="severity-badge"
                            style={{ backgroundColor: getSeverityColor(log.severity) }}
                          >
                            {log.severity}
                          </span>
                        </div>
                      </div>
                      
                      <div className="audit-log-content">
                        <div className="audit-log-description">
                          {log.description}
                        </div>
                        
                        {log.action === 'VACATION_DAYS_MODIFIED' && log.oldValues && log.newValues && (
                          <div className="vacation-change-details">
                            <div className="vacation-change-header">
                              <span className="vacation-icon">🏖️</span>
                              <span>Vacation Days Change Details</span>
                            </div>
                            <div className="vacation-change-grid">
                              <div className="change-item from">
                                <label>From:</label>
                                <span>{log.oldValues.vacationDaysLeft} days</span>
                              </div>
                              <div className="change-item to">
                                <label>To:</label>
                                <span>{log.newValues.vacationDaysLeft} days</span>
                              </div>
                              <div className="change-item difference">
                                <label>Change:</label>
                                <span className={log.newValues.vacationDaysLeft - log.oldValues.vacationDaysLeft >= 0 ? 'positive' : 'negative'}>
                                  {log.newValues.vacationDaysLeft - log.oldValues.vacationDaysLeft > 0 ? '+' : ''}
                                  {log.newValues.vacationDaysLeft - log.oldValues.vacationDaysLeft} days
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="audit-log-footer">
                        <div className="performer-info">
                          <span className="performer-label">Performed by:</span>
                          <span className="performer-name">
                            {log.performedBy ? `${log.performedBy.name} (${log.performedBy.email})` : 'System'}
                          </span>
                        </div>
                        
                        <div className="target-info">
                          <span className="target-label">Target:</span>
                          <span className="target-name">
                            {log.targetUser ? `${log.targetUser.name} (${log.targetUser.email})` : 'N/A'}
                          </span>
                        </div>
                        
                        {log.ipAddress && (
                          <div className="ip-info">
                            <span className="ip-label">IP:</span>
                            <span className="ip-address">{log.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {auditLogs.length === 0 && !auditLoading && (
                  <div className="no-logs-message">
                    <div className="no-logs-icon">📋</div>
                    <h3>No audit logs found</h3>
                    <p>Try adjusting your filters or check back later.</p>
                  </div>
                )}
              </div>

              {auditPagination.pages > 1 && (
                <div className="pagination-container">
                  <button 
                    className="btn-elegant pagination-btn"
                    onClick={() => setAuditPage(1)}
                    disabled={auditPage === 1}
                  >
                    First
                  </button>
                  <button 
                    className="btn-elegant pagination-btn"
                    onClick={() => setAuditPage(auditPage - 1)}
                    disabled={auditPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {auditPage} of {auditPagination.pages}
                  </span>
                  <button 
                    className="btn-elegant pagination-btn"
                    onClick={() => setAuditPage(auditPage + 1)}
                    disabled={auditPage === auditPagination.pages}
                  >
                    Next
                  </button>
                  <button 
                    className="btn-elegant pagination-btn"
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

      {/* Form View/Edit Modal */}
      {showFormModal && selectedForm && (
        <div className="modal-elegant" onClick={() => setShowFormModal(false)}>
          <div className="modal-content-elegant" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-gradient">
                {Object.keys(formEditData).length > 0 ? 'Edit Form' : 'View Form'}: {
                  selectedForm.type === 'vacation' ? 'Annual Vacation' :
                  selectedForm.type?.replace('_', ' ')
                }
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setShowFormModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.3s ease',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            {Object.keys(formEditData).length > 0 ? (
              // Edit Form
              <form className="form-elegant" onSubmit={(e) => { e.preventDefault(); handleFormUpdate(); }}>
                <div className="form-group-elegant">
                  <label className="form-label-elegant">Form Type</label>
                  <input
                    type="text"
                    value={formEditData.type?.replace('_', ' ') || ''}
                    className="form-input-elegant"
                    disabled
                  />
                </div>
                
                <div className="form-group-elegant">
                  <label className="form-label-elegant">Start Date</label>
                  <input
                    type="date"
                    value={formEditData.startDate}
                    onChange={(e) => setFormEditData({...formEditData, startDate: e.target.value})}
                    className="form-input-elegant"
                  />
                </div>
                
                <div className="form-group-elegant">
                  <label className="form-label-elegant">End Date</label>
                  <input
                    type="date"
                    value={formEditData.endDate}
                    onChange={(e) => setFormEditData({...formEditData, endDate: e.target.value})}
                    className="form-input-elegant"
                  />
                </div>
                
                <div className="form-group-elegant">
                  <label className="form-label-elegant">Days</label>
                  <input
                    type="number"
                    value={formEditData.days}
                    onChange={(e) => setFormEditData({...formEditData, days: parseInt(e.target.value) || ''})}
                    className="form-input-elegant"
                    min="1"
                  />
                </div>
                
                <div className="form-group-elegant">
                  <label className="form-label-elegant">Reason</label>
                  <textarea
                    value={formEditData.reason}
                    onChange={(e) => setFormEditData({...formEditData, reason: e.target.value})}
                    className="form-input-elegant"
                    rows="4"
                  />
                </div>
                
                <div className="form-group-elegant">
                  <label className="form-label-elegant">Status</label>
                  <select
                    value={formEditData.status}
                    onChange={(e) => setFormEditData({...formEditData, status: e.target.value})}
                    className="form-input-elegant"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="manager_rejected">Manager Rejected</option>
                  </select>
                </div>
                
                <div className="action-buttons">
                  <button type="submit" className="btn-elegant btn-success">
                    Update Form
                  </button>
                  <button 
                    type="button" 
                    className="btn-elegant"
                    onClick={() => setShowFormModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              // View Form
              <div className="form-view-content">
                <div className="form-info-section">
                  <h4 style={{ color: '#64b5f6', marginBottom: '1rem' }}>Form Information</h4>
                  <div className="form-info-grid">
                    <div className="info-item">
                      <span className="info-label">Employee:</span>
                      <span className="info-value">{selectedForm.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedForm.user?.email || 'Unknown'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Department:</span>
                      <span className="info-value">{selectedForm.user?.department || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Form Type:</span>
                      <span className="info-value">
                        {selectedForm.type === 'vacation' ? 'Annual Vacation' :
                         selectedForm.type === 'excuse' && selectedForm.excuseType === 'paid' ? '💰 Paid Excuse' :
                         selectedForm.type === 'excuse' && selectedForm.excuseType === 'unpaid' ? '📝 Unpaid Excuse' :
                         selectedForm.type?.replace('_', ' ') || 'N/A'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Status:</span>
                      <span className="info-value status-display">{selectedForm.status || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Submitted:</span>
                      <span className="info-value">{new Date(selectedForm.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedForm.type === 'excuse' ? (
                      <>
                        <div className="info-item">
                          <span className="info-label">Excuse Date:</span>
                          <span className="info-value">{selectedForm.excuseDate ? new Date(selectedForm.excuseDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Time Period:</span>
                          <span className="info-value">
                            {selectedForm.fromHour && selectedForm.toHour ? `${selectedForm.fromHour} - ${selectedForm.toHour}` : 'N/A'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Duration:</span>
                          <span className="info-value">
                            {selectedForm.fromHour && selectedForm.toHour ? 
                              `${((new Date(`2000-01-01T${selectedForm.toHour}`) - new Date(`2000-01-01T${selectedForm.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours` : 
                              'N/A'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="info-item">
                          <span className="info-label">Start Date:</span>
                          <span className="info-value">{selectedForm.startDate ? new Date(selectedForm.startDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">End Date:</span>
                          <span className="info-value">{selectedForm.endDate ? new Date(selectedForm.endDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Days Requested:</span>
                          <span className="info-value">{selectedForm.days || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {selectedForm.reason && (
                  <div className="form-reason-section">
                    <h4 style={{ color: '#64b5f6', marginBottom: '1rem' }}>Reason</h4>
                    <div className="reason-display-box">
                      {selectedForm.reason}
                    </div>
                  </div>
                )}
                
                {selectedForm.comments && selectedForm.comments.length > 0 && (
                  <div className="form-comments-section">
                    <h4 style={{ color: '#64b5f6', marginBottom: '1rem' }}>Comments</h4>
                    <div className="comments-display">
                      {selectedForm.comments.map((comment, index) => (
                        <div key={index} className="comment-display-item">
                          <strong>{comment.by || 'System'}:</strong> {comment.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="action-buttons">
                  <button 
                    className="btn-elegant btn-warning"
                    onClick={() => handleCorrectForm(selectedForm)}
                  >
                    Edit Form
                  </button>
                  <button 
                    type="button" 
                    className="btn-elegant"
                    onClick={() => setShowFormModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <AttendanceManagement />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-elegant" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content-elegant" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-gradient">Confirm Delete</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.3s ease',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1rem 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to delete this form? This action cannot be undone.
              </p>
              
              <div className="action-buttons">
                <button 
                  className="btn-elegant btn-danger"
                  onClick={() => confirmDeleteForm(showDeleteConfirm)}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Form'}
                </button>
                <button 
                  type="button" 
                  className="btn-elegant"
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Clear Audit Logs Modal */}
      {showClearModal && (
        <div className="modal-elegant" onClick={() => setShowClearModal(false)}>
          <div className="modal-content-elegant" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-gradient">⚠️ Clear Old Audit Logs</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowClearModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.3s ease',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1rem 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                This will permanently delete audit logs older than the specified number of days. This action cannot be undone.
              </p>
              
              <div className="form-group-elegant">
                <label className="form-label-elegant">Keep logs from the last:</label>
                <select 
                  value={clearDays} 
                  onChange={(e) => setClearDays(parseInt(e.target.value))}
                  className="form-input-elegant"
                  disabled={deleteAllLogs}
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days (recommended)</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
              
              <div className="form-group-elegant" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  color: '#ff5252',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  <input
                    type="checkbox"
                    checked={deleteAllLogs}
                    onChange={(e) => setDeleteAllLogs(e.target.checked)}
                    style={{ 
                      marginRight: '0.5rem',
                      transform: 'scale(1.2)',
                      accentColor: '#ff5252'
                    }}
                  />
                  🗑️ Delete ALL audit logs (⚠️ DANGER ZONE)
                </label>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '0.9rem', 
                  marginTop: '0.5rem',
                  marginLeft: '1.8rem'
                }}>
                  This will delete ALL audit logs regardless of age. Use with extreme caution!
                </p>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="btn-elegant"
                  onClick={handleClearAuditLogs}
                  disabled={clearLoading}
                  style={{ backgroundColor: '#f44336' }}
                >
                  {clearLoading ? 'Clearing...' : 'Confirm Clear'}
                </button>
                <button 
                  type="button" 
                  className="btn-elegant"
                  onClick={() => setShowClearModal(false)}
                  disabled={clearLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
