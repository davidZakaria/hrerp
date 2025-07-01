import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ALS from './ALS/ALS';
import LogoutButton from './LogoutButton';
import ExportPrintButtons from './ExportPrintButtons';
import MedicalDocumentViewer from './MedicalDocumentViewer';

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
  const [excuseHoursMap, setExcuseHoursMap] = useState({});
  const [activeFormType, setActiveFormType] = useState('vacation');
  const [processingForms, setProcessingForms] = useState(new Set());
  const [refreshingForms, setRefreshingForms] = useState(false);
  
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
    role: 'employee',
    managedDepartments: []
  });
  const [message, setMessage] = useState('');

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);

  // Edit User state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'employee',
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

  // Fetch excuse hours for a user
  const fetchExcuseHours = useCallback(async (userId) => {
    if (!userId || excuseHoursMap[userId] !== undefined) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/forms/excuse-hours/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseHoursMap(prev => ({ ...prev, [userId]: data.excuseHoursLeft }));
      }
    } catch (err) {
      // ignore
    }
  }, [excuseHoursMap]);

  // Fetch all forms
  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    setRefreshingForms(true);
    setFormsError('');
    const token = localStorage.getItem('token');
    try {
      console.log('🔄 Fetching admin forms...');
      const res = await axios.get('http://localhost:5000/api/forms/admin', {
        headers: { 'x-auth-token': token }
      });
      const data = res.data;
      setForms(data);
      console.log(`✅ Admin forms received: ${data.length} forms`);
      
      // Fetch vacation days and excuse hours for each unique user
      const userIds = Array.from(new Set(data.map(f => f.user?._id).filter(Boolean)));
      userIds.forEach(userId => {
        fetchVacationDays(userId);
        fetchExcuseHours(userId);
      });
    } catch (err) {
      console.error('❌ Forms fetch error:', err);
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
    } finally {
      setFormsLoading(false);
      setRefreshingForms(false);
    }
  }, [fetchVacationDays, fetchExcuseHours]);

  // Fetch current user info
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth', {
        headers: { 'x-auth-token': token }
      });
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

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
      setNewUser({ name: '', email: '', password: '', department: '', role: 'employee', managedDepartments: [] });
      setShowCreateUserModal(false);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error creating user');
    }
  };

  // Open edit user modal
  const handleEditUser = (user) => {
    // Prevent regular admins from editing super admin or admin users
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      setMessage('Super admin accounts cannot be edited');
      return;
    }
    if (user.role === 'admin' && currentUser?.role !== 'super_admin') {
      setMessage('Only super admins can edit admin accounts');
      return;
    }
    
    setEditingUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      managedDepartments: user.managedDepartments || []
    });
    setShowEditUserModal(true);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/users/${editingUser._id}`, 
        editUserData,
        { headers: { 'x-auth-token': token } }
      );
      setMessage('User updated successfully');
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error updating user');
    }
  };

  // Handle department selection for managers
  const handleDepartmentChange = (department, isCreating = false) => {
    if (isCreating) {
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
    } else {
      const currentDepts = editUserData.managedDepartments || [];
      if (currentDepts.includes(department)) {
        setEditUserData({
          ...editUserData,
          managedDepartments: currentDepts.filter(d => d !== department)
        });
      } else {
        setEditUserData({
          ...editUserData,
          managedDepartments: [...currentDepts, department]
        });
      }
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    // Check if trying to delete a super admin or admin user
    const userToDelete = users.find(u => u._id === userId);
    if (userToDelete?.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      setMessage('Super admin accounts cannot be deleted');
      return;
    }
    if (userToDelete?.role === 'admin' && currentUser?.role !== 'super_admin') {
      setMessage('Only super admins can delete admin accounts');
      return;
    }

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
    
    if (!token) {
      setFormsError('Authentication required. Please log in again.');
      return;
    }

    // Prevent duplicate submissions by checking if this form is already being processed
    if (processingForms.has(id)) {
      console.log('Form already being processed, ignoring duplicate request');
      return;
    }

    // Add to processing set
    setProcessingForms(prev => new Set([...prev, id]));

    try {
      console.log('Admin form action:', {
        formId: id,
        status: status,
        adminComment: comments[id] || 'No comment'
      });

      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch(`http://localhost:5000/api/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          status,
          adminComment: comments[id] || ''
        }),
        signal: controller.signal
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      const data = await res.json();
      
      if (res.ok) {
        console.log('Form action successful:', data);
        setFormsError(''); // Clear any previous errors
        
        // Show success message and refresh immediately
        const successMessage = `✅ Form ${status} successfully! Refreshing...`;
        setFormsError(successMessage);
        
        // Immediate refresh to get updated data from server
        // Don't do optimistic updates - let the server be the source of truth
        await fetchForms();
        
        const form = forms.find(f => f._id === id);
        if (form && form.user?._id) {
          fetchVacationDays(form.user._id);
          fetchExcuseHours(form.user._id);
        }
        
        // Clear the comment for this form
        setComments(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        // Double-check with another refresh after a delay to ensure consistency
        setTimeout(async () => {
          console.log('🔄 Second refresh to ensure consistency...');
          await fetchForms();
          setFormsError('');
        }, 2000);
        
      } else {
        console.error('Form action failed:', {
          status: res.status,
          statusText: res.statusText,
          data: data
        });
        
        let errorMessage = data.msg || `Failed to ${status} form.`;
        
        // Handle specific error cases
        if (res.status === 403) {
          errorMessage = 'Not authorized to perform this action';
        } else if (res.status === 404) {
          errorMessage = 'Form not found or has been deleted';
          // Refresh forms to remove deleted form from UI
          setTimeout(() => fetchForms(), 1000);
        } else if (res.status === 400) {
          errorMessage = data.msg || 'Invalid request parameters';
          // If it's a status conflict, refresh immediately to show current state
          if (data.msg && data.msg.includes('not in') && data.msg.includes('status')) {
            errorMessage = 'Form has already been processed by another user. Refreshing...';
            setTimeout(() => fetchForms(), 1000);
          }
        } else if (res.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        setFormsError(errorMessage);
        
        if (data.msg?.includes('insufficient vacation days')) {
          handleCommentChange(id, data.msg);
        }
        
        // Refresh forms to ensure UI is in sync with server
        setTimeout(() => fetchForms(), 2000);
      }
    } catch (err) {
      console.error('Admin form action error:', err);
      
      let errorMessage = 'Error connecting to server.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = `Network error: ${err.message}`;
      }
      
      setFormsError(errorMessage);
      
      // Refresh forms to ensure UI is in sync with server
      setTimeout(() => fetchForms(), 2000);
    } finally {
      // Remove from processing set
      setProcessingForms(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const handleDeleteForm = async (id) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      const token = localStorage.getItem('token');
      setFormsError('');
      
      const deleteUrl = `http://localhost:5000/api/forms/${id}`;
      console.log('🗑️ Deleting form with URL:', deleteUrl);
      console.log('🗑️ Form ID:', id);
      
      try {
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });
        
        console.log('🗑️ Delete response status:', res.status);
        
        if (res.ok) {
          console.log('✅ Form deleted successfully');
          setFormsError('✅ Form deleted successfully! Refreshing...');
          await fetchForms();
          setTimeout(() => setFormsError(''), 3000);
        } else {
          const data = await res.json();
          console.error('❌ Delete failed:', data);
          setFormsError(data.msg || 'Failed to delete form.');
        }
      } catch (err) {
        console.error('❌ Delete error:', err);
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

  // Simple and reliable print function
  const handlePrintSimple = () => {
    console.log('🖨️ Simple print function called');
    
    if (!reportData || reportData.length === 0) {
      alert('No report data available to print.');
      return;
    }

    const reportHTML = `<!DOCTYPE html><html><head><title>Vacation Days Report</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #3498db;padding-bottom:20px}.title{font-size:24px;font-weight:bold;margin:0}.summary{display:flex;justify-content:space-around;margin:20px 0;background:#f8f9fa;padding:15px}.summary-item{text-align:center}.summary-number{font-size:24px;font-weight:bold;color:#3498db}.employee{border:1px solid #ddd;margin:10px 0;padding:15px;page-break-inside:avoid}.employee-name{font-weight:bold;font-size:16px}.badge{padding:4px 8px;border-radius:4px;color:white;font-size:12px}.badge-good{background:#27ae60}.badge-warning{background:#f39c12}.badge-critical{background:#e74c3c}@media print{.badge{-webkit-print-color-adjust:exact;color-adjust:exact}}</style></head><body><div class="header"><h1 class="title">🏖️ Vacation Days Report</h1><p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p></div><div class="summary"><div class="summary-item"><div class="summary-number">${reportData.length}</div><div>Total Employees</div></div><div class="summary-item"><div class="summary-number">${reportData.filter(emp => emp.vacationDaysLeft === 0).length}</div><div>No Days Left</div></div><div class="summary-item"><div class="summary-number">${Math.round(reportData.reduce((acc, emp) => acc + emp.vacationDaysLeft, 0) / reportData.length) || 0}</div><div>Average Days</div></div></div>${reportData.map(emp => `<div class="employee"><div class="employee-name">${emp.name}</div><div><strong>Email:</strong> ${emp.email}</div><div><strong>Department:</strong> ${emp.department}</div><div><strong>Vacation Days:</strong> <span class="badge ${emp.vacationDaysLeft === 0 ? 'badge-critical' : emp.vacationDaysLeft <= 5 ? 'badge-warning' : 'badge-good'}">${emp.vacationDaysLeft} days</span></div></div>`).join('')}<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},1000)},500)}</script></body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      console.log('✅ Print window opened');
    } else {
      alert('Please allow pop-ups to enable printing.');
    }
  };

  const handlePrint = () => {
    console.log('🖨️ Print function called - Simple version');
    
    if (!reportData || reportData.length === 0) {
      alert('No report data available to print.');
      return;
    }

    // Create simple HTML content for the report
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Vacation Days Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 20px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }
        .subtitle {
            font-size: 16px;
            color: #7f8c8d;
            margin: 10px 0;
        }
        .date {
            font-size: 14px;
            color: #95a5a6;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-number {
            font-size: 32px;
            font-weight: bold;
            color: #3498db;
        }
        .summary-label {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .employees-section {
            margin-top: 30px;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20px;
            border-bottom: 1px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .employee {
            border: 1px solid #ddd;
            margin: 15px 0;
            padding: 20px;
            border-radius: 8px;
            background: white;
            page-break-inside: avoid;
        }
        .employee-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .employee-info {
            flex: 1;
        }
        .employee-name {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0;
        }
        .employee-email {
            color: #7f8c8d;
            font-size: 14px;
            margin: 5px 0;
        }
        .employee-department {
            color: #34495e;
            font-size: 14px;
        }
        .vacation-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            color: white;
        }
        .badge-good { background: #27ae60; }
        .badge-warning { background: #f39c12; }
        .badge-critical { background: #e74c3c; }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; }
            .summary { 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
            }
            .vacation-badge {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">🏖️ Vacation Days Report</h1>
        <p class="subtitle">Comprehensive overview of employee vacation balances</p>
        <p class="date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <div class="summary-number">${reportData.length}</div>
            <div class="summary-label">Total Employees</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${reportData.filter(emp => emp.vacationDaysLeft === 0).length}</div>
            <div class="summary-label">No Days Left</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">${Math.round(reportData.reduce((acc, emp) => acc + emp.vacationDaysLeft, 0) / reportData.length) || 0}</div>
            <div class="summary-label">Average Days</div>
        </div>
    </div>

    <div class="employees-section">
        <h2 class="section-title">Employee Details</h2>
        ${reportData.map(employee => `
            <div class="employee">
                <div class="employee-header">
                    <div class="employee-info">
                        <h3 class="employee-name">${employee.name}</h3>
                        <p class="employee-email">${employee.email}</p>
                        <p class="employee-department">Department: ${employee.department}</p>
                    </div>
                    <div class="vacation-badge ${
                        employee.vacationDaysLeft === 0 ? 'badge-critical' : 
                        employee.vacationDaysLeft <= 5 ? 'badge-warning' : 'badge-good'
                    }">
                        ${employee.vacationDaysLeft} days
                        ${employee.vacationDaysLeft === 0 ? '❌' : 
                          employee.vacationDaysLeft <= 5 ? '⚠️' : '✅'}
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>This report was generated automatically by the HR ERP System</p>
        <p>For questions or concerns, please contact your HR department</p>
    </div>

    <script>
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 1000);
            }, 500);
        }
    </script>
