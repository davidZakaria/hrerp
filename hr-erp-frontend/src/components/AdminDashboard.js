import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import ATSDashboard from './ATS/ATSDashboard';
import DashboardAppHeader from './layout/DashboardAppHeader';
import ExportPrintButtons from './ExportPrintButtons';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import AttendanceManagement from './AttendanceManagement';
import OtReconciliationReports from './OtReconciliationReports';
import DeductionReports from './DeductionReports';
import DetailedLeavesReport from './DetailedLeavesReport';
import FormSubmission from './FormSubmission';
import API_URL from '../config/api';
import logger from '../utils/logger';
import { NAV, ROLE, FORM, ACTION, MISC, formTypeIcon } from '../utils/dashboardEmojis';
import DashboardSectionNav from './layout/DashboardSectionNav';
import { smoothScrollToElement } from '../utils/smoothScroll';
import { formatVacationDeductionDays, formatVacationDateRange } from '../utils/vacationDays';
import { getEffectiveManagedDepartmentsClient } from '../utils/effectiveManagedDepartments';
import FormManagementMonthFilterBar from './forms/FormManagementMonthFilterBar';
import UserManagementToolbar from './users/UserManagementToolbar';
import UserManagementUsersTable from './users/UserManagementUsersTable';
import UserTitleLocationImportModal from './users/UserTitleLocationImportModal';
import UserCardDetails from './users/UserCardDetails';
import UserAvatar from './UserAvatar';
import DashboardWelcomeCard from './dashboard/DashboardWelcomeCard';
import { DashboardStatCard, DashboardStatGrid } from './dashboard/DashboardStatCard';
import AdminEmployeeInsights from './admin/AdminEmployeeInsights';
import VacationReportModal from './admin/VacationReportModal';
import VacationManagerModal from './admin/VacationManagerModal';
import {
  filterFormsByManagementMonths,
  currentYearMonth,
} from '../utils/filterFormsByManagementMonths';
import {
  getCurrentPeriodClosingMonthKey,
  listPeriodMonthOptions
} from '../utils/formSubmissionMonthBounds';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const insightsPeriodOptions = useMemo(
    () => listPeriodMonthOptions(18, i18n.language),
    [i18n.language]
  );
  const mainContentRef = useRef(null);
  const skipMainScrollRef = useRef(true);
  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Forms Management state
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState('');
  const [formsSuccess, setFormsSuccess] = useState('');
  const [comments, setComments] = useState({});
  const [approvedHoursEdits, setApprovedHoursEdits] = useState({});
  const [formsSearch, setFormsSearch] = useState('');
  const [vacationDaysMap, setVacationDaysMap] = useState({});
  const [activeFormType, setActiveFormType] = useState('vacation');
  const [processingForms, setProcessingForms] = useState(new Set());
  const [refreshingForms, setRefreshingForms] = useState(false);
  const [formsSubmittedMonth, setFormsSubmittedMonth] = useState('');
  const [formsEventMonth, setFormsEventMonth] = useState('');
  const [formsMonthFilterKind, setFormsMonthFilterKind] = useState('all');
  const [departmentGroupCatalog, setDepartmentGroupCatalog] = useState({});
  
  // User Management state
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [userMgmtFilterLayout, setUserMgmtFilterLayout] = useState('simple');
  const [userMgmtViewMode, setUserMgmtViewMode] = useState('cards');
  const [userMgmtDeptFilter, setUserMgmtDeptFilter] = useState('');
  const [userMgmtRoleFilter, setUserMgmtRoleFilter] = useState('');
  const [userMgmtStatusFilter, setUserMgmtStatusFilter] = useState('');
  
  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showTitleLocationImport, setShowTitleLocationImport] = useState(false);
  const [showVacationManager, setShowVacationManager] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Employee Summary state (for Overview insights)
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insightsPeriodMonth, setInsightsPeriodMonth] = useState(() => getCurrentPeriodClosingMonthKey());
  
  // Vacation Manager state
  // Create User state
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    department: '', 
    role: 'employee',
    managedDepartments: [],
    managedDepartmentGroups: [],
    employeeCode: ''
  });
  const [message, setMessage] = useState('');

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);

  // Flags state
  const [allFlags, setAllFlags] = useState([]);
  const [, setFlagsSummary] = useState({ totalDeductions: 0, totalRewards: 0 });

  // Delete User confirmation modal state
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  // Edit User state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'employee',
    managedDepartments: [],
    managedDepartmentGroups: [],
    employeeCode: '',
    jobTitle: '',
    location: '',
    password: '',
    status: 'active'
  });

  // Admin personal form submission
  const [showAdminFormSubmission, setShowAdminFormSubmission] = useState(false);

  // Password Reset state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

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
    'Community',
    'Personal Assistant',
    'Administration',
    'Supply Chain Department',
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

  // Batch fetch all users' vacation days and excuse hours in ONE request
  const fetchAllUserBalances = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/vacation-days-report`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Build maps from the batch response
        const vacationMap = {};
        data.forEach(user => {
          vacationMap[user._id] = user.vacationDaysLeft;
        });
        setVacationDaysMap(vacationMap);
      }
    } catch (err) {
      logger.error('Error fetching user balances:', err);
    }
  }, []);

  // Fetch employee summary for overview insights
  const fetchEmployeeSummary = useCallback(async () => {
    setSummaryLoading(true);
    const token = localStorage.getItem('token');
    try {
      const qs = new URLSearchParams({ periodMonth: insightsPeriodMonth }).toString();
      const res = await fetch(`${API_URL}/api/users/employee-summary?${qs}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployeeSummary(data);
      } else {
        logger.error('Failed to fetch employee summary:', data.msg);
      }
    } catch (err) {
      logger.error('Error fetching employee summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [insightsPeriodMonth]);

  // Fetch all forms
  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    setRefreshingForms(true);
    setFormsError('');
    setFormsSuccess('');
    const token = localStorage.getItem('token');
    try {
      const params = {};
      if (formsSubmittedMonth) params.submittedMonth = formsSubmittedMonth;
      if (formsEventMonth) params.eventMonth = formsEventMonth;
      const res = await axios.get(`${API_URL}/api/forms/admin`, {
        headers: { 'x-auth-token': token },
        params: { ...params, _: Date.now() },
      });
      const data = res.data;
      setForms(data);
      fetchAllUserBalances();
    } catch (err) {
      logger.error('Forms fetch error:', err);
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
  }, [fetchAllUserBalances, formsSubmittedMonth, formsEventMonth]);

  const handleFormsMonthFilterKindChange = useCallback((kind) => {
    const sub = formsSubmittedMonth;
    const ev = formsEventMonth;
    const keep = sub || ev;
    const nowYm = currentYearMonth();
    setFormsMonthFilterKind(kind);
    if (kind === 'all') {
      setFormsSubmittedMonth('');
      setFormsEventMonth('');
    } else if (kind === 'submitted') {
      setFormsEventMonth('');
      setFormsSubmittedMonth(sub || keep || nowYm);
    } else if (kind === 'event') {
      setFormsSubmittedMonth('');
      setFormsEventMonth(ev || keep || nowYm);
    } else if (kind === 'both') {
      const d = sub || ev || nowYm;
      setFormsSubmittedMonth(d);
      setFormsEventMonth(ev || sub || d);
    }
  }, [formsSubmittedMonth, formsEventMonth]);

  const formsForMonthFilter = useMemo(
    () => filterFormsByManagementMonths(forms, formsSubmittedMonth, formsEventMonth),
    [forms, formsSubmittedMonth, formsEventMonth]
  );

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      setCurrentUser(res.data);
    } catch (err) {
      logger.error('Error fetching current user:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { 'x-auth-token': token }
      });
      const allUsers = res.data;
      setUsers(allUsers.filter(user => user.status !== 'pending'));
      setPendingUsers(allUsers.filter(user => user.status === 'pending'));
    } catch (err) {
      logger.error('Error fetching users:', err);
      setUsersError('Error fetching users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAllFlags = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/employee-flags/all`, {
        headers: { 'x-auth-token': token }
      });
      setAllFlags(res.data.flags || []);
      const flags = res.data.flags || [];
      const deductions = flags.filter(f => f.type === 'deduction').length;
      const rewards = flags.filter(f => f.type === 'reward').length;
      setFlagsSummary({ totalDeductions: deductions, totalRewards: rewards });
    } catch (err) {
      logger.error('Error fetching flags:', err);
    }
  }, []);

  // Get flags for a specific employee
  const getEmployeeFlags = (employeeId) => {
    return allFlags.filter(flag => flag.employee?._id === employeeId || flag.employee === employeeId);
  };

  // Remove a flag
  const handleRemoveFlag = async (flagId) => {
    if (!window.confirm('Are you sure you want to remove this flag?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/employee-flags/${flagId}`, {
        headers: { 'x-auth-token': token }
      });
      setMessage('✅ Flag removed successfully');
      fetchAllFlags();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error removing flag');
    }
  };

  // Approve pending user
  const handleApproveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${userId}/status`, 
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
        await axios.delete(`${API_URL}/api/users/${userId}`, {
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
      await axios.post(`${API_URL}/api/users`, 
        { ...newUser, status: 'active' }, // Admin-created users are active by default
        { headers: { 'x-auth-token': token } }
      );
      setMessage('User created successfully');
      setNewUser({ name: '', email: '', password: '', department: '', role: 'employee', managedDepartments: [], managedDepartmentGroups: [], employeeCode: '' });
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
      managedDepartments: user.managedDepartments || [],
      managedDepartmentGroups: Array.isArray(user.managedDepartmentGroups)
        ? [...user.managedDepartmentGroups]
        : [],
      employeeCode: user.employeeCode || '',
      jobTitle: user.jobTitle || '',
      location: user.location || '',
      password: '', // Empty - only fill if admin wants to change password
      status: user.status || 'active'
    });
    setShowEditUserModal(true);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${editingUser._id}`, 
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

  const handleEditUserGroupChange = (groupKey) => {
    const current = editUserData.managedDepartmentGroups || [];
    if (current.includes(groupKey)) {
      setEditUserData({
        ...editUserData,
        managedDepartmentGroups: current.filter((g) => g !== groupKey)
      });
    } else {
      setEditUserData({
        ...editUserData,
        managedDepartmentGroups: [...current, groupKey]
      });
    }
  };

  const handleNewUserGroupChange = (groupKey) => {
    const current = newUser.managedDepartmentGroups || [];
    if (current.includes(groupKey)) {
      setNewUser({
        ...newUser,
        managedDepartmentGroups: current.filter((g) => g !== groupKey)
      });
    } else {
      setNewUser({
        ...newUser,
        managedDepartmentGroups: [...current, groupKey]
      });
    }
  };

  // Open password reset modal
  const openPasswordResetModal = (user) => {
    // Prevent regular admins from resetting super admin passwords
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      setMessage('Only super admins can reset super admin passwords');
      return;
    }
    setPasswordResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordResetModal(true);
  };

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    
    setPasswordResetLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${passwordResetUser._id}`, 
        { 
          name: passwordResetUser.name,
          email: passwordResetUser.email,
          department: passwordResetUser.department,
          role: passwordResetUser.role,
          password: newPassword 
        },
        { headers: { 'x-auth-token': token } }
      );
      setMessage(`Password reset successfully for ${passwordResetUser.name}`);
      setShowPasswordResetModal(false);
      setPasswordResetUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error resetting password');
    } finally {
      setPasswordResetLoading(false);
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

  // Open delete confirmation modal
  const handleDeleteUser = (user) => {
    if (user?.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      setMessage(t('users.superAdminCannotDelete') || 'Super admin accounts cannot be deleted');
      return;
    }
    if (user?.role === 'admin' && currentUser?.role !== 'super_admin') {
      setMessage(t('users.onlySuperAdminCanDeleteAdmin') || 'Only super admins can delete admin accounts');
      return;
    }
    setUserToDelete(user);
    setDeleteConfirmInput('');
  };

  // Confirm delete (after typing user name)
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const confirmMatch = deleteConfirmInput.trim().toLowerCase() === userToDelete.name.trim().toLowerCase() ||
      deleteConfirmInput.trim().toLowerCase() === userToDelete.email.trim().toLowerCase();
    if (!confirmMatch) {
      setMessage(t('users.typeToConfirm') || 'Type the user\'s name or email to confirm');
      return;
    }
    setDeleteUserLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${userToDelete._id}`, {
        headers: { 'x-auth-token': token }
      });
      setMessage(t('users.userDeleted') || 'User deleted successfully');
      setUserToDelete(null);
      setDeleteConfirmInput('');
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error deleting user');
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // Move user to draft
  const handleMoveToDraft = async (user) => {
    if (user?.role === 'super_admin') {
      setMessage(t('users.superAdminCannotDraft') || 'Super admin cannot be moved to draft');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${user._id}/status`, { status: 'draft' }, { headers: { 'x-auth-token': token } });
      setMessage(t('users.moveToDraft') || 'User moved to draft');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error moving to draft');
    }
  };

  // Reactivate user (from draft/inactive)
  const handleReactivateUser = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${user._id}/status`, { status: 'active' }, { headers: { 'x-auth-token': token } });
      setMessage(t('users.reactivate') || 'User reactivated');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error reactivating user');
    }
  };

  // Forms Management Functions
  const handleCommentChange = (id, value) => {
    setComments({ ...comments, [id]: value });
  };

  const handleApprovedHoursChange = (id, value) => {
    setApprovedHoursEdits({ ...approvedHoursEdits, [id]: value });
  };

  const handleFormAction = async (id, status) => {
    const token = localStorage.getItem('token');
    setFormsError('');
    setFormsSuccess('');
    
    if (!token) {
      setFormsError('Authentication required. Please log in again.');
      return;
    }

    // Prevent duplicate submissions by checking if this form is already being processed
    if (processingForms.has(id)) {
      return;
    }

    // Add to processing set
    setProcessingForms(prev => new Set([...prev, id]));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const targetForm = forms.find((f) => f._id === id);
      const requestBody = {
        status,
        adminComment: comments[id] || ''
      };
      if (targetForm?.type === 'extra_hours' && status === 'approved') {
        requestBody.approvedHours = Number(
          approvedHoursEdits[id] ?? targetForm.approvedHours ?? targetForm.extraHoursWorked
        );
      }

      const res = await fetch(`${API_URL}/api/forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      const data = await res.json();
      
      if (res.ok) {
        setForms(prevForms =>
          prevForms.map(form =>
            form._id === id
              ? {
                  ...form,
                  status: status,
                  adminApprovedBy: currentUser,
                  adminApprovedAt: new Date().toISOString(),
                  adminComment: comments[id] || '',
                  ...(form.type === 'extra_hours' && status === 'approved'
                    ? { approvedHours: requestBody.approvedHours }
                    : {})
                }
              : form
          )
        );

        setFormsSuccess(t('adminDashboard.formActionSuccess'));
        setFormsError('');
        
        // Clear the comment for this form
        setComments(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setApprovedHoursEdits(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        // Clear success message after a few seconds
        setTimeout(() => {
          setFormsSuccess('');
        }, 4000);

        setTimeout(() => {
          fetchForms();
        }, 1000);
        
      } else {
        logger.error('Form action failed:', {
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
        setFormsSuccess('');
        
        if (data.msg?.includes('insufficient vacation days')) {
          handleCommentChange(id, data.msg);
        }
        
        // Refresh forms to ensure UI is in sync with server
        setTimeout(() => fetchForms(), 2000);
      }
    } catch (err) {
      logger.error('Admin form action error:', err);
      
      let errorMessage = 'Error connecting to server.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = `Network error: ${err.message}`;
      }
      
      setFormsError(errorMessage);
      setFormsSuccess('');
      setTimeout(() => fetchForms(), 2000);
    } finally {
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
      setFormsSuccess('');

      const deleteUrl = `${API_URL}/api/forms/${id}`;

      try {
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });

        if (res.ok) {
          setFormsSuccess(t('adminDashboard.formDeletedSuccess'));
          setFormsError('');
          await fetchForms();
          setTimeout(() => setFormsSuccess(''), 4000);
        } else {
          const data = await res.json();
          logger.error('Delete form failed:', data);
          setFormsError(data.msg || 'Failed to delete form.');
        }
      } catch (err) {
        logger.error('Delete form error:', err);
        setFormsError('Error connecting to server.');
      }
    }
  };

  const handleShowReport = () => {
    setShowReport(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
        return false;
      }
      const q = usersSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        [user.name, user.email, user.role, user.department, user.employeeCode].some((f) =>
          String(f ?? '').toLowerCase().includes(q)
        );
      if (!matchesSearch) return false;
      if (userMgmtFilterLayout === 'advanced') {
        if (userMgmtDeptFilter && user.department !== userMgmtDeptFilter) return false;
        if (userMgmtRoleFilter && user.role !== userMgmtRoleFilter) return false;
        if (userMgmtStatusFilter && user.status !== userMgmtStatusFilter) return false;
      }
      return true;
    });
  }, [
    users,
    usersSearch,
    currentUser,
    userMgmtFilterLayout,
    userMgmtDeptFilter,
    userMgmtRoleFilter,
    userMgmtStatusFilter,
  ]);

  const userMgmtDeptOptions = useMemo(
    () => [...new Set(users.map((u) => u.department).filter(Boolean))].sort(),
    [users]
  );
  const userMgmtRoleOptions = useMemo(
    () => [...new Set(users.map((u) => u.role).filter(Boolean))].sort(),
    [users]
  );
  const userMgmtStatusOptions = useMemo(
    () => [...new Set(users.map((u) => u.status).filter(Boolean))].sort(),
    [users]
  );

  const filteredPendingUsers = useMemo(() => {
    return pendingUsers.filter(user => {
      if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
        return false;
      }
      return user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
             user.email?.toLowerCase().includes(usersSearch.toLowerCase());
    });
  }, [pendingUsers, currentUser, usersSearch]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/users/department-group-catalog`, {
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setDepartmentGroupCatalog(data.groups || {});
        }
      } catch (e) {
        logger.error('department-group-catalog', e);
      }
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchUsers();
      fetchEmployeeSummary();
      fetchForms();
    } else if (activeTab === 'users') {
      fetchUsers();
      fetchAllFlags();
    }
  }, [activeTab, fetchUsers, fetchEmployeeSummary, fetchForms, fetchAllFlags, insightsPeriodMonth]);

  useEffect(() => {
    if (activeTab !== 'forms') return;
    fetchForms();
  }, [activeTab, formsSubmittedMonth, formsEventMonth, fetchForms]);

  // Auto-refresh forms every 30 seconds while on Forms tab
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'forms') {
        fetchForms();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, fetchForms]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === 'forms') {
        fetchForms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, fetchForms]);
  useEffect(() => {
    if (skipMainScrollRef.current) {
      skipMainScrollRef.current = false;
      return;
    }
    smoothScrollToElement(mainContentRef.current, 72);
  }, [activeTab]);

  if (usersLoading && activeTab === 'overview') {
    return (
      <div className="dashboard-container admin-dashboard modern-dash min-h-screen bg-slate-100 dark:bg-slate-900">
        <div className="spinner-elegant"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container admin-dashboard modern-dash min-h-screen bg-slate-100 dark:bg-slate-900 fade-in">
      <DashboardAppHeader title={t('adminDashboard.title')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 w-full">
      <DashboardSectionNav
        variant="light"
        role="admin"
        title={t('dashboard.nav.adminTitle')}
        description={t('dashboard.nav.adminDesc')}
        badgeLabel={t('dashboard.nav.badgeAdmin')}
        activeId={activeTab}
        sections={[
          { id: 'overview', label: t('adminDashboard.navOverview'), icon: NAV.overview, onSelect: () => setActiveTab('overview') },
          { id: 'users', label: t('adminDashboard.usersSectionTitle'), icon: NAV.users, onSelect: () => setActiveTab('users') },
          { id: 'forms', label: t('adminDashboard.formsSectionTitle'), icon: NAV.forms, onSelect: () => setActiveTab('forms') },
          { id: 'ats', label: t('adminDashboard.navAts'), icon: NAV.ats, onSelect: () => setActiveTab('ats') },
          { id: 'attendance', label: t('adminDashboard.navAttendance'), icon: NAV.attendance, onSelect: () => setActiveTab('attendance') }
        ]}
      />

      {/* Main Content */}
      <div className="main-content dashboard-section-anchor admin-dashboard-main" ref={mainContentRef}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section admin-dashboard-tab-panel flex flex-col gap-6">
            <p className="admin-dashboard-stats-hint">{t('adminDashboard.statsHint')}</p>

            {currentUser && (
              <DashboardWelcomeCard user={currentUser} />
            )}

            <DashboardStatGrid>
              <DashboardStatCard
                value={currentUser?.role === 'super_admin'
                  ? users.length
                  : users.filter(u => u.role !== 'super_admin').length}
                label={t('adminDashboard.statsActiveUsers')}
              />
              <DashboardStatCard
                value={currentUser?.role === 'super_admin'
                  ? pendingUsers.length
                  : pendingUsers.filter(u => u.role !== 'super_admin').length}
                label={t('adminDashboard.statsPendingApprovals')}
              />
              <DashboardStatCard
                value={forms.length}
                label={t('adminDashboard.statsTotalForms')}
              />
              <DashboardStatCard
                value={forms.filter(f => f.status === 'pending').length}
                label={t('adminDashboard.statsPendingForms')}
              />
            </DashboardStatGrid>

            {/* Pending User Approvals */}
            {filteredPendingUsers.length > 0 && (
              <div className="elegant-card">
                <h2 className="section-title">
                  {t('adminDashboard.pendingRegistrationsTitle')} ({filteredPendingUsers.length})
                </h2>
                <div className="pending-users-grid">
                  {filteredPendingUsers.map(user => (
                    <div key={user._id} className="pending-user-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <UserAvatar user={user} size="md" compact />
                      <div className="user-info">
                        <h3>{user.name}</h3>
                        <p>{user.email}</p>
                        <p>
                          <strong>{t('adminDashboard.roleLabel')}:</strong>{' '}
                          <span style={{ 
                            background: user.role === 'manager' ? '#9C27B0' : '#2196F3',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {user.role === 'manager' ? '👔 Manager' : '👤 Employee'}
                          </span>
                        </p>
                        <p><strong>{t('adminDashboard.departmentLabel')}:</strong> {user.department}</p>
                        <p>
                          <strong>{t('adminDashboard.employeeCodeLabel')}:</strong>{' '}
                          <span style={{ 
                            background: user.employeeCode ? '#4caf50' : '#ff9800',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {user.employeeCode || t('common.notAssigned')}
                          </span>
                        </p>
                        {user.role === 'manager' && (() => {
                          const eff = getEffectiveManagedDepartmentsClient(
                            user.managedDepartments,
                            user.managedDepartmentGroups,
                            departmentGroupCatalog
                          );
                          if (!eff.length) return null;
                          return (
                          <p style={{ marginTop: '0.5rem' }}>
                            <strong>{t('adminDashboard.wantsToManage')}:</strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {eff.map((dept, idx) => (
                                <span key={idx} style={{
                                  background: '#FF9800',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}>
                                  {dept}
                                </span>
                              ))}
                            </div>
                            {user.managedDepartmentGroups?.length > 0 && (
                              <span style={{ display: 'block', marginTop: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                                {t('adminDashboard.groupsLabel')}: {user.managedDepartmentGroups.join(', ')}
                              </span>
                            )}
                          </p>
                          );
                        })()}
                        <p><strong>{t('adminDashboard.registeredLabel')}:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      </div>
                      <div className="user-actions">
                        <button 
                          className="btn-elegant btn-success"
                          onClick={() => handleApproveUser(user._id)}
                        >
                          {t('adminDashboard.approve')}
                        </button>
                        <button 
                          className="btn-elegant btn-danger"
                          onClick={() => handleRejectUser(user._id)}
                        >
                          {t('adminDashboard.reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="dash-panel-card">
              <h2 className="dash-panel-title">{t('adminDashboard.quickActions')}</h2>
              <div className="action-buttons">
                <button 
                  className="btn-elegant btn-success"
                  onClick={() => setShowCreateUserModal(true)}
                >
                  {t('adminDashboard.createUser')}
                </button>
                <button 
                  className="btn-elegant"
                  onClick={() => setShowVacationManager(true)}
                >
                  {t('adminDashboard.manageVacation')}
                </button>
                <button 
                  className="btn-elegant"
                  onClick={handleShowReport}
                >
                  {t('adminDashboard.vacationReport')}
                </button>
              </div>
            </div>

            <AdminEmployeeInsights
              employeeSummary={employeeSummary}
              summaryLoading={summaryLoading}
              insightsPeriodMonth={insightsPeriodMonth}
              onInsightsPeriodChange={setInsightsPeriodMonth}
              insightsPeriodOptions={insightsPeriodOptions}
              onRefresh={fetchEmployeeSummary}
            />
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="users-section admin-dashboard-tab-panel">
            <div className="section-header-redesign">
              <div className="section-info">
                <h3 className="text-gradient">{t('adminDashboard.usersSectionTitle')}</h3>
                <p className="section-description">{t('adminDashboard.usersSectionDesc')}</p>
              </div>
              <div className="section-actions admin-dashboard-toolbar-actions">
                <input
                  type="text"
                  placeholder={t('adminDashboard.searchUsersPlaceholder')}
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="search-input admin-dashboard-toolbar-search"
                />
                <button
                  type="button"
                  className="btn-elegant"
                  onClick={() => setShowTitleLocationImport(true)}
                >
                  {t('userTitleImport.openButton')}
                </button>
                <button
                  type="button"
                  className="btn-elegant btn-success"
                  onClick={() => setShowCreateUserModal(true)}
                >
                  {t('adminDashboard.createUser')}
                </button>
              </div>
            </div>

            {usersError && <div className="error-message">{usersError}</div>}

            <UserManagementToolbar
              filterLayout={userMgmtFilterLayout}
              onFilterLayoutChange={setUserMgmtFilterLayout}
              viewMode={userMgmtViewMode}
              onViewModeChange={setUserMgmtViewMode}
              departmentOptions={userMgmtDeptOptions}
              roleOptions={userMgmtRoleOptions}
              statusOptions={userMgmtStatusOptions}
              deptValue={userMgmtDeptFilter}
              roleValue={userMgmtRoleFilter}
              statusValue={userMgmtStatusFilter}
              onDeptChange={setUserMgmtDeptFilter}
              onRoleChange={setUserMgmtRoleFilter}
              onStatusChange={setUserMgmtStatusFilter}
            />

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
                        <UserAvatar user={user} size="md" compact />
                        <div className="user-info">
                          <h4 className="user-name">
                            {user.name}
                            {user.employeeCode && (
                              <span style={{
                                marginLeft: '8px',
                                background: '#2196F3',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                              }}>
                                #{user.employeeCode}
                              </span>
                            )}
                          </h4>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="info-row">
                          <span className="info-label">Role:</span>
                          <span className={`role-badge role-${user.role}`}>
                            {user.role === 'manager' ? '👔 Manager' : '👤 Employee'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Department:</span>
                          <span className="info-value">{user.department}</span>
                        </div>
                        {user.role === 'manager' && (() => {
                          const eff = getEffectiveManagedDepartmentsClient(
                            user.managedDepartments,
                            user.managedDepartmentGroups,
                            departmentGroupCatalog
                          );
                          if (!eff.length) return null;
                          return (
                          <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span className="info-label" style={{ marginBottom: '0.5rem' }}>🎯 Wants to Manage (effective):</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {eff.map((dept, idx) => (
                                <span key={idx} style={{
                                  background: '#FF9800',
                                  color: 'white',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}>
                                  {dept}
                                </span>
                              ))}
                            </div>
                            {user.managedDepartmentGroups?.length > 0 && (
                              <span style={{ marginTop: '6px', fontSize: '0.75rem', opacity: 0.9 }}>
                                Groups: {user.managedDepartmentGroups.join(', ')}
                              </span>
                            )}
                          </div>
                          );
                        })()}
                        <div className="info-row">
                          <span className="info-label">Registration Date:</span>
                          <span className="info-value">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
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

            {/* Users Section (Active, Draft, Inactive) */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title">
                  👥 Users ({filteredUsers.length})
                </h3>
              </div>
              {userMgmtViewMode === 'table' ? (
                filteredUsers.length === 0 ? (
                  <div className="no-users-message" style={{ marginTop: '1rem' }}>
                    <div className="no-users-icon">👥</div>
                    <h3>{t('userManagement.noUsersTitle')}</h3>
                    <p>{t('userManagement.noUsersBody')}</p>
                  </div>
                ) : (
                <UserManagementUsersTable
                  users={filteredUsers}
                  departmentGroupCatalog={departmentGroupCatalog}
                  getEmployeeFlags={getEmployeeFlags}
                  onEdit={handleEditUser}
                  onResetPassword={openPasswordResetModal}
                  onDelete={handleDeleteUser}
                  onReactivate={handleReactivateUser}
                  onMoveToDraft={handleMoveToDraft}
                  onRemoveFlag={handleRemoveFlag}
                />
                )
              ) : (
              <div className="super-admin-card-grid">
                {filteredUsers.map(user => (
                  <div key={user._id} className="super-admin-card user-card">
                    <div className="card-header">
                      <UserAvatar user={user} size="md" compact />
                      <div className="user-info">
                        <h4 className="user-name">
                          {user.name}
                          {user.employeeCode && (
                            <span style={{
                              marginLeft: '8px',
                              background: '#2196F3',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              #{user.employeeCode}
                            </span>
                          )}
                        </h4>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="info-row">
                        <span className="info-label">Role:</span>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Employee'}
                        </span>
                        {(user.status === 'draft' || user.status === 'inactive') && (
                          <span className={`role-badge ${user.status === 'draft' ? 'status-draft' : 'status-inactive'}`} style={{ marginLeft: '8px' }}>
                            {user.status === 'draft' ? (t('users.draft') || 'Draft') : (t('users.inactive') || 'Inactive')}
                          </span>
                        )}
                      </div>
                      <div className="info-row">
                        <span className="info-label">Department:</span>
                        <span className="info-value">{user.department}</span>
                      </div>
                      <UserCardDetails user={user} />
                      <div className="info-row">
                        <span className="info-label">Last Login:</span>
                        <span className="info-value">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      {user.role === 'manager' && (() => {
                        const eff = getEffectiveManagedDepartmentsClient(
                          user.managedDepartments,
                          user.managedDepartmentGroups,
                          departmentGroupCatalog
                        );
                        if (!eff.length) return null;
                        return (
                        <div className="info-row">
                          <span className="info-label">Managed (effective):</span>
                          <div className="department-tags">
                            {eff.map((dept, index) => (
                              <span key={index} className="department-tag">
                                {dept}
                              </span>
                            ))}
                          </div>
                          {user.managedDepartmentGroups?.length > 0 && (
                            <div style={{ fontSize: '0.8rem', marginTop: '6px', width: '100%' }}>
                              Groups: {user.managedDepartmentGroups.join(', ')}
                            </div>
                          )}
                        </div>
                        );
                      })()}
                      {/* Employee Flags */}
                      {getEmployeeFlags(user._id).length > 0 && (
                        <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span className="info-label" style={{ marginBottom: '8px' }}>🚩 Active Flags:</span>
                          <div className="employee-flags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {getEmployeeFlags(user._id).map(flag => (
                              <span 
                                key={flag._id}
                                className={`flag-badge-admin ${flag.type === 'deduction' ? 'deduction' : 'reward'}`}
                                title={`${flag.reason} - By: ${flag.flaggedBy?.name || 'Manager'} on ${new Date(flag.createdAt).toLocaleDateString()}`}
                              >
                                {flag.type === 'deduction' ? '⚠️' : '⭐'} {flag.type}
                                <button 
                                  className="flag-remove-btn-admin"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveFlag(flag._id); }}
                                  title="Remove flag"
                                >×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card-actions">
                      {(user.status === 'draft' || user.status === 'inactive') ? (
                        <button 
                          className="btn-elegant btn-success btn-sm"
                          onClick={() => handleReactivateUser(user)}
                          title={t('users.reactivate') || 'Reactivate'}
                        >
                          ✅ {t('users.reactivate') || 'Reactivate'}
                        </button>
                      ) : user.role !== 'super_admin' ? (
                        <button 
                          className="btn-elegant btn-sm"
                          onClick={() => handleMoveToDraft(user)}
                          style={{ background: 'linear-gradient(135deg, #9e9e9e, #757575)' }}
                          title={t('users.moveToDraft') || 'Move to Draft'}
                        >
                          📄 {t('users.moveToDraft') || 'Draft'}
                        </button>
                      ) : null}
                      <button 
                        className="btn-elegant btn-primary btn-sm"
                        onClick={() => handleEditUser(user)}
                      >
                        ✏️ Edit User
                      </button>
                      <button 
                        className="btn-elegant btn-sm"
                        onClick={() => openPasswordResetModal(user)}
                        style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}
                      >
                        🔑 Reset Password
                      </button>
                      <button 
                        className="btn-elegant btn-danger btn-sm"
                        onClick={() => handleDeleteUser(user)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Forms Management Tab */}
        {activeTab === 'forms' && (
          <div className="forms-section admin-dashboard-tab-panel admin-forms-workspace">
            <div className="section-header-redesign">
              <div className="section-info">
                <h3 className="text-gradient">{t('adminDashboard.formsSectionTitle')}</h3>
                <p className="section-description">{t('adminDashboard.formsSectionDesc')}</p>
                {refreshingForms || formsLoading ? (
                  <p className="admin-dashboard-inline-status" role="status">
                    {t('adminDashboard.formsRefreshing')}
                  </p>
                ) : null}
              </div>
              <div className="section-actions admin-dashboard-toolbar-actions">
                <input
                  type="search"
                  placeholder={t('adminDashboard.searchFormsPlaceholder')}
                  value={formsSearch}
                  onChange={(e) => setFormsSearch(e.target.value)}
                  className="search-input admin-dashboard-toolbar-search"
                  autoComplete="off"
                />
                <button
                  className="btn-elegant admin-forms-refresh"
                  onClick={() => fetchForms()}
                  disabled={formsLoading || refreshingForms}
                  type="button"
                  title={t('adminDashboard.refresh')}
                >
                  {(formsLoading || refreshingForms) ? t('adminDashboard.formsRefreshing') : t('adminDashboard.refresh')}
                </button>
              </div>
            </div>

            <FormManagementMonthFilterBar
              filterKind={formsMonthFilterKind}
              onFilterKindChange={handleFormsMonthFilterKindChange}
              submittedMonth={formsSubmittedMonth}
              eventMonth={formsEventMonth}
              onSubmittedMonthChange={setFormsSubmittedMonth}
              onEventMonthChange={setFormsEventMonth}
            />

            {/* Vacation Management Cards */}
            <div className="vacation-management-section">
              <div className="vacation-management-cards">
                <div
                  role="button"
                  tabIndex={0}
                  className="vacation-action-card manage-card"
                  onClick={() => setShowVacationManager(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowVacationManager(true);
                    }
                  }}
                >
                  <div className="vacation-card-header">
                    <div className="vacation-card-icon manage-icon">
                      🏖️
                    </div>
                    <div className="vacation-card-content">
                      <h3 className="vacation-card-title">{t('adminDashboard.vacationCardManageTitle')}</h3>
                      <p className="vacation-card-description">{t('adminDashboard.vacationCardManageDesc')}</p>
                    </div>
                  </div>
                  <div className="vacation-card-footer">
                    <span className="vacation-card-action">{t('adminDashboard.vacationCardManageCta')} →</span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className="vacation-action-card report-card"
                  onClick={handleShowReport}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleShowReport();
                    }
                  }}
                >
                  <div className="vacation-card-header">
                    <div className="vacation-card-icon report-icon">
                      📊
                    </div>
                    <div className="vacation-card-content">
                      <h3 className="vacation-card-title">{t('adminDashboard.vacationCardReportTitle')}</h3>
                      <p className="vacation-card-description">{t('adminDashboard.vacationCardReportDesc')}</p>
                    </div>
                  </div>
                  <div className="vacation-card-footer">
                    <span className="vacation-card-action">{t('adminDashboard.vacationCardReportCta')} →</span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className="vacation-action-card manage-card vacation-action-card--personal"
                  onClick={() => setShowAdminFormSubmission(!showAdminFormSubmission)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowAdminFormSubmission(!showAdminFormSubmission);
                    }
                  }}
                >
                  <div className="vacation-card-header">
                    <div className="vacation-card-icon manage-icon vacation-card-icon--personal">
                      {FORM.mission}
                    </div>
                    <div className="vacation-card-content">
                      <h3 className="vacation-card-title">{t('adminDashboard.vacationCardPersonalTitle')}</h3>
                      <p className="vacation-card-description">{t('adminDashboard.vacationCardPersonalDesc')}</p>
                    </div>
                  </div>
                  <div className="vacation-card-footer">
                    <span className="vacation-card-action">
                      {showAdminFormSubmission
                        ? `${t('adminDashboard.vacationCardPersonalCtaOpen')} ▼`
                        : `${t('adminDashboard.vacationCardPersonalCtaClosed')} →`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {showAdminFormSubmission && (
              <div className="admin-form-submission-section" style={{ marginBottom: '2rem' }}>
                <div className="section-header">
                  <h2>📝 {t('managerDashboard.submitNewPersonalForm', 'Submit New Personal Form')}</h2>
                  <small className="section-subtitle">{t('managerDashboard.thisIsForYourOwnPersonalRequestsVacationSickLeaveEtc', 'This is for your own personal requests: vacation, mission, sick leave, etc.')}</small>
                </div>
                <div className="form-container">
                  <FormSubmission onFormSubmitted={() => { fetchForms(); setShowAdminFormSubmission(false); }} />
                </div>
              </div>
            )}

            <div className="form-mgmt-filters-bar admin-form-type-shell admin-form-type-pipeline-panel">
              <div className="admin-form-type-pipeline-panel__row">
                <div className="form-mgmt-type-row admin-form-type-pipeline-panel__type">
                  <label htmlFor="admin-form-type">{t('formManagement.typeLabel')}</label>
                  <select
                    id="admin-form-type"
                    className="form-mgmt-select"
                    value={activeFormType}
                    onChange={(e) => setActiveFormType(e.target.value)}
                  >
                    <option value="vacation">{t('forms.vacation')} ({formsForMonthFilter.filter((f) => f.type === 'vacation').length})</option>
                    <option value="wfh">{t('forms.workFromHome')} ({formsForMonthFilter.filter((f) => f.type === 'wfh').length})</option>
                    <option value="sick_leave">{t('forms.sickLeave')} ({formsForMonthFilter.filter((f) => f.type === 'sick_leave').length})</option>
                    <option value="extra_hours">{t('forms.extra_hours')} ({formsForMonthFilter.filter((f) => f.type === 'extra_hours').length})</option>
                    <option value="mission">{t('forms.mission')} ({formsForMonthFilter.filter((f) => f.type === 'mission').length})</option>
                  </select>
                </div>
                <div className="form-mgmt-pipeline-inline admin-form-type-pipeline-panel__pipeline" aria-label={t('formManagement.pipelineSummary')}>
                  <strong className="form-mgmt-pipeline-strong">{t('formManagement.pipelineSummary')}</strong>
                  <span>{t('adminDashboard.summaryPendingManager')}: {formsForMonthFilter.filter((f) => f.type === activeFormType && f.status === 'pending').length}</span>
                  <span className="pipe-sep">|</span>
                  <span>{t('adminDashboard.summaryAwaitingHr')}: {formsForMonthFilter.filter((f) => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length}</span>
                  <span className="pipe-sep">|</span>
                  <span>{t('adminDashboard.summaryApproved')}: {formsForMonthFilter.filter((f) => f.type === activeFormType && f.status === 'approved').length}</span>
                  <span className="pipe-sep">|</span>
                  <span>{t('adminDashboard.summaryRejected')}: {formsForMonthFilter.filter((f) => f.type === activeFormType && (f.status === 'rejected' || f.status === 'manager_rejected')).length}</span>
                </div>
              </div>
            </div>

            {formsSuccess && <div className="success-message">{formsSuccess}</div>}
            {formsError && <div className="error-message">{formsError}</div>}
            {formsLoading && <div className="spinner-elegant"></div>}

            {/* Pending Manager Approval Section */}
            <div className="super-admin-section">
              <div className="section-title-container">
                <h3 className="section-title" style={{ color: '#ff9800' }}>
                  ⏳ Pending Manager Approval - {activeFormType.toUpperCase()} ({formsForMonthFilter.filter(f => f.type === activeFormType && f.status === 'pending').length})
                </h3>
                <ExportPrintButtons 
                  forms={formsForMonthFilter}
                  activeFormType={activeFormType}
                  sectionType="pending"
                  sectionTitle="Pending Manager Approval"
                />
              </div>
              <div className="super-admin-card-grid">
                {formsForMonthFilter.filter(form => 
                  form.type === activeFormType &&
                  form.status === 'pending' && 
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {formTypeIcon(form.type)}
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
                          {form.type === 'vacation' ? 'Annual Vacation' :
                           form.type === 'wfh' ? '🏠 Work From Home' :
                           form.type === 'extra_hours' ? `⏱️ ${t('forms.extra_hours')}` :
                           form.type === 'mission' ? `${FORM.mission} Mission` :
                           form.type}
                        </span>
                      </div>
                      {form.type === 'extra_hours' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">Date:</span>
                            <span className="info-value">{form.extraHoursDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">{t('forms.requestedOtHours')}:</span>
                            <span className="info-value" style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked || 0} hours</span>
                          </div>
                          {form.approvedHours != null && (
                            <div className="info-row">
                              <span className="info-label">{t('forms.approvedOtHours')}:</span>
                              <span className="info-value" style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} hours</span>
                            </div>
                          )}
                          <div className="info-row">
                            <span className="info-label">Work Done:</span>
                            <span className="info-value">{form.extraHoursDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      {form.type === 'wfh' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">WFH Date:</span>
                            <span className="info-value">{form.wfhDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Working On:</span>
                            <span className="info-value">{form.wfhWorkingOn || form.wfhDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${formatVacationDateRange(form)} (${formatVacationDeductionDays(form)} days${form.isHalfDay ? ', half day' : ''})`
                          ) : form.type === 'wfh' ? (
                            form.wfhDate?.slice(0,10) || 'N/A'
                          ) : form.type === 'extra_hours' ? (
                            <span style={{ color: '#E65100' }}>{form.extraHoursWorked || 0} hours</span>
                          ) : form.type === 'mission' ? (
                            `${form.missionStartDate?.slice(0,10)} to ${form.missionEndDate?.slice(0,10)}${(form.missionFromTime || form.missionToTime) ? ` • ${form.missionFromTime || '--'} - ${form.missionToTime || '--'}` : ''} • ${form.missionDestination || 'N/A'}`
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
                {formsForMonthFilter.filter(f => f.type === activeFormType && f.status === 'pending').length === 0 && (
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
                  {ACTION.hrAwaiting} Awaiting HR Approval - {activeFormType.toUpperCase()} ({formsForMonthFilter.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length})
                </h3>
                <ExportPrintButtons 
                  forms={formsForMonthFilter}
                  activeFormType={activeFormType}
                  sectionType="awaiting"
                  sectionTitle="Awaiting HR Approval"
                />
              </div>
              <div className="super-admin-card-grid">
                {formsForMonthFilter.filter(form => 
                  form.type === activeFormType &&
                  (form.status === 'manager_approved' || form.status === 'manager_submitted') && 
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {formTypeIcon(form.type)}
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
                          {form.type === 'vacation' ? 'Annual Vacation' :
                           form.type === 'excuse' && form.excuseType === 'paid' ? '💰 Paid Excuse' :
                           form.type === 'excuse' && form.excuseType === 'unpaid' ? '📝 Unpaid Excuse' :
                           form.type === 'wfh' ? '🏠 Work From Home' :
                           form.type === 'extra_hours' ? `⏱️ ${t('forms.extra_hours')}` :
                           form.type === 'mission' ? `${FORM.mission} Mission` :
                           form.type}
                        </span>
                      </div>
                      {form.type === 'excuse' && (
                        <div className="info-row">
                          <span className="info-label">Excuse Date:</span>
                          <span className="info-value">{form.excuseDate?.slice(0,10) || 'N/A'}</span>
                        </div>
                      )}
                      {form.type === 'wfh' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">WFH Date:</span>
                            <span className="info-value">{form.wfhDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Working On:</span>
                            <span className="info-value">{form.wfhWorkingOn || form.wfhDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      {form.type === 'extra_hours' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">Date:</span>
                            <span className="info-value">{form.extraHoursDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">{t('forms.requestedOtHours')}:</span>
                            <span className="info-value" style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked || 0} hours</span>
                          </div>
                          {form.approvedHours != null && (
                            <div className="info-row">
                              <span className="info-label">{t('forms.approvedOtHours')}:</span>
                              <span className="info-value" style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} hours</span>
                            </div>
                          )}
                          <div className="info-row">
                            <span className="info-label">Work Done:</span>
                            <span className="info-value">{form.extraHoursDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${formatVacationDateRange(form)} (${formatVacationDeductionDays(form)} days${form.isHalfDay ? ', half day' : ''})`
                          ) : form.type === 'excuse' ? (
                            <>
                              {form.fromHour || 'N/A'} to {form.toHour || 'N/A'}
                              {form.fromHour && form.toHour && (
                                <span style={{ marginLeft: '0.5rem', color: '#4caf50' }}>
                                  ({((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours)
                                </span>
                              )}
                            </>
                          ) : form.type === 'wfh' ? (
                            form.wfhDate?.slice(0,10) || 'N/A'
                          ) : form.type === 'extra_hours' ? (
                            <span style={{ color: '#E65100' }}>{form.extraHoursWorked || 0} hours</span>
                          ) : form.type === 'mission' ? (
                            `${form.missionStartDate?.slice(0,10)} to ${form.missionEndDate?.slice(0,10)}${(form.missionFromTime || form.missionToTime) ? ` • ${form.missionFromTime || '--'} - ${form.missionToTime || '--'}` : ''} • ${form.missionDestination || 'N/A'}`
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
                                {Number(vacationDaysMap[form.user._id]).toFixed(1)}
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
                      {form.type === 'extra_hours' && (
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem', width: '100%' }}>
                          <label className="form-label-elegant">{t('forms.approvedOtHours')}</label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            className="form-input-elegant"
                            value={approvedHoursEdits[form._id] ?? form.approvedHours ?? form.extraHoursWorked ?? ''}
                            onChange={(e) => handleApprovedHoursChange(form._id, Number(e.target.value))}
                          />
                        </div>
                      )}
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
                {formsForMonthFilter.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted')).length === 0 && (
                  <div className="no-items-message">
                    <div className="no-items-icon">{ACTION.hrAwaiting}</div>
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
                  📋 {activeFormType.toUpperCase()} Forms History ({formsForMonthFilter.filter(f => f.type === activeFormType && ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length})
                </h3>
                <ExportPrintButtons 
                  forms={formsForMonthFilter}
                  activeFormType={activeFormType}
                  sectionType="history"
                  sectionTitle="Forms History"
                />
              </div>
              <div className="super-admin-card-grid">
                {formsForMonthFilter.filter(form => 
                  form.type === activeFormType &&
                  ['approved', 'rejected', 'manager_rejected'].includes(form.status) &&
                  (form.user?.name?.toLowerCase().includes(formsSearch.toLowerCase()) || 
                   form.user?.email?.toLowerCase().includes(formsSearch.toLowerCase()) ||
                   form.user?.department?.toLowerCase().includes(formsSearch.toLowerCase()))
                ).map(form => (
                  <div key={form._id} className="super-admin-card form-card history-card">
                    <div className="card-header">
                      <div className="form-type-icon">
                        {formTypeIcon(form.type)}
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
                          {form.type === 'vacation' ? 'Annual Vacation' :
                           form.type === 'excuse' && form.excuseType === 'paid' ? '💰 Paid Excuse' :
                           form.type === 'excuse' && form.excuseType === 'unpaid' ? '📝 Unpaid Excuse' :
                           form.type === 'wfh' ? '🏠 Work From Home' :
                           form.type === 'extra_hours' ? `⏱️ ${t('forms.extra_hours')}` :
                           form.type === 'mission' ? `${FORM.mission} Mission` :
                           form.type}
                        </span>
                      </div>
                      {form.type === 'excuse' && (
                        <div className="info-row">
                          <span className="info-label">Excuse Date:</span>
                          <span className="info-value">{form.excuseDate?.slice(0,10) || 'N/A'}</span>
                        </div>
                      )}
                      {form.type === 'wfh' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">WFH Date:</span>
                            <span className="info-value">{form.wfhDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Working On:</span>
                            <span className="info-value">{form.wfhWorkingOn || form.wfhDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      {form.type === 'extra_hours' && (
                        <>
                          <div className="info-row">
                            <span className="info-label">Date:</span>
                            <span className="info-value">{form.extraHoursDate?.slice(0,10) || 'N/A'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">{t('forms.requestedOtHours')}:</span>
                            <span className="info-value" style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked || 0} hours</span>
                          </div>
                          {form.approvedHours != null && (
                            <div className="info-row">
                              <span className="info-label">{t('forms.approvedOtHours')}:</span>
                              <span className="info-value" style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} hours</span>
                            </div>
                          )}
                          <div className="info-row">
                            <span className="info-label">Work Done:</span>
                            <span className="info-value">{form.extraHoursDescription || 'N/A'}</span>
                          </div>
                        </>
                      )}
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">
                          {form.type === 'vacation' ? (
                            `${formatVacationDateRange(form)} (${formatVacationDeductionDays(form)} days${form.isHalfDay ? ', half day' : ''})`
                          ) : form.type === 'excuse' ? (
                            <>
                              {form.fromHour || 'N/A'} to {form.toHour || 'N/A'}
                              {form.fromHour && form.toHour && (
                                <span style={{ marginLeft: '0.5rem', color: '#4caf50' }}>
                                  ({((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours)
                                </span>
                              )}
                            </>
                          ) : form.type === 'wfh' ? (
                            form.wfhDate?.slice(0,10) || 'N/A'
                          ) : form.type === 'extra_hours' ? (
                            <span style={{ color: '#E65100' }}>{form.extraHoursWorked || 0} hours</span>
                          ) : form.type === 'mission' ? (
                            `${form.missionStartDate?.slice(0,10)} to ${form.missionEndDate?.slice(0,10)}${(form.missionFromTime || form.missionToTime) ? ` • ${form.missionFromTime || '--'} - ${form.missionToTime || '--'}` : ''} • ${form.missionDestination || 'N/A'}`
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
                {formsForMonthFilter.filter(f => f.type === activeFormType && ['approved', 'rejected', 'manager_rejected'].includes(f.status)).length === 0 && (
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
          <div className="ats-section admin-dashboard-tab-panel">
            <ATSDashboard />
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="attendance-section admin-dashboard-tab-panel">
            <AttendanceManagement />
            <OtReconciliationReports />
            <DeductionReports />
            <DetailedLeavesReport />
          </div>
        )}
      </div>
      </div>

      <UserTitleLocationImportModal
        open={showTitleLocationImport}
        onClose={() => setShowTitleLocationImport(false)}
        allUsers={users}
        onApplied={() => {
          fetchUsers();
          setMessage(t('userTitleImport.applySuccess'));
        }}
      />

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
                <label className="form-label-elegant">Biometric Code (Employee ID)</label>
                <input
                  type="text"
                  value={newUser.employeeCode}
                  onChange={(e) => setNewUser({...newUser, employeeCode: e.target.value})}
                  className="form-input-elegant"
                  placeholder="Enter ZKTeco device code (AC-No)"
                />
                <small style={{color: '#888', fontSize: '0.8rem'}}>Must match the ZKTeco device ID (AC-No). Required for real-time attendance sync.</small>
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
                  onChange={(e) => setNewUser({...newUser, role: e.target.value, managedDepartments: e.target.value === 'manager' ? newUser.managedDepartments : [], managedDepartmentGroups: e.target.value === 'manager' ? newUser.managedDepartmentGroups : []})}
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
                  {Object.keys(departmentGroupCatalog).length > 0 && (
                    <>
                      <label className="form-label-elegant" style={{ marginTop: '1rem', display: 'block' }}>
                        Department groups ({newUser.managedDepartmentGroups?.length || 0} selected)
                      </label>
                      <div className="departments-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        {Object.keys(departmentGroupCatalog).map((key) => (
                          <div
                            key={key}
                            className={`department-card ${newUser.managedDepartmentGroups?.includes(key) ? 'selected' : ''}`}
                            onClick={() => handleNewUserGroupChange(key)}
                          >
                            <input
                              type="checkbox"
                              checked={newUser.managedDepartmentGroups?.includes(key) || false}
                              onChange={() => {}}
                              style={{ marginRight: '0.5rem' }}
                            />
                            <span className="department-name">{key.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.5rem' }}>
                        Effective coverage:{' '}
                        {getEffectiveManagedDepartmentsClient(
                          newUser.managedDepartments,
                          newUser.managedDepartmentGroups,
                          departmentGroupCatalog
                        ).length}{' '}
                        departments
                      </p>
                    </>
                  )}
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
          <div className="modal-content-elegant edit-user-modal">
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
                <label className="form-label-elegant">Biometric Code (Employee ID)</label>
                <input
                  type="text"
                  value={editUserData.employeeCode}
                  onChange={(e) => setEditUserData({...editUserData, employeeCode: e.target.value})}
                  className="form-input-elegant"
                  placeholder="Enter ZKTeco device code (AC-No)"
                />
                <small style={{color: '#888', fontSize: '0.8rem'}}>Must match the ZKTeco device ID (AC-No). Required for real-time attendance sync.</small>
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
                <label className="form-label-elegant">{t('userTitleImport.jobTitle')}</label>
                <input
                  type="text"
                  value={editUserData.jobTitle}
                  onChange={(e) => setEditUserData({ ...editUserData, jobTitle: e.target.value })}
                  className="form-input-elegant"
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">{t('userTitleImport.location')}</label>
                <input
                  type="text"
                  value={editUserData.location}
                  onChange={(e) => setEditUserData({ ...editUserData, location: e.target.value })}
                  className="form-input-elegant"
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value, managedDepartments: e.target.value === 'manager' ? editUserData.managedDepartments : [], managedDepartmentGroups: e.target.value === 'manager' ? editUserData.managedDepartmentGroups : []})}
                  className="form-input-elegant"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  {currentUser?.role === 'super_admin' && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Status</label>
                <select
                  value={editUserData.status}
                  onChange={(e) => setEditUserData({...editUserData, status: e.target.value})}
                  className="form-input-elegant"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (Disabled)</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
                  className="form-input-elegant"
                  placeholder="Enter new password (min 6 characters)"
                  minLength="6"
                />
                <small style={{color: '#888', fontSize: '0.8rem'}}>Only fill this if you want to change the user's password</small>
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
                  {Object.keys(departmentGroupCatalog).length > 0 && (
                    <>
                      <label className="form-label-elegant" style={{ marginTop: '1rem', display: 'block' }}>
                        Department groups ({editUserData.managedDepartmentGroups?.length || 0} selected)
                      </label>
                      <div className="departments-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        {Object.keys(departmentGroupCatalog).map((key) => (
                          <div
                            key={key}
                            className={`department-card ${editUserData.managedDepartmentGroups?.includes(key) ? 'selected' : ''}`}
                            onClick={() => handleEditUserGroupChange(key)}
                          >
                            <input
                              type="checkbox"
                              checked={editUserData.managedDepartmentGroups?.includes(key) || false}
                              onChange={() => {}}
                              style={{ marginRight: '0.5rem' }}
                            />
                            <span className="department-name">{key.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.5rem' }}>
                        Effective coverage:{' '}
                        {getEffectiveManagedDepartmentsClient(
                          editUserData.managedDepartments,
                          editUserData.managedDepartmentGroups,
                          departmentGroupCatalog
                        ).length}{' '}
                        departments
                      </p>
                    </>
                  )}
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

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="modal-elegant" onClick={() => !deleteUserLoading && setUserToDelete(null)}>
          <div className="modal-content-elegant" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 className="text-gradient" style={{ color: '#f44336' }}>
              {t('users.deleteUser') || 'Delete User'}
            </h2>
            <div style={{ marginBottom: '1.5rem', color: '#ccc' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>{userToDelete.name}</strong> ({userToDelete.email})
              </p>
              {userToDelete.employeeCode && <p style={{ marginBottom: '0.5rem' }}>#{userToDelete.employeeCode}</p>}
              {userToDelete.department && <p>{userToDelete.department}</p>}
            </div>
            <p style={{ color: '#ff9800', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {t('users.deleteUserWarning') || 'This will permanently delete the account and all related data (forms, attendance, files). This action cannot be undone.'}
            </p>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                {t('users.typeToConfirm') || 'Type the user\'s name or email to confirm'}
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                className="form-input-elegant"
                placeholder={userToDelete.name}
                disabled={deleteUserLoading}
              />
            </div>
            <div className="action-buttons">
              <button
                type="button"
                className="btn-elegant btn-danger"
                onClick={handleConfirmDeleteUser}
                disabled={deleteUserLoading || !deleteConfirmInput.trim()}
              >
                {deleteUserLoading ? '...' : (t('users.deleteUserConfirm') || 'Confirm Delete')}
              </button>
              <button
                type="button"
                className="btn-elegant"
                onClick={() => !deleteUserLoading && setUserToDelete(null)}
                disabled={deleteUserLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="modal-elegant" onClick={() => setShowPasswordResetModal(false)}>
          <div className="modal-content-elegant" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              🔑 Reset Password
            </h2>
            <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Reset password for: <strong style={{ color: '#fff' }}>{passwordResetUser?.name}</strong>
              <br />
              <span style={{ fontSize: '0.85rem' }}>{passwordResetUser?.email}</span>
            </p>
            <form className="form-elegant" onSubmit={handlePasswordReset}>
              <div className="form-group-elegant">
                <label className="form-label-elegant">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input-elegant"
                  placeholder="Enter new password (min 6 characters)"
                  minLength="6"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input-elegant"
                  placeholder="Confirm new password"
                  minLength="6"
                  required
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p style={{ color: '#f44336', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ Passwords do not match
                </p>
              )}
              <div className="action-buttons" style={{ marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn-elegant btn-success"
                  disabled={passwordResetLoading || newPassword !== confirmPassword || newPassword.length < 6}
                  style={{ 
                    opacity: (passwordResetLoading || newPassword !== confirmPassword || newPassword.length < 6) ? 0.6 : 1 
                  }}
                >
                  {passwordResetLoading ? '⏳ Resetting...' : '✅ Reset Password'}
                </button>
                <button 
                  type="button" 
                  className="btn-elegant"
                  onClick={() => setShowPasswordResetModal(false)}
                  disabled={passwordResetLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <VacationManagerModal open={showVacationManager} onClose={() => setShowVacationManager(false)} />
      <VacationReportModal open={showReport} onClose={() => setShowReport(false)} />

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
