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
  const [activeTab, setActiveTab] = useState('users'); // users, forms, logs
  const [userEdit, setUserEdit] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    vacationDaysLeft: 0,
    status: ''
  });

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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'forms') {
      fetchForms();
    }
  }, [activeTab]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUserEdit({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      vacationDaysLeft: user.vacationDaysLeft,
      status: user.status
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
          modificationReason: modificationReason
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

  const handleFormCorrection = async (formId, correction) => {
    if (!modificationReason) {
      setError('Please provide a reason for the correction');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/forms/super/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          ...correction,
          modificationReason: modificationReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Form corrected successfully');
        fetchForms();
        setModificationReason('');
      } else {
        setError(data.msg || 'Failed to correct form');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'active' || status === 'approved' ? 'badge-success' : 
                       status === 'pending' ? 'badge-warning' : 'badge-danger';
    return <span className={`badge-elegant ${statusClass}`}>{status}</span>;
  };

  return (
    <div className="dashboard-container fade-in">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">Super Admin Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Stats Cards */}
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

        {/* Tab Navigation */}
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

          {/* Search Bar */}
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

          {/* Status Messages */}
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

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="grid-2">
              <div>
                <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>User List</h3>
                <div style={{ overflowX: 'auto' }}>
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

              {/* User Edit Panel */}
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

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <div>
              <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>Form Management</h3>
              <div style={{ overflowX: 'auto' }}>
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
                              onClick={() => {/* Handle form correction */}}
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

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="text-gradient" style={{ marginBottom: '1rem' }}>System Audit Logs</h3>
              <div className="glass-card">
                <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Audit logs functionality coming soon...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard; 