</body>
</html>`;

    // Open new window with the report
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    
    if (!printWindow) {
        alert('Please allow pop-ups for this site to enable printing.');
        return;
    }

    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    console.log('✅ Print window created successfully');
  };

  // Filter functions
  const filteredForms = forms.filter(form =>
    form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    // Hide super admin accounts from regular admins
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      return false;
    }
    return user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
           user.email?.toLowerCase().includes(usersSearch.toLowerCase());
  });

  const filteredPendingUsers = pendingUsers.filter(user => {
    // Hide super admin accounts from regular admins
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      return false;
    }
    return user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
           user.email?.toLowerCase().includes(usersSearch.toLowerCase());
  });

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
    fetchCurrentUser();
    fetchUsers();
    fetchForms();
  }, [fetchForms]);

  // Auto-refresh forms every 30 seconds to keep data synchronized
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'forms') {
        console.log('Auto-refreshing forms data...');
        fetchForms();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, fetchForms]);

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === 'forms') {
        console.log('Page became visible, refreshing forms...');
        fetchForms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, fetchForms]);

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
                <div className="stats-number">
                  {currentUser?.role === 'super_admin' 
                    ? users.length 
                    : users.filter(u => u.role !== 'super_admin').length}
                </div>
                <div className="stats-label">Active Users</div>
              </div>
              <div className="stats-card hover-lift">
                <div className="stats-number">
                  {currentUser?.role === 'super_admin' 
                    ? pendingUsers.length 
                    : pendingUsers.filter(u => u.role !== 'super_admin').length}
                </div>
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
              <h2 className="section-title">👥 User Management</h2>
              <div className="section-actions">
                <input
                  type="text"
                  placeholder="🔍 Search users by name, email, or department..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="search-input"
                />
                <button 
                  className="btn-elegant btn-success"
                  onClick={() => setShowCreateUserModal(true)}
                >
                  👤 Create New User
                </button>
              </div>
            </div>

            {usersError && <div className="error-message">{usersError}</div>}

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
              <div className="super-admin-section">
                <div className="section-title-container">
                  <h3 className="section-title">
                    ⏳ Pending Registrations ({currentUser?.role === 'super_admin' 
                      ? pendingUsers.length 
                      : pendingUsers.filter(u => u.role !== 'super_admin').length})
                  </h3>
                </div>
                <div className="super-admin-card-grid">
                  {filteredPendingUsers.map(user => (
                    <div key={user._id} className="super-admin-card user-card">
                      <div className="card-header">
                        <div className="user-avatar">
                          {user.role === 'manager' ? '👔' : '👤'}
                        </div>
                        <div className="user-info">
                          <h4 className="user-name">{user.name}</h4>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="info-row">
                          <span className="info-label">Role:</span>
                          <span className={`role-badge role-${user.role}`}>
                            {user.role === 'manager' ? 'Manager' : 'Employee'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Department:</span>
                          <span className="info-value">{user.department}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Registration Date:</span>
                          <span className="info-value">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {user.role === 'manager' && user.managedDepartments && user.managedDepartments.length > 0 && (
                          <div className="info-row">
                            <span className="info-label">Managed Departments:</span>
                            <div className="department-tags">
                              {user.managedDepartments.map((dept, index) => (
                                <span key={index} className="department-tag">
                                  {dept}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="card-actions">
                        <button 
                          className="btn-elegant btn-success btn-sm"
                          onClick={() => handleApproveUser(user._id)}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className="btn-elegant btn-danger btn-sm"
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

            {/* Active Users Section */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title">
                  👥 Active Users ({currentUser?.role === 'super_admin' 
                    ? users.length 
                    : users.filter(u => u.role !== 'super_admin').length})
                </h3>
              </div>
              <div className="super-admin-card-grid">
                {filteredUsers.map(user => (
                  <div key={user._id} className="super-admin-card user-card">
                    <div className="card-header">
                      <div className="user-avatar">
                        {user.role === 'admin' ? '👑' : user.role === 'manager' ? '👔' : '👤'}
                      </div>
                      <div className="user-info">
                        <h4 className="user-name">{user.name}</h4>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="info-row">
                        <span className="info-label">Role:</span>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Employee'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Department:</span>
                        <span className="info-value">{user.department}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Last Login:</span>
                        <span className="info-value">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      {user.role === 'manager' && user.managedDepartments && user.managedDepartments.length > 0 && (
                        <div className="info-row">
                          <span className="info-label">Managed Departments:</span>
                          <div className="department-tags">
                            {user.managedDepartments.map((dept, index) => (
                              <span key={index} className="department-tag">
                                {dept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn-elegant btn-primary btn-sm"
                        onClick={() => handleEditUser(user)}
                      >
                        ✏️ Edit User
                      </button>
                      <button 
                        className="btn-elegant btn-danger btn-sm"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forms Management Tab */}
        {activeTab === 'forms' && (
          <div className="forms-section">
            <div className="section-header">
              <h2 className="section-title">📋 Forms Management Dashboard {refreshingForms ? '(Refreshing...)' : ''}</h2>
              <div className="section-actions">
                <input
                  type="text"
                  placeholder="🔍 Search by employee name, email, or department..."
                  value={formsSearch}
                  onChange={(e) => setFormsSearch(e.target.value)}
                  className="search-input"
                />
                <button 
                  className="btn-elegant"
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    fetchForms();
                  }}
                  disabled={formsLoading || refreshingForms}
                  title="Refresh forms data"
                  style={{ 
                    marginLeft: '10px',
                    background: (formsLoading || refreshingForms) ? '#ccc' : undefined,
                    cursor: (formsLoading || refreshingForms) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {(formsLoading || refreshingForms) ? '⏳ Refreshing...' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {/* Vacation Management Cards */}
            <div className="vacation-management-section">
              <div className="vacation-management-cards">
                <div 
                  className="vacation-action-card manage-card"
                  onClick={() => {
                    setShowVacationManager(true);
                    fetchAllEmployees();
                  }}
                >
                  <div className="vacation-card-header">
                    <div className="vacation-card-icon manage-icon">
                      🏖️
                    </div>
                    <div className="vacation-card-content">
                      <h3 className="vacation-card-title">Manage Vacation Days</h3>
                      <p className="vacation-card-description">Update and modify employee vacation balances</p>
                    </div>
                  </div>
                  <div className="vacation-card-footer">
                    <span className="vacation-card-action">Click to Manage →</span>
                  </div>
                </div>

                <div 
                  className="vacation-action-card report-card"
                  onClick={handleShowReport}
                >
                  <div className="vacation-card-header">
                    <div className="vacation-card-icon report-icon">
                      📊
                    </div>
                    <div className="vacation-card-content">
                      <h3 className="vacation-card-title">Vacation Report</h3>
                      <p className="vacation-card-description">View comprehensive vacation days analytics</p>
                    </div>
                  </div>
                  <div className="vacation-card-footer">
                    <span className="vacation-card-action">Generate Report →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Type Navigation */}
            <div className="elegant-card" style={{ marginBottom: '2rem' }}>
              <div className="form-type-navigation">
                <button 
                  className={`form-type-tab ${activeFormType === 'vacation' ? 'active' : ''}`}
                  onClick={() => setActiveFormType('vacation')}
                >
                  🏖️ Vacation Requests ({forms.filter(f => f.type === 'vacation').length})
                </button>
                <button 
                  className={`form-type-tab ${activeFormType === 'excuse' ? 'active' : ''}`}
                  onClick={() => setActiveFormType('excuse')}
                >
                  🕐 Excuse Requests ({forms.filter(f => f.type === 'excuse').length})
                </button>
                <button 
                  className={`form-type-tab ${activeFormType === 'wfh' ? 'active' : ''}`}
                  onClick={() => setActiveFormType('wfh')}
                >
                  🏠 Work From Home ({forms.filter(f => f.type === 'wfh').length})
                </button>
                <button 
                  className={`form-type-tab ${activeFormType === 'sick_leave' ? 'active' : ''}`}
                  onClick={() => setActiveFormType('sick_leave')}
                >
                  🏥 Sick Leave ({forms.filter(f => f.type === 'sick_leave').length})
                </button>
              </div>
            </div>

            {/* Forms Summary Cards for Selected Type */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}>
                <div className="stats-number">{forms.filter(f => f.type === activeFormType && f.status === 'pending').length}</div>
                <div className="stats-label">Pending Manager</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)' }}>
                <div className="stats-number">{forms.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length}</div>
                <div className="stats-label">Awaiting HR</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)' }}>
                <div className="stats-number">{forms.filter(f => f.type === activeFormType && f.status === 'approved').length}</div>
                <div className="stats-label">Approved</div>
              </div>
              <div className="stats-card hover-lift" style={{ background: 'linear-gradient(135deg, #f44336, #d32f2f)' }}>
                <div className="stats-number">{forms.filter(f => f.type === activeFormType && (f.status === 'rejected' || f.status === 'manager_rejected')).length}</div>
                <div className="stats-label">Rejected</div>
              </div>
            </div>

            {formsError && (
              <div className={formsError.includes('✅') ? 'success-message' : 'error-message'}>
                {formsError}
              </div>
            )}
            {formsLoading && <div className="spinner-elegant"></div>}

            {/* Pending Manager Approval Section */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title" style={{ color: '#ff9800' }}>
                  ⏳ Pending Manager Approval - {activeFormType.toUpperCase()} ({forms.filter(f => f.type === activeFormType && f.status === 'pending').length})
                </h3>
                <ExportPrintButtons 
                  forms={forms}
                  activeFormType={activeFormType}
                  sectionType="pending"
                  sectionTitle="Pending Manager Approval"
                />
              </div>
              <div className="super-admin-card-grid">
                {forms.filter(form => 
                  form.type === activeFormType &&
                  form.status === 'pending' && 
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {form.type === 'vacation' ? '🏖️' : 
                         form.type === 'sick_leave' ? '🏥' : 
                         form.type === 'excuse' ? '🕐' : '🏠'}
                      </div>
                      <div className="form-info">
                        <h4 className="employee-name">{form.user?.name || 'Unknown'}</h4>
                        <p className="employee-details">{form.user?.email} • {form.user?.department}</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">
                          {form.type === 'vacation' && form.vacationType === 'annual' ? 'Annual Vacation' :
                           form.type === 'vacation' && form.vacationType === 'unpaid' ? 'Unpaid Vacation' :
                           form.type}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${form.startDate?.slice(0,10)} to ${form.endDate?.slice(0,10)}`
                          ) : (
                            `${form.fromHour || 'N/A'} to ${form.toHour || 'N/A'}`
                          )}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Submitted:</span>
                        <span className="info-value">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Status:</span>
                        <span className="status-badge status-pending">
                          Pending Manager
                        </span>
                      </div>
                      {form.reason && (
                        <div className="reason-section">
                          <span className="info-label">Reason:</span>
                          <div className="reason-content">{form.reason}</div>
                        </div>
                      )}
                      {form.type === 'sick_leave' && (
                        <div className="medical-document-section">
                          <MedicalDocumentViewer form={form} userRole="admin" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {forms.filter(f => f.type === activeFormType && f.status === 'pending').length === 0 && (
                  <div className="no-items-message">
                    <div className="no-items-icon">📋</div>
                    <h3>No Pending Forms</h3>
                    <p>No {activeFormType} forms are pending manager approval at this time.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Awaiting HR Approval Section */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title" style={{ color: '#2196f3' }}>
                  👨‍💼 Awaiting HR Approval - {activeFormType.toUpperCase()} ({forms.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length})
                </h3>
                <ExportPrintButtons 
                  forms={forms}
                  activeFormType={activeFormType}
                  sectionType="awaiting"
                  sectionTitle="Awaiting HR Approval"
                />
              </div>
              <div className="super-admin-card-grid">
                {forms.filter(form => 
                  form.type === activeFormType &&
                  (form.status === 'manager_approved' || form.status === 'manager_submitted') && 
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {form.type === 'vacation' ? '🏖️' : 
                         form.type === 'sick_leave' ? '🏥' : 
                         form.type === 'excuse' ? '🕐' : '🏠'}
                      </div>
                      <div className="form-info">
                        <h4 className="employee-name">{form.user?.name || 'Unknown'}</h4>
                        <p className="employee-details">{form.user?.email} • {form.user?.department}</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">
                          {form.type === 'vacation' && form.vacationType === 'annual' ? 'Annual Vacation' :
                           form.type === 'vacation' && form.vacationType === 'unpaid' ? 'Unpaid Vacation' :
                           form.type}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${form.startDate?.slice(0,10)} to ${form.endDate?.slice(0,10)}`
                          ) : (
                            `${form.fromHour || 'N/A'} to ${form.toHour || 'N/A'}`
                          )}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Days Left:</span>
                        <span className="info-value">
                          {form.user?._id ? (
                            vacationDaysMap[form.user._id] !== undefined ? (
                              <>
                                {vacationDaysMap[form.user._id]}
                                {vacationDaysMap[form.user._id] === 0 && (
                                  <span className="no-days-warning"> (No days left!)</span>
                                )}
                              </>
                            ) : '...'
                          ) : '-'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Manager Approval:</span>
                        <div className="manager-approval-info">
                          <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
                            ✅ Approved by {form.managerApprovedBy?.name ? `👔 ${form.managerApprovedBy.name}` : 'Manager'}
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
                      </div>
                      {form.reason && (
                        <div className="reason-section">
                          <span className="info-label">Reason:</span>
                          <div className="reason-content">{form.reason}</div>
                        </div>
                      )}
                      {form.type === 'sick_leave' && (
                        <div className="medical-document-section">
                          <MedicalDocumentViewer form={form} userRole="admin" />
                        </div>
                      )}
                    </div>
                    <div className="card-actions hr-actions">
                      <div className="action-buttons-section">
                        <button
                          onClick={() => handleFormAction(form._id, 'approved')}
                          className="btn-elegant btn-success btn-sm"
                          disabled={processingForms.has(form._id) || form._isProcessing}
                        >
                          {processingForms.has(form._id) || form._isProcessing ? '⏳ Processing...' : '✅ FINAL APPROVAL'}
                        </button>
                        <button
                          onClick={() => handleFormAction(form._id, 'rejected')}
                          className="btn-elegant btn-danger btn-sm"
                          disabled={processingForms.has(form._id) || form._isProcessing}
                        >
                          {processingForms.has(form._id) || form._isProcessing ? '⏳ Processing...' : '❌ REJECT'}
                        </button>
                      </div>
                      <div className="comment-section">
                        <textarea
                          placeholder="HR comment..."
                          value={comments[form._id] || ''}
                          onChange={(e) => handleCommentChange(form._id, e.target.value)}
                          className="comment-textarea"
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {forms.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length === 0 && (
                  <div className="no-items-message">
                    <div className="no-items-icon">👨‍💼</div>
                    <h3>No Forms Awaiting HR</h3>
                    <p>No {activeFormType} forms are awaiting HR approval at this time.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Forms Section */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title" style={{ color: '#666' }}>
                  📋 {activeFormType.toUpperCase()} Forms History ({forms.filter(f => f.type === activeFormType && ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length})
                </h3>
                <ExportPrintButtons 
                  forms={forms}
                  activeFormType={activeFormType}
                  sectionType="history"
                  sectionTitle="Forms History"
                />
              </div>
              <div className="super-admin-card-grid">
                {forms.filter(form => 
                  form.type === activeFormType &&
                  ['approved', 'rejected', 'manager_rejected'].includes(form.status) &&
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card history-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {form.type === 'vacation' ? '🏖️' : 
                         form.type === 'sick_leave' ? '🏥' : 
                         form.type === 'excuse' ? '🕐' : '🏠'}
                      </div>
                      <div className="form-info">
                        <h4 className="employee-name">{form.user?.name || 'Unknown'}</h4>
                        <p className="employee-details">{form.user?.email} • {form.user?.department}</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">
                          {form.type === 'vacation' && form.vacationType === 'annual' ? 'Annual Vacation' :
                           form.type === 'vacation' && form.vacationType === 'unpaid' ? 'Unpaid Vacation' :
                           form.type}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${form.startDate?.slice(0,10)} to ${form.endDate?.slice(0,10)}`
                          ) : (
                            `${form.fromHour || 'N/A'} to ${form.toHour || 'N/A'}`
                          )}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Final Status:</span>
                        <div className={`status-badge-history status-${form.status}`}>
                          <span className="status-icon">
                            {form.status === 'approved' ? '✅' : '❌'}
                          </span>
                          <span className="status-text">
                            {form.status === 'manager_rejected' ? 'Rejected by Manager' : form.status}
                          </span>
                        </div>
                      </div>
                      {form.reason && (
                        <div className="reason-section">
                          <span className="info-label">Reason:</span>
                          <div className="reason-content">{form.reason}</div>
                        </div>
                      )}
                      {form.managerApprovedBy && (
                        <div className="info-row">
                          <span className="info-label">
                            {form.status === 'manager_rejected' ? 'Rejected by Manager:' : 'Manager Action:'}
                          </span>
                          <span className="info-value manager-name">
                            👔 {form.managerApprovedBy.name}
                            {form.managerApprovedAt && (
                              <span className="approval-date"> ({new Date(form.managerApprovedAt).toLocaleDateString()})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {(form.managerComment || form.adminComment) && (
                        <div className="comments-section">
                          <span className="info-label">Comments:</span>
                          {form.managerComment && (
                            <div className="comment-block manager-comment">
                              <strong>Manager ({form.managerApprovedBy?.name || 'Unknown'}):</strong> {form.managerComment}
                            </div>
                          )}
                          {form.adminComment && (
                            <div className="comment-block admin-comment">
                              <strong>HR ({form.adminApprovedBy?.name || 'Unknown'}):</strong> {form.adminComment}
                            </div>
                          )}
                        </div>
                      )}
                      {form.type === 'sick_leave' && (
                        <div className="medical-document-section">
                          <MedicalDocumentViewer form={form} userRole="admin" />
                        </div>
                      )}
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => handleDeleteForm(form._id)}
                        className="btn-elegant btn-danger btn-sm"
                        title="Delete this form record"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
                {forms.filter(f => f.type === activeFormType && ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length === 0 && (
                  <div className="no-items-message">
                    <div className="no-items-icon">📋</div>
                    <h3>No Historical Forms</h3>
                    <p>No completed {activeFormType} forms found in the history.</p>
                  </div>
                )}
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
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value, managedDepartments: e.target.value === 'manager' ? newUser.managedDepartments : []})}
                  className="form-input-elegant"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  {currentUser?.role === 'super_admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>
              {newUser.role === 'manager' && (
                <div className="form-group-elegant">
                  <label className="form-label-elegant">
                    Managed Departments ({newUser.managedDepartments?.length || 0} selected)
                  </label>
                  <div className="selection-help">
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
                        onClick={() => handleDepartmentChange(dept, true)}
                      >
                        <input
                          type="checkbox"
                          checked={newUser.managedDepartments?.includes(dept) || false}
                          onChange={() => {}}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span className="department-name">{dept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="modal-elegant">
          <div className="modal-content-elegant">
            <h2 className="text-gradient">Edit User</h2>
            <form className="form-elegant" onSubmit={handleUpdateUser}>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Name</label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                  className="form-input-elegant"
                  required
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                  className="form-input-elegant"
                  required
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Department</label>
                <select
                  value={editUserData.department}
                  onChange={(e) => setEditUserData({...editUserData, department: e.target.value})}
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
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value, managedDepartments: e.target.value === 'manager' ? editUserData.managedDepartments : []})}
                  className="form-input-elegant"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  {currentUser?.role === 'super_admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>
              {editUserData.role === 'manager' && (
                <div className="form-group-elegant">
                  <label className="form-label-elegant">
                    Managed Departments ({editUserData.managedDepartments?.length || 0} selected)
                  </label>
                  <div className="selection-help">
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
                        className={`department-card ${editUserData.managedDepartments?.includes(dept) ? 'selected' : ''}`}
                        onClick={() => handleDepartmentChange(dept, false)}
                      >
                        <input
                          type="checkbox"
                          checked={editUserData.managedDepartments?.includes(dept) || false}
                          onChange={() => {}}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span className="department-name">{dept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="action-buttons">
                <button type="submit" className="btn-elegant btn-success">
                  Update User
                </button>
                <button 
                  type="button" 
                  className="btn-elegant"
                  onClick={() => setShowEditUserModal(false)}
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
          <div className="vacation-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vacation-modal-header">
              <div className="modal-title-section">
                <div className="modal-icon">🏖️</div>
                <div>
                  <h2 className="vacation-modal-title">Manage Vacation Days</h2>
                  <p className="vacation-modal-subtitle">Update employee vacation balances</p>
                </div>
              </div>
              <button 
                className="vacation-close-btn" 
                onClick={() => setShowVacationManager(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="vacation-modal-search">
              <input
                type="text"
                placeholder="🔍 Search by employee name..."
                value={vacationManagerSearch}
                onChange={e => setVacationManagerSearch(e.target.value)}
                className="vacation-search-input"
              />
            </div>

            {vacationManagerLoading && (
              <div className="vacation-loading">
                <div className="spinner-elegant"></div>
                <p>Loading employees...</p>
              </div>
            )}

            {vacationManagerError && (
              <div className="vacation-message error">
                <span className="message-icon">⚠️</span>
                {vacationManagerError}
              </div>
            )}

            {vacationManagerSuccess && (
              <div className="vacation-message success">
                <span className="message-icon">✅</span>
                {vacationManagerSuccess}
              </div>
            )}
            
            <div className="vacation-employees-grid">
              {allEmployees.filter(emp => emp.name.toLowerCase().includes(vacationManagerSearch.toLowerCase())).map(emp => (
                <div key={emp._id} className="vacation-employee-card">
                  <div className="vacation-card-header">
                    <div className="employee-avatar">
                      👤
                    </div>
                    <div className="employee-basic-info">
                      <h4 className="employee-card-name">{emp.name}</h4>
                      <p className="employee-card-email">{emp.email}</p>
                    </div>
                  </div>
                  
                  <div className="vacation-card-content">
                    <div className="vacation-info-row">
                      <span className="vacation-info-label">Department:</span>
                      <span className="vacation-info-value">{emp.department}</span>
                    </div>
                    
                    <div className="vacation-days-section">
                      <label className="vacation-days-label">Vacation Days Balance:</label>
                      <div className="vacation-input-group">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={vacationEdits[emp._id] !== undefined ? vacationEdits[emp._id] : emp.vacationDaysLeft}
                          onChange={e => handleVacationEdit(emp._id, e.target.value)}
                          className="vacation-days-input"
                        />
                        <span className="vacation-input-suffix">days</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="vacation-card-actions">
                    <button 
                      className="btn-vacation-save" 
                      onClick={() => handleVacationSave(emp._id)}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                </div>
              ))}
              
              {allEmployees.filter(emp => emp.name.toLowerCase().includes(vacationManagerSearch.toLowerCase())).length === 0 && (
                <div className="vacation-no-results">
                  <div className="no-results-icon">👥</div>
                  <h3>No employees found</h3>
                  <p>Try adjusting your search criteria</p>
                </div>
              )}
            </div>
            
            <div className="vacation-modal-footer">
              <button 
                className="btn-vacation-close"
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
          <div className="report-modal-content">
            <div className="report-modal-header">
              <div className="modal-title-section">
                <div className="modal-icon">📊</div>
                <div>
                  <h2 className="report-modal-title">Vacation Days Report</h2>
                  <p className="report-modal-subtitle">Comprehensive overview of employee vacation balances</p>
                </div>
              </div>
              <div className="report-actions">
                <button 
                  className="btn-print-report"
                  onClick={handlePrintSimple}
                >
                  🖨️ Print Report
                </button>
                <button 
                  className="report-close-btn" 
                  onClick={() => setShowReport(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {reportLoading && (
              <div className="report-loading">
                <div className="spinner-elegant"></div>
                <p>Generating report...</p>
              </div>
            )}

            {reportError && (
              <div className="report-message error">
                <span className="message-icon">⚠️</span>
                {reportError}
              </div>
            )}
            
            {!reportLoading && !reportError && (
              <>
                <div className="report-summary">
                  <div className="summary-card">
                    <div className="summary-icon">👥</div>
                    <div className="summary-content">
                      <div className="summary-number">{reportData.length}</div>
                      <div className="summary-label">Total Employees</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">⚠️</div>
                    <div className="summary-content">
                      <div className="summary-number">{reportData.filter(emp => emp.vacationDaysLeft === 0).length}</div>
                      <div className="summary-label">No Days Left</div>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-icon">🏖️</div>
                    <div className="summary-content">
                      <div className="summary-number">{Math.round(reportData.reduce((acc, emp) => acc + emp.vacationDaysLeft, 0) / reportData.length) || 0}</div>
                      <div className="summary-label">Average Days</div>
                    </div>
                  </div>
                </div>

                <div className="report-employees-grid">
                  {reportData.map(employee => (
                    <div key={employee._id} className="report-employee-card">
                      <div className="report-card-header">
                        <div className="employee-avatar">
                          👤
                        </div>
                        <div className="employee-basic-info">
                          <h4 className="employee-card-name">{employee.name}</h4>
                          <p className="employee-card-email">{employee.email}</p>
                        </div>
                        <div className={`vacation-badge ${employee.vacationDaysLeft === 0 ? 'critical' : employee.vacationDaysLeft <= 5 ? 'warning' : 'good'}`}>
                          {employee.vacationDaysLeft} days
                        </div>
                      </div>
                      
                      <div className="report-card-content">
                        <div className="report-info-row">
                          <span className="report-info-label">Department:</span>
                          <span className="report-info-value">{employee.department}</span>
                        </div>
                        
                        <div className="vacation-progress-section">
                          <div className="vacation-progress-label">
                            <span>Vacation Days Balance</span>
                            <span className="vacation-status">
                              {employee.vacationDaysLeft === 0 ? '❌ Depleted' : 
                               employee.vacationDaysLeft <= 5 ? '⚠️ Low' : '✅ Available'}
                            </span>
                          </div>
                          <div className="vacation-progress-bar">
                            <div 
                              className="vacation-progress-fill"
                              style={{ 
                                width: `${Math.min((employee.vacationDaysLeft / 30) * 100, 100)}%`,
                                backgroundColor: employee.vacationDaysLeft === 0 ? '#f44336' : 
                                               employee.vacationDaysLeft <= 5 ? '#ff9800' : '#4caf50'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="report-modal-footer">
              <button 
                className="btn-report-close"
                onClick={() => setShowReport(false)}
              >
                Close Report
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