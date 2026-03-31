import React, { useState, useEffect, useRef } from 'react';
import DashboardSectionNav from './layout/DashboardSectionNav';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import FormSubmission from './FormSubmission';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import ATSDashboard from './ATS/ATSDashboard';
import ManagerTeamAttendance from './ManagerTeamAttendance';
import API_URL from '../config/api';
import logger from '../utils/logger';
import { normalizeExcuseType, isPaidExcuse } from '../utils/excuseType';
import { smoothScrollToElement, DEFAULT_SCROLL_OFFSET } from '../utils/smoothScroll';

const ManagerDashboard = ({ onLogout }) => {
  const { t } = useTranslation();
  const [pendingForms, setPendingForms] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  
  // Form submission state
  const [showForm, setShowForm] = useState(false);
  const [showMyForms, setShowMyForms] = useState(false);
  const [showTeamForms, setShowTeamForms] = useState(false);
  const [showATS, setShowATS] = useState(false);
  const [showTeamAttendance, setShowTeamAttendance] = useState(true);
  const [myForms, setMyForms] = useState([]);
  const [teamForms, setTeamForms] = useState([]);
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);
  const [excuseRequestsLeft, setExcuseRequestsLeft] = useState(null);
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [actionType, setActionType] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingForms, setProcessingForms] = useState(new Set());
  const [refreshingPending, setRefreshingPending] = useState(false);
  
  // Flag modal state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [flagType, setFlagType] = useState('deduction');
  const [flagReason, setFlagReason] = useState('');
  const [teamFlags, setTeamFlags] = useState([]);
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const [showEditFormModal, setShowEditFormModal] = useState(false);
  const [formEditData, setFormEditData] = useState({});
  const [formEditSnapshot, setFormEditSnapshot] = useState(null);
  const [formEditSubmitting, setFormEditSubmitting] = useState(false);

  const teamAttendanceRef = useRef(null);
  const managerFormRef = useRef(null);
  const managerMyFormsRef = useRef(null);
  const managerTeamFormsRef = useRef(null);
  const managerAtsRef = useRef(null);
  const pendingApprovalsRef = useRef(null);

  const scrollToManagerSection = (ref) => {
    setTimeout(() => smoothScrollToElement(ref?.current, DEFAULT_SCROLL_OFFSET), 60);
  };

  const fieldDirty = (key) => {
    if (!formEditSnapshot) return false;
    const a = formEditData[key];
    const b = formEditSnapshot[key];
    return String(a ?? '') !== String(b ?? '');
  };

  useEffect(() => {
    fetchUserData();
    fetchPendingForms();
    fetchTeamMembers();
    fetchVacationDays();
    fetchExcuseHours();
    fetchTeamFlags();
  }, []);

  // Auto-refresh pending forms every 20 seconds to keep data synchronized
  useEffect(() => {
    const interval = setInterval(() => {
      logger.log('Auto-refreshing pending forms...');
      fetchPendingForms();
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.log('Page became visible, refreshing pending forms...');
        fetchPendingForms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data) {
        setUser(response.data);
        localStorage.setItem('userName', response.data.name);
        localStorage.setItem('managedDepartments', JSON.stringify(response.data.managedDepartments || []));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser({
        name: localStorage.getItem('userName') || 'Manager',
        managedDepartments: JSON.parse(localStorage.getItem('managedDepartments') || '[]'),
        permissions: {}
      });
    }
  };

  const fetchVacationDays = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/vacation-days`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setVacationDaysLeft(data.vacationDaysLeft);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchExcuseHours = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/excuse-hours`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseRequestsLeft(data.excuseRequestsLeft ?? data.excuseHoursLeft ?? 0);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchMyForms = async () => {
    try {
      const token = localStorage.getItem('token');
      logger.log('Fetching manager personal forms...');
      
      // Use dedicated endpoint for manager's personal forms only
      const response = await axios.get(`${API_URL}/api/forms/manager/personal-forms`, {
        headers: { 'x-auth-token': token }
      });
      
      logger.log('Manager personal forms received:', response.data);
      setMyForms(response.data);
      
      if (response.data.length === 0) {
        logger.log('No personal forms found for this manager');
      }
    } catch (error) {
      console.error('Error fetching manager personal forms:', error);
      if (error.response?.status === 403) {
        setMessage('Access denied - Manager role required');
      } else {
        setMessage('Error loading your personal forms');
      }
    }
  };

  const handleShowForm = () => {
    setShowForm(true);
    setShowMyForms(false);
    setShowTeamForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchVacationDays();
    fetchExcuseHours();
    scrollToManagerSection(managerFormRef);
  };

  const handleShowMyForms = () => {
    setShowMyForms(true);
    setShowForm(false);
    setShowTeamForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchMyForms();
    fetchVacationDays();
    fetchExcuseHours();
    scrollToManagerSection(managerMyFormsRef);
  };

  const handleShowTeamForms = () => {
    setShowTeamForms(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchTeamForms();
    scrollToManagerSection(managerTeamFormsRef);
  };

  const handleShowATS = () => {
    setShowATS(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowTeamForms(false);
    setShowTeamAttendance(false);
    scrollToManagerSection(managerAtsRef);
  };

  const handleShowTeamAttendance = () => {
    setShowTeamAttendance(true);
    setShowATS(false);
    setShowForm(false);
    setShowMyForms(false);
    setShowTeamForms(false);
    scrollToManagerSection(teamAttendanceRef);
  };

  const handleGoToTeamApprovals = () => {
    fetchPendingForms();
    setTimeout(() => smoothScrollToElement(pendingApprovalsRef.current, DEFAULT_SCROLL_OFFSET), 80);
  };

  const fetchTeamForms = async () => {
    try {
      const token = localStorage.getItem('token');
      logger.log('Fetching team members forms...');
      
      // Fetch all forms from team members in managed departments
      const response = await axios.get(`${API_URL}/api/forms/manager/team-forms`, {
        headers: { 'x-auth-token': token }
      });
      
      logger.log('Team members forms received:', response.data);
      setTeamForms(response.data);
      
      if (response.data.length === 0) {
        logger.log('No team forms found');
      }
    } catch (error) {
      console.error('Error fetching team members forms:', error);
      if (error.response?.status === 403) {
        setMessage('Access denied - Manager role required');
      } else {
        setMessage('Error loading team members forms');
      }
    }
  };

  const handleFormSubmitted = () => {
    fetchVacationDays();
    fetchExcuseHours();
    setShowForm(false);
    setShowMyForms(true);
    fetchMyForms();
  };

  const getStatusBadge = (status) => {
    const badgeClass = status === 'pending' ? 'badge-warning' :
                     status === 'manager_approved' ? 'badge-info' :
                     status === 'manager_submitted' ? 'badge-info' :
                     status === 'approved' ? 'badge-success' :
                     status.includes('rejected') ? 'badge-danger' : 'badge-secondary';
    
    const statusText = status === 'manager_approved' ? t('managerDashboard.managerApproved') :
                      status === 'manager_submitted' ? t('managerDashboard.awaitingHRApproval') :
                      status === 'manager_rejected' ? t('managerDashboard.managerRejected') :
                      status.charAt(0).toUpperCase() + status.slice(1);
    
    return <span className={`badge-elegant ${badgeClass}`}>{statusText}</span>;
  };

  const fetchPendingForms = async () => {
    try {
      setRefreshingPending(true);
      const token = localStorage.getItem('token');
      logger.log('🔄 Fetching pending team requests...');
      
      const response = await axios.get(`${API_URL}/api/forms/manager/pending`, {
        headers: { 'x-auth-token': token }
      });
      
      logger.log('✅ Pending team requests received:', {
        count: response.data.length,
        requests: response.data.map(form => ({
          id: form._id,
          type: form.type,
          status: form.status,
          submittedBy: form.user?.name,
          department: form.user?.department
        }))
      });
      
      setPendingForms(response.data);
      
      // Log after state update to confirm
      logger.log(`📊 Updated pending forms state: ${response.data.length} forms`);
      
    } catch (error) {
      console.error('❌ Error fetching pending team requests:', error);
      setMessage('Error loading pending team requests');
    } finally {
      setRefreshingPending(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/team-members`, {
        headers: { 'x-auth-token': token }
      });
      setTeamMembers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setLoading(false);
    }
  };

  const fetchTeamFlags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/employee-flags/team`, {
        headers: { 'x-auth-token': token }
      });
      setTeamFlags(response.data.flags || []);
    } catch (error) {
      console.error('Error fetching team flags:', error);
    }
  };

  const openFlagModal = (employee) => {
    setSelectedEmployee(employee);
    setFlagType('deduction');
    setFlagReason('');
    setShowFlagModal(true);
  };

  const closeFlagModal = () => {
    setShowFlagModal(false);
    setSelectedEmployee(null);
    setFlagType('deduction');
    setFlagReason('');
    setFlagSubmitting(false);
  };

  const handleCreateFlag = async () => {
    if (!selectedEmployee || !flagReason.trim()) {
      setMessage(t('flags.enterReason') || 'Please enter a reason for the flag');
      return;
    }

    setFlagSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/employee-flags`, {
        employeeId: selectedEmployee._id,
        type: flagType,
        reason: flagReason.trim()
      }, {
        headers: { 'x-auth-token': token }
      });

      setMessage(`✅ ${t('flags.flagCreated') || 'Flag created successfully'}`);
      closeFlagModal();
      fetchTeamFlags();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating flag:', error);
      setMessage(error.response?.data?.msg || 'Error creating flag');
    } finally {
      setFlagSubmitting(false);
    }
  };

  const handleRemoveFlag = async (flagId) => {
    if (!window.confirm(t('flags.confirmRemove') || 'Are you sure you want to remove this flag?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/employee-flags/${flagId}`, {
        headers: { 'x-auth-token': token }
      });

      setMessage(`✅ ${t('flags.flagRemoved') || 'Flag removed successfully'}`);
      fetchTeamFlags();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing flag:', error);
      setMessage(error.response?.data?.msg || 'Error removing flag');
    }
  };

  const getEmployeeFlags = (employeeId) => {
    return teamFlags.filter(flag => flag.employee?._id === employeeId || flag.employee === employeeId);
  };

  const openCommentModal = (form, action) => {
    setSelectedForm(form);
    setActionType(action);
    setComment('');
    const et = normalizeExcuseType({ ...form, type: form.type });
    const nextEdit = {
      _id: form._id,
      type: form.type,
      startDate: form.startDate?.toString().slice(0, 10) || '',
      endDate: form.endDate?.toString().slice(0, 10) || '',
      excuseDate: form.excuseDate?.toString().slice(0, 10) || '',
      excuseType: et || 'paid',
      fromHour: form.fromHour || '',
      toHour: form.toHour || '',
      sickLeaveStartDate: form.sickLeaveStartDate?.toString().slice(0, 10) || '',
      sickLeaveEndDate: form.sickLeaveEndDate?.toString().slice(0, 10) || '',
      wfhDate: form.wfhDate?.toString().slice(0, 10) || '',
      wfhWorkingOn: form.wfhWorkingOn || form.wfhDescription || '',
      extraHoursDate: form.extraHoursDate?.toString().slice(0, 10) || '',
      extraHoursWorked: form.extraHoursWorked || 0,
      extraHoursDescription: form.extraHoursDescription || '',
      missionStartDate: form.missionStartDate?.toString().slice(0, 10) || '',
      missionEndDate: form.missionEndDate?.toString().slice(0, 10) || '',
      missionDestination: form.missionDestination || '',
      missionFromTime: form.missionFromTime || '',
      missionToTime: form.missionToTime || '',
      reason: form.reason || '',
      managerComment: form.managerComment || ''
    };
    setFormEditData(nextEdit);
    setFormEditSnapshot({ ...nextEdit });
    setShowCommentModal(true);
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setSelectedForm(null);
    setActionType('');
    setComment('');
    setSubmitting(false);
    setFormEditSnapshot(null);
  };

  const handleFormAction = async () => {
    if (!selectedForm || !actionType) return;
    
    // For rejection, require a comment
    if (actionType === 'reject' && !comment.trim()) {
      setMessage(t('managerDashboard.reasonForRejectionIsRequired'));
      return;
    }

    // Prevent duplicate submissions
    if (processingForms.has(selectedForm._id)) {
      logger.log('Form already being processed, ignoring duplicate request');
      return;
    }

    setSubmitting(true);
    setProcessingForms(prev => new Set([...prev, selectedForm._id]));

    try {
      const token = localStorage.getItem('token');
      logger.log('Submitting form action:', {
        formId: selectedForm._id,
        action: actionType,
        formType: selectedForm.type,
        hasComment: !!comment.trim()
      });

      const payload = { action: actionType, managerComment: comment.trim() };
      if (formEditData && formEditData._id) {
        Object.assign(payload, {
          startDate: formEditData.startDate || undefined,
          endDate: formEditData.endDate || undefined,
          reason: formEditData.reason || undefined,
          excuseDate: formEditData.excuseDate || undefined,
          excuseType: formEditData.excuseType || undefined,
          fromHour: formEditData.fromHour || undefined,
          toHour: formEditData.toHour || undefined,
          sickLeaveStartDate: formEditData.sickLeaveStartDate || undefined,
          sickLeaveEndDate: formEditData.sickLeaveEndDate || undefined,
          wfhDate: formEditData.wfhDate || undefined,
          wfhWorkingOn: formEditData.wfhWorkingOn || undefined,
          extraHoursDate: formEditData.extraHoursDate || undefined,
          extraHoursWorked: formEditData.extraHoursWorked,
          extraHoursDescription: formEditData.extraHoursDescription || undefined,
          missionStartDate: formEditData.missionStartDate || undefined,
          missionEndDate: formEditData.missionEndDate || undefined,
          missionDestination: formEditData.missionDestination || undefined,
          missionFromTime: formEditData.missionFromTime || undefined,
          missionToTime: formEditData.missionToTime || undefined
        });
      }
      const response = await axios.put(`${API_URL}/api/forms/manager/${selectedForm._id}`, payload, {
        headers: { 'x-auth-token': token },
        timeout: 30000 // 30 second timeout
      });
      
      // Check if response is successful
      if (response.status === 200) {
        const serverForm = response.data?.form;
        const fallbackStatus =
          actionType === 'approve'
            ? selectedForm.type === 'excuse'
              ? 'approved'
              : 'manager_approved'
            : 'manager_rejected';

        const applyLocalEdits = (base) => {
          if (!formEditData || !formEditData._id) {
            return { ...base };
          }
          return {
            ...base,
            startDate: formEditData.startDate || base.startDate,
            endDate: formEditData.endDate || base.endDate,
            reason: formEditData.reason !== undefined ? formEditData.reason : base.reason,
            excuseDate: formEditData.excuseDate || base.excuseDate,
            excuseType: formEditData.excuseType || base.excuseType,
            fromHour: formEditData.fromHour !== undefined ? formEditData.fromHour : base.fromHour,
            toHour: formEditData.toHour !== undefined ? formEditData.toHour : base.toHour,
            sickLeaveStartDate: formEditData.sickLeaveStartDate || base.sickLeaveStartDate,
            sickLeaveEndDate: formEditData.sickLeaveEndDate || base.sickLeaveEndDate,
            wfhDate: formEditData.wfhDate || base.wfhDate,
            wfhWorkingOn: formEditData.wfhWorkingOn || base.wfhWorkingOn,
            extraHoursDate: formEditData.extraHoursDate || base.extraHoursDate,
            extraHoursWorked: formEditData.extraHoursWorked !== undefined ? formEditData.extraHoursWorked : base.extraHoursWorked,
            extraHoursDescription: formEditData.extraHoursDescription || base.extraHoursDescription,
            missionStartDate: formEditData.missionStartDate || base.missionStartDate,
            missionEndDate: formEditData.missionEndDate || base.missionEndDate,
            missionDestination: formEditData.missionDestination || base.missionDestination,
            missionFromTime: formEditData.missionFromTime || base.missionFromTime,
            missionToTime: formEditData.missionToTime || base.missionToTime
          };
        };

        const sameId = (a, b) => String(a) === String(b);

        // OPTIMISTIC UPDATE: Immediately remove from pending list
        setPendingForms(prev => prev.filter(form => !sameId(form._id, selectedForm._id)));

        // Update team forms with server truth (excuseType, dates, etc.) or merged local edits
        setTeamForms(prev =>
          prev.map(form => {
            if (!sameId(form._id, selectedForm._id)) return form;
            if (serverForm) {
              return {
                ...form,
                ...serverForm,
                user: serverForm.user || form.user,
                managerApprovedBy: serverForm.managerApprovedBy != null ? serverForm.managerApprovedBy : form.managerApprovedBy
              };
            }
            const withEdits = applyLocalEdits(form);
            return {
              ...withEdits,
              status: fallbackStatus,
              managerApprovedBy: user,
              managerApprovedAt: new Date().toISOString(),
              managerComment: comment.trim() || ''
            };
          })
        );

        setMessage(`✅ Request ${actionType}d successfully!`);
        closeCommentModal();
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage('');
        }, 3000);
        
        // Background refresh for consistency
        setTimeout(async () => {
          logger.log('🔄 Background refresh for consistency...');
          await fetchPendingForms();
          await fetchTeamForms();
        }, 1000);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating form:', error);
      
      // Provide more detailed error messages
      let errorMessage = 'Error updating request';
      if (error.response) {
        // Server responded with error status
        const responseData = error.response.data;
        errorMessage = responseData?.msg || `Server error: ${error.response.status}`;
        
        // If it's a status conflict, refresh to show current state
        if (error.response.status === 400 && (
          (responseData?.msg && responseData.msg.includes('not in') && responseData.msg.includes('status')) ||
          responseData?.isAlreadyProcessed
        )) {
          errorMessage = responseData?.msg || 'Form has already been processed by another user. Refreshing...';
          setTimeout(() => {
            fetchPendingForms();
            fetchTeamForms();
          }, 1000);
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        errorMessage = 'Request timed out. Please try again.';
      } else {
        // Something else happened
        errorMessage = `Network error: ${error.message}`;
      }
      
      setMessage(errorMessage);
      
      // Refresh forms data to ensure UI is in sync with server
      setTimeout(() => {
        fetchPendingForms();
        fetchTeamForms();
      }, 2000);
    } finally {
      setSubmitting(false);
      setProcessingForms(prev => {
        const updated = new Set(prev);
        updated.delete(selectedForm._id);
        return updated;
      });
    }
  };

  const openEditFormModal = (form) => {
    const et = normalizeExcuseType({ ...form, type: form.type });
    const nextEdit = {
      _id: form._id,
      type: form.type,
      startDate: form.startDate?.toString().slice(0, 10) || '',
      endDate: form.endDate?.toString().slice(0, 10) || '',
      excuseDate: form.excuseDate?.toString().slice(0, 10) || '',
      excuseType: et || 'paid',
      fromHour: form.fromHour || '',
      toHour: form.toHour || '',
      sickLeaveStartDate: form.sickLeaveStartDate?.toString().slice(0, 10) || '',
      sickLeaveEndDate: form.sickLeaveEndDate?.toString().slice(0, 10) || '',
      wfhDate: form.wfhDate?.toString().slice(0, 10) || '',
      wfhWorkingOn: form.wfhWorkingOn || form.wfhDescription || '',
      extraHoursDate: form.extraHoursDate?.toString().slice(0, 10) || '',
      extraHoursWorked: form.extraHoursWorked || 0,
      extraHoursDescription: form.extraHoursDescription || '',
      missionStartDate: form.missionStartDate?.toString().slice(0, 10) || '',
      missionEndDate: form.missionEndDate?.toString().slice(0, 10) || '',
      missionDestination: form.missionDestination || '',
      missionFromTime: form.missionFromTime || '',
      missionToTime: form.missionToTime || '',
      reason: form.reason || '',
      managerComment: form.managerComment || ''
    };
    setFormEditData(nextEdit);
    setFormEditSnapshot({ ...nextEdit });
    setShowEditFormModal(true);
  };

  const closeEditFormModal = () => {
    setShowEditFormModal(false);
    setFormEditData({});
    setFormEditSnapshot(null);
  };

  const handleFormEditSubmit = async () => {
    if (!formEditData._id) return;
    setFormEditSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formEditData };
      delete payload._id;
      delete payload.type;
      const res = await axios.put(`${API_URL}/api/forms/manager/${formEditData._id}/edit`, payload, {
        headers: { 'x-auth-token': token }
      });
      const updatedForm = res.data?.form;
      const formId = formEditData._id;
      const sameId = (a, b) => String(a) === String(b);

      if (updatedForm) {
        setPendingForms(prev =>
          prev.map(f =>
            sameId(f._id, formId) ? { ...f, ...updatedForm, user: updatedForm.user || f.user } : f
          )
        );
        setTeamForms(prev =>
          prev.map(f =>
            sameId(f._id, formId) ? { ...f, ...updatedForm, user: updatedForm.user || f.user } : f
          )
        );
      }

      if (res.data) {
        setMessage('Form updated successfully');
        closeEditFormModal();
        await Promise.all([fetchPendingForms(), fetchTeamForms()]);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Failed to update form');
    } finally {
      setFormEditSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const managerNavActiveId = showATS
    ? 'ats'
    : showForm
      ? 'submit'
      : showMyForms
        ? 'myForms'
        : showTeamForms
          ? 'teamForms'
          : 'teamAttendance';

  if (loading || !user) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t('managerDashboard.loadingManagerDashboard')}</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-info">
          <h1>{t('managerDashboard.managerDashboard')}</h1>
          <p>{t('managerDashboard.welcome')}, {user?.name || t('dashboard.manager')}</p>
          <p className="departments">{t('managerDashboard.managing', { departments: user?.managedDepartments?.join(', ') || 'No departments' })}</p>
          <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
            {t('managerDashboard.seeAndManageRequests')}
          </small>
        </div>
        <button onClick={onLogout} className="logout-btn">{t('common.logout')}</button>
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <DashboardSectionNav
        stickyBelowAppHeader={false}
        role="manager"
        title={t('dashboard.nav.managerTitle')}
        description={t('dashboard.nav.managerDesc')}
        badgeLabel={t('dashboard.nav.badgeManager')}
        activeId={managerNavActiveId}
        subtitle={`${pendingForms.length} ${t('managerDashboard.pendingTeamRequests')}`}
        sections={[
          { id: 'teamAttendance', label: t('managerDashboard.teamAttendance', 'Team Attendance'), icon: '📊', onSelect: handleShowTeamAttendance },
          { id: 'submit', label: t('managerDashboard.submitMyForm'), icon: '📝', onSelect: handleShowForm },
          { id: 'myForms', label: t('managerDashboard.viewMyForms'), icon: '📋', onSelect: handleShowMyForms },
          { id: 'teamForms', label: t('managerDashboard.myTeamMembersForms'), icon: '👥', onSelect: handleShowTeamForms },
          { id: 'teamApprovals', label: t('managerDashboard.approveTeamForms'), icon: '✅', onSelect: handleGoToTeamApprovals },
          { id: 'ats', label: t('managerDashboard.atsSystem', 'ATS'), icon: '🎯', onSelect: handleShowATS }
        ]}
      />

      {/* Stats */}
      <div className="stats-section">
        <div 
          className="stat-card stat-card-clickable team-attendance-stat"
          onClick={() => { handleShowTeamAttendance(); setShowForm(false); setShowMyForms(false); setShowTeamForms(false); setShowATS(false); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleShowTeamAttendance()}
          title={t('managerDashboard.teamAttendance', 'Team Attendance')}
        >
          <div className="stat-icon">📊</div>
          <h3>→</h3>
          <p>{t('managerDashboard.teamAttendance', 'Team Attendance')}</p>
          <small>{t('managerDashboard.viewEmployeeAttendance', 'View your team\'s attendance')}</small>
        </div>
        <div className="stat-card">
          <h3>{teamMembers.length}</h3>
          <p>{t('managerDashboard.myTeamMembers')}</p>
          <small>{t('managerDashboard.activeEmployeesInManagedDepartments')}</small>
        </div>
        <div
          className="stat-card stat-card-clickable pending-approvals-stat"
          onClick={handleGoToTeamApprovals}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleGoToTeamApprovals()}
          title={t('managerDashboard.approveTeamFormsHint')}
        >
          <h3>{pendingForms.length}</h3>
          <p>{t('managerDashboard.pendingTeamRequests')}</p>
          <small>{t('managerDashboard.awaitingYourApproval')}</small>
        </div>
        <div className="stat-card">
          <h3>{user?.managedDepartments?.length || 0}</h3>
          <p>{t('common.managedDepartments')}</p>
          <small>{t('managerDashboard.underYourSupervision')}</small>
        </div>
      </div>

      {/* Manager's Personal Section */}
      <div className="section manager-personal-section">
        <div className="section-header">
          <h2>📋 {t('managerDashboard.myPersonalFormsAndRequests')}</h2>
          <small className="section-subtitle">{t('managerDashboard.submitAndViewYourOwnFormsSeparateFromTeamManagement')}</small>
        </div>
        
        {/* Vacation and Excuse Days Cards */}
        <div className="stats-section manager-stats" style={{ marginBottom: '20px' }}>
          <div className="stat-card manager-stat-card">
            <div className="stat-icon">🏖️</div>
            <h3>{vacationDaysLeft !== null ? vacationDaysLeft : '...'}</h3>
            <p>{t('managerDashboard.vacationDaysLeft')}</p>
            <small>{t('managerDashboard.yourAnnualAllowanceRemaining')}</small>
          </div>
          <div className="stat-card manager-stat-card">
            <div className="stat-icon">⏰</div>
            <h3>{excuseRequestsLeft !== null ? excuseRequestsLeft : '...'}</h3>
            <p>{t('managerDashboard.excuseHoursLeft')}</p>
            <small>{t('managerDashboard.yourMonthlyAllowanceRemaining')}</small>
          </div>
        </div>
      </div>

      {/* Team Attendance */}
      {showTeamAttendance && (
        <div
          ref={teamAttendanceRef}
          className="section manager-team-attendance-section dashboard-section-anchor"
        >
          <ManagerTeamAttendance />
        </div>
      )}

      {/* ATS System */}
      {showATS && (
        <div ref={managerAtsRef} className="section manager-ats-section dashboard-section-anchor">
          <ATSDashboard />
        </div>
      )}

      {/* Form Submission */}
      {showForm && (
        <div ref={managerFormRef} className="section manager-form-section dashboard-section-anchor">
          <div className="section-header">
            <h2>📝 {t('managerDashboard.submitNewPersonalForm')}</h2>
            <small className="section-subtitle">{t('managerDashboard.thisIsForYourOwnPersonalRequestsVacationSickLeaveEtc')}</small>
          </div>
          <div className="form-container">
            <FormSubmission onFormSubmitted={handleFormSubmitted} />
          </div>
        </div>
      )}

      {/* My Forms Preview */}
      {showMyForms && (
        <div ref={managerMyFormsRef} className="section manager-forms-view-section dashboard-section-anchor">
          <div className="section-header">
            <h2>📋 {t('managerDashboard.mySubmittedForms')}</h2>
            <small className="section-subtitle">{t('managerDashboard.yourPersonalFormSubmissionsAndTheirStatus')}</small>
          </div>
          {myForms.length > 0 ? (
            <div className="my-forms-grid">
              {myForms.map(form => (
                <div key={form._id} className="my-form-card manager-own-form">
                  <div className="form-header">
                    <h4>
                      {form.type === 'vacation' ? 'ANNUAL VACATION' :
                       form.type.toUpperCase()}
                    </h4>
                    {getStatusBadge(form.status)}
                  </div>
                  
                  <div className="form-details">
                    <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                    
                    {form.type === 'vacation' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                        <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate)} {t('days')}</p>
                        {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                      </>
                    )}
                    
                    {form.type === 'excuse' && (
                      <>
                        <p><strong>Excuse Type:</strong> <span style={{ color: isPaidExcuse(form) ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{isPaidExcuse(form) ? '💰 Paid' : '📝 Unpaid'}</span></p>
                        <p><strong>{t('excuseDate')}:</strong> {formatDate(form.excuseDate)}</p>
                        <p><strong>{t('time')}:</strong> {form.fromHour} - {form.toHour}</p>
                        <p><strong>{t('duration')}:</strong> {((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('hours')}</p>
                      </>
                    )}
                    
                    {form.type === 'wfh' && (
                      <>
                        <p><strong>{t('forms.date')}:</strong> {formatDate(form.wfhDate)}</p>
                        <p><strong>{t('forms.workingOn')}:</strong> {form.wfhWorkingOn || form.wfhDescription?.substring(0, 50)}...</p>
                      </>
                    )}

                    {form.type === 'extra_hours' && (
                      <>
                        <p><strong>{t('forms.date')}:</strong> {formatDate(form.extraHoursDate)}</p>
                        <p><strong>{t('forms.extraHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                        <p><strong>{t('forms.workDone')}:</strong> {form.extraHoursDescription?.substring(0, 50)}...</p>
                      </>
                    )}
                    
                    {form.type === 'sick_leave' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.sickLeaveStartDate)} - {formatDate(form.sickLeaveEndDate)}</p>
                        <p><strong>{t('duration')}:</strong> {Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('days')}</p>
                        <MedicalDocumentViewer form={form} userRole="manager" />
                      </>
                    )}
                    
                    {form.type === 'mission' && (
                      <>
                        <p><strong>{t('forms.startDate')}:</strong> {formatDate(form.missionStartDate)}</p>
                        <p><strong>{t('forms.endDate')}:</strong> {formatDate(form.missionEndDate)}</p>
                        <p><strong>{t('forms.missionDestination')}:</strong> 📍 {form.missionDestination}</p>
                      </>
                    )}
                    
                    <p><strong>{t('reason')}:</strong> {form.reason?.substring(0, 80)}...</p>
                    
                    {form.managerApprovedBy && (
                      <div className="comment-section manager-action-section">
                        <strong>
                          {form.status === 'manager_rejected' ? t('rejectedByManager') : t('approvedByManager')}:
                        </strong>
                        <p style={{ color: form.status === 'manager_rejected' ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>
                          👔 {form.managerApprovedBy.name}
                          {form.managerApprovedAt && (
                            <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 'normal' }}>
                              {' '}{t('on')} {new Date(form.managerApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {form.managerComment && (
                      <div className="comment-section">
                        <strong>{t('managerComment')}{form.managerApprovedBy ? ` (${form.managerApprovedBy.name})` : ''}:</strong>
                        <p>{form.managerComment}</p>
                      </div>
                    )}

                    {form.adminApprovedBy && (
                      <div className="comment-section admin-action-section">
                        <strong>
                          {form.status === 'rejected' ? 'رفض من الموارد البشرية' : 'موافقة من الموارد البشرية'}:
                        </strong>
                        <p style={{ color: form.status === 'rejected' ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>
                          🏢 {form.adminApprovedBy.name}
                          {form.adminApprovedAt && (
                            <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 'normal' }}>
                              {' '}في {new Date(form.adminApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {form.adminComment && (
                      <div className="comment-section">
                        <strong>
                          {form.adminApprovedBy ? `الموارد البشرية (${form.adminApprovedBy.name})` : 'الموارد البشرية'}:
                        </strong>
                        <p>{form.adminComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-content">
              <span className="no-content-icon">📋</span>
              <p>{t('managerDashboard.noPersonalFormsSubmittedYet')}</p>
              <small>{t('managerDashboard.theseAreYourOwnFormsVacationSickLeaveEtc')}</small>
            </div>
          )}
        </div>
      )}

      {/* Team Members Forms */}
      {showTeamForms && (
        <div ref={managerTeamFormsRef} className="section team-management-section dashboard-section-anchor">
          <div className="section-header">
            <h2>👥 {t('managerDashboard.myTeamMembersForms')}</h2>
            <small className="section-subtitle">{t('managerDashboard.allFormsSubmittedByYourTeamMembersFromManagedDepartments')}</small>
          </div>
          {teamForms.length > 0 ? (
            <div className="my-forms-grid">
              {teamForms.map(form => (
                <div key={form._id} className="my-form-card team-request-card">
                  <div className="form-header">
                    <h4>
                      {form.user.name} - {form.type === 'vacation' ? 'ANNUAL VACATION' :
                                          form.type.toUpperCase()}
                    </h4>
                    {getStatusBadge(form.status)}
                  </div>
                  
                  <div className="form-details">
                    <p><strong>{t('employee')}:</strong> {form.user.name}</p>
                    <p><strong>{t('department')}:</strong> {form.user.department}</p>
                    <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                    
                    {form.type === 'vacation' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                        <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate)} {t('days')}</p>
                        {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                      </>
                    )}
                    
                    {form.type === 'excuse' && (
                      <>
                        <p><strong>Excuse Type:</strong> <span style={{ color: isPaidExcuse(form) ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{isPaidExcuse(form) ? '💰 Paid' : '📝 Unpaid'}</span></p>
                        <p><strong>{t('excuseDate')}:</strong> {formatDate(form.excuseDate)}</p>
                        <p><strong>{t('time')}:</strong> {form.fromHour} - {form.toHour}</p>
                        <p><strong>{t('duration')}:</strong> {((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('hours')}</p>
                      </>
                    )}
                    
                    {form.type === 'wfh' && (
                      <>
                        <p><strong>{t('forms.date')}:</strong> {formatDate(form.wfhDate)}</p>
                        <p><strong>{t('forms.workingOn')}:</strong> {form.wfhWorkingOn || form.wfhDescription?.substring(0, 50)}...</p>
                      </>
                    )}

                    {form.type === 'extra_hours' && (
                      <>
                        <p><strong>{t('forms.date')}:</strong> {formatDate(form.extraHoursDate)}</p>
                        <p><strong>{t('forms.extraHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                        <p><strong>{t('forms.workDone')}:</strong> {form.extraHoursDescription?.substring(0, 50)}...</p>
                      </>
                    )}
                    
                    {form.type === 'sick_leave' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.sickLeaveStartDate)} - {formatDate(form.sickLeaveEndDate)}</p>
                        <p><strong>{t('duration')}:</strong> {Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('days')}</p>
                        <MedicalDocumentViewer form={form} userRole="manager" />
                      </>
                    )}
                    
                    {form.type === 'mission' && (
                      <>
                        <p><strong>{t('forms.startDate')}:</strong> {formatDate(form.missionStartDate)}</p>
                        <p><strong>{t('forms.endDate')}:</strong> {formatDate(form.missionEndDate)}</p>
                        <p><strong>{t('forms.missionDestination')}:</strong> 📍 {form.missionDestination}</p>
                      </>
                    )}
                    
                    <p><strong>{t('reason')}:</strong> {form.reason?.substring(0, 80)}...</p>
                    
                    {form.managerApprovedBy && (
                      <div className="comment-section manager-action-section">
                        <strong>
                          {form.status === 'manager_rejected' ? t('rejectedByManager') : t('approvedByManager')}:
                        </strong>
                        <p style={{ color: form.status === 'manager_rejected' ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>
                          👔 {form.managerApprovedBy.name}
                          {form.managerApprovedAt && (
                            <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 'normal' }}>
                              {' '}{t('on')} {new Date(form.managerApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {form.managerComment && (
                      <div className="comment-section">
                        <strong>{t('managerComment')}{form.managerApprovedBy ? ` (${form.managerApprovedBy.name})` : ''}:</strong>
                        <p>{form.managerComment}</p>
                      </div>
                    )}

                    {form.adminApprovedBy && (
                      <div className="comment-section admin-action-section">
                        <strong>
                          {form.status === 'rejected' ? 'رفض من الموارد البشرية' : 'موافقة من الموارد البشرية'}:
                        </strong>
                        <p style={{ color: form.status === 'rejected' ? '#f44336' : '#4caf50', fontWeight: 'bold' }}>
                          🏢 {form.adminApprovedBy.name}
                          {form.adminApprovedAt && (
                            <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 'normal' }}>
                              {' '}في {new Date(form.adminApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {form.adminComment && (
                      <div className="comment-section">
                        <strong>
                          {form.adminApprovedBy ? `الموارد البشرية (${form.adminApprovedBy.name})` : 'الموارد البشرية'}:
                        </strong>
                        <p>{form.adminComment}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button onClick={() => openEditFormModal(form)} className="btn-manager" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                      ✏️ {t('edit') || 'Edit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-content">
              <span className="no-content-icon">👥</span>
              <p>{t('noFormsFoundFromYourTeamMembers')}</p>
              <small>{t('yourTeamMembersHaventSubmittedAnyFormsYetOrYouDontHaveAnyManagedDepartmentsAssigned')}</small>
            </div>
          )}
        </div>
      )}

      {/* Team Members */}
      <div className="section team-management-section">
        <div className="section-header">
          <h2>👥 {t('myTeamMembers')}</h2>
          <small className="section-subtitle">
            {t('employeesFromYourManagedDepartments', { departments: user.managedDepartments?.join(', ') || 'None' })}
          </small>
        </div>
        {teamMembers.length > 0 ? (
          <div className="team-grid">
            {teamMembers.map(member => {
              const memberFlags = getEmployeeFlags(member._id);
              return (
                <div key={member._id} className="team-card team-member-card">
                  <div className="member-avatar">👤</div>
                  <h4>{member.name}</h4>
                  <p className="member-department">{member.department}</p>
                  <span className="vacation-days team-stat">{Number(member.vacationDaysLeft).toFixed(1)} {t('daysLeft')}</span>
                  
                  {/* Display existing flags */}
                  {memberFlags.length > 0 && (
                    <div className="member-flags">
                      {memberFlags.map(flag => (
                        <div 
                          key={flag._id} 
                          className={`flag-badge ${flag.type === 'deduction' ? 'flag-deduction' : 'flag-reward'}`}
                          title={`${flag.reason} - ${new Date(flag.createdAt).toLocaleDateString()}`}
                        >
                          {flag.type === 'deduction' ? '⚠️' : '⭐'} {flag.type === 'deduction' ? t('flags.deduction') : t('flags.reward')}
                          <button 
                            className="flag-remove-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveFlag(flag._id); }}
                            title={t('flags.removeFlag')}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Flag Employee Button */}
                  <button 
                    className="btn-flag-employee"
                    onClick={() => openFlagModal(member)}
                    title={t('flags.flagEmployee')}
                  >
                    🚩 {t('flags.flagEmployee') || 'Flag'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-content">
            <span className="no-content-icon">👥</span>
            <p>{t('noTeamMembersFoundInYourManagedDepartments')}</p>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      <div ref={pendingApprovalsRef} className="section team-requests-section dashboard-section-anchor">
        <div className="section-header">
          <h2>⏳ {t('managerDashboard.pendingTeamRequests')} {refreshingPending ? `(${t('managerDashboard.refreshing')})` : ''}</h2>
          <small className="section-subtitle">
            {t('managerDashboard.employeeRequestsAwaitingYourApprovalFromManagedDepartments')}
          </small>
          <button 
            className="btn-manager refresh-btn"
            onClick={() => {
              logger.log('Manual refresh pending forms');
              fetchPendingForms();
            }}
            title={t('managerDashboard.refreshPendingRequests')}
            disabled={refreshingPending}
            style={{ 
              marginTop: '10px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              background: refreshingPending ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: refreshingPending ? 'not-allowed' : 'pointer'
            }}
          >
            {refreshingPending ? t('managerDashboard.refreshing') : t('managerDashboard.refresh')}
          </button>
        </div>
        {pendingForms.length > 0 ? (
          <div className="requests-list">
            {pendingForms.map(form => (
              <div key={form._id} className="request-card team-request-card">
                <div className="request-info">
                  <h4>{form.user.name} - {form.type === 'vacation' ? 'ANNUAL VACATION' :
                                        form.type.toUpperCase()}</h4>
                  <p><strong>{t('department')}:</strong> {form.user.department}</p>
                  
                  {/* Display different information based on form type */}
                  {form.type === 'vacation' && (
                    <>
                      <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                      <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate)} {t('days')}</p>
                      {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                    </>
                  )}
                  
                  {form.type === 'excuse' && (
                    <>
                      <p><strong>Excuse Type:</strong> <span style={{ color: isPaidExcuse(form) ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{isPaidExcuse(form) ? '💰 Paid' : '📝 Unpaid'}</span></p>
                      <p><strong>{t('excuseDate')}:</strong> {formatDate(form.excuseDate)}</p>
                      <p><strong>{t('timePeriod')}:</strong> {form.fromHour} - {form.toHour}</p>
                      <p><strong>{t('duration')}:</strong> {((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('hours')}</p>
                    </>
                  )}
                  
                  {form.type === 'wfh' && (
                    <>
                      <p><strong>{t('forms.date')}:</strong> {form.wfhDate?.slice(0,10) || 'N/A'}</p>
                      <p><strong>{t('forms.workingOn')}:</strong> {form.wfhWorkingOn || form.wfhDescription}</p>
                    </>
                  )}

                  {form.type === 'extra_hours' && (
                    <>
                      <p><strong>{t('forms.date')}:</strong> {form.extraHoursDate?.slice(0,10) || 'N/A'}</p>
                      <p><strong>{t('forms.extraHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                      <p><strong>{t('forms.workDone')}:</strong> {form.extraHoursDescription}</p>
                    </>
                  )}
                  
                  {form.type === 'sick_leave' && (
                    <>
                      <p><strong>{t('sickLeaveDates')}:</strong> {formatDate(form.sickLeaveStartDate)} - {formatDate(form.sickLeaveEndDate)}</p>
                      <p><strong>{t('duration')}:</strong> {Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('days')}</p>
                      <MedicalDocumentViewer form={form} userRole="manager" />
                    </>
                  )}
                  
                  {form.type === 'mission' && (
                    <>
                      <p><strong>{t('forms.startDate')}:</strong> {formatDate(form.missionStartDate)}</p>
                      <p><strong>{t('forms.endDate')}:</strong> {formatDate(form.missionEndDate)}</p>
                      {(form.missionFromTime || form.missionToTime) && (
                        <p><strong>{t('forms.time') || 'Time'}:</strong> {form.missionFromTime || '--'} {t('forms.to')} {form.missionToTime || '--'}</p>
                      )}
                      <p><strong>{t('forms.missionDestination')}:</strong> 📍 {form.missionDestination}</p>
                    </>
                  )}
                  
                  <p><strong>{t('reason')}:</strong> {form.reason}</p>
                  <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                </div>
                <div className="request-actions">
                  <button 
                    onClick={() => openEditFormModal(form)}
                    className="btn-manager"
                    title={t('edit') || 'Edit form'}
                    style={{ marginRight: '8px' }}
                  >
                    ✏️ {t('edit') || 'Edit'}
                  </button>
                  <button 
                    onClick={() => openCommentModal(form, 'approve')}
                    className="approve-btn"
                    title={`${t('managerDashboard.approve')} ${form.type} ${t('forms.from')} ${form.user.name}`}
                    disabled={processingForms.has(form._id)}
                  >
                    {processingForms.has(form._id) ? t('managerDashboard.processing') : t('managerDashboard.approve')}
                  </button>
                  <button 
                    onClick={() => openCommentModal(form, 'reject')}
                    className="reject-btn"
                    title={`${t('managerDashboard.reject')} ${form.type} ${t('forms.from')} ${form.user.name}`}
                    disabled={processingForms.has(form._id)}
                  >
                    {processingForms.has(form._id) ? t('managerDashboard.processing') : t('managerDashboard.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-content">
            <span className="no-content-icon">⏳</span>
            <p>{t('managerDashboard.noPendingRequestsFromYourTeam')}</p>
            <small>{t('managerDashboard.allCaughtUpYourTeamHaventSubmittedAnyRequestsNeedingApproval')}</small>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="modal-overlay" onClick={closeCommentModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === 'approve' ? t('managerDashboard.approveRequest') : t('managerDashboard.rejectRequest')}
              </h3>
              <button className="close-btn" onClick={closeCommentModal}>×</button>
            </div>
            
            {selectedForm && (
              <div className="modal-body">
                <div className="request-summary">
                  <h4>{selectedForm.user.name} - {selectedForm.type === 'vacation' ? 'ANNUAL VACATION' :
                                                selectedForm.type.toUpperCase()}</h4>
                  <p><strong>{t('department')}:</strong> {selectedForm.user.department}</p>
                  
                  {/* Display different information based on form type */}
                  {selectedForm.type === 'vacation' && (
                    <>
                      <p><strong>{t('dates')}:</strong> {formatDate(selectedForm.startDate)} - {formatDate(selectedForm.endDate)}</p>
                      <p><strong>{t('duration')}:</strong> {calculateDays(selectedForm.startDate, selectedForm.endDate)} {t('days')}</p>
                      {selectedForm.vacationType && <p><strong>{t('type')}:</strong> {selectedForm.vacationType}</p>}
                    </>
                  )}
                  
                  {selectedForm.type === 'excuse' && (
                    <>
                      <p><strong>{t('excuseType') || 'Excuse Type'}:</strong>{' '}
                        <span style={{ color: isPaidExcuse(selectedForm) ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>
                          {isPaidExcuse(selectedForm) ? '💰 Paid' : '📝 Unpaid'}
                        </span>
                      </p>
                      <p><strong>{t('excuseDate')}:</strong> {formatDate(selectedForm.excuseDate)}</p>
                      <p><strong>{t('timePeriod')}:</strong> {selectedForm.fromHour} - {selectedForm.toHour}</p>
                      <p><strong>{t('duration')}:</strong> {((new Date(`2000-01-01T${selectedForm.toHour}`) - new Date(`2000-01-01T${selectedForm.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('hours')}</p>
                    </>
                  )}
                  
                  {selectedForm.type === 'wfh' && (
                    <>
                      <p><strong>{t('forms.date')}:</strong> {selectedForm.wfhDate?.slice(0,10) || 'N/A'}</p>
                      <p><strong>{t('forms.workingOn')}:</strong> {selectedForm.wfhWorkingOn || selectedForm.wfhDescription}</p>
                    </>
                  )}

                  {selectedForm.type === 'extra_hours' && (
                    <>
                      <p><strong>{t('forms.date')}:</strong> {selectedForm.extraHoursDate?.slice(0,10) || 'N/A'}</p>
                      <p><strong>{t('forms.extraHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{selectedForm.extraHoursWorked} {t('forms.hours')}</span></p>
                      <p><strong>{t('forms.workDone')}:</strong> {selectedForm.extraHoursDescription}</p>
                    </>
                  )}
                  
                  {selectedForm.type === 'sick_leave' && (
                    <>
                      <p><strong>{t('sickLeaveDates')}:</strong> {formatDate(selectedForm.sickLeaveStartDate)} - {formatDate(selectedForm.sickLeaveEndDate)}</p>
                      <p><strong>{t('duration')}:</strong> {Math.ceil((new Date(selectedForm.sickLeaveEndDate) - new Date(selectedForm.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('days')}</p>
                      <MedicalDocumentViewer form={selectedForm} userRole="manager" />
                    </>
                  )}
                  
                  <p><strong>{t('reason')}:</strong> {selectedForm.reason}</p>
                </div>

                {formEditData && formEditData._id && (
                  <div className="edit-before-submit-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '8px', border: '1px solid rgba(102, 126, 234, 0.3)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#667eea' }}>✏️ {t('edit') || 'Edit'} form before {actionType === 'approve' ? (t('approve') || 'approving') : (t('reject') || 'rejecting')}</strong>
                    <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label-elegant">{t('reason')}{fieldDirty('reason') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                      <textarea value={formEditData.reason || ''} onChange={(e) => setFormEditData({ ...formEditData, reason: e.target.value })} rows={2} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('reason') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                    </div>
                    {formEditData.type === 'vacation' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.startDate')}</label>
                          <input type="date" value={formEditData.startDate || ''} onChange={(e) => setFormEditData({ ...formEditData, startDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.endDate')}</label>
                          <input type="date" value={formEditData.endDate || ''} onChange={(e) => setFormEditData({ ...formEditData, endDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                      </>
                    )}
                    {formEditData.type === 'excuse' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('excuseDate')}{fieldDirty('excuseDate') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                          <input type="date" value={formEditData.excuseDate || ''} onChange={(e) => setFormEditData({ ...formEditData, excuseDate: e.target.value })} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('excuseDate') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('timePeriod') || 'Time'}{fieldDirty('fromHour') || fieldDirty('toHour') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input type="time" value={formEditData.fromHour || ''} onChange={(e) => setFormEditData({ ...formEditData, fromHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('fromHour') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                            <input type="time" value={formEditData.toHour || ''} onChange={(e) => setFormEditData({ ...formEditData, toHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('toHour') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                          </div>
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('excuseType') || 'Excuse Type'}{fieldDirty('excuseType') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                          <select value={formEditData.excuseType || 'paid'} onChange={(e) => setFormEditData({ ...formEditData, excuseType: e.target.value })} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('excuseType') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }}>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </div>
                      </>
                    )}
                    {formEditData.type === 'sick_leave' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.startDate')}</label>
                          <input type="date" value={formEditData.sickLeaveStartDate || ''} onChange={(e) => setFormEditData({ ...formEditData, sickLeaveStartDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.endDate')}</label>
                          <input type="date" value={formEditData.sickLeaveEndDate || ''} onChange={(e) => setFormEditData({ ...formEditData, sickLeaveEndDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                      </>
                    )}
                    {formEditData.type === 'wfh' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.date')}</label>
                          <input type="date" value={formEditData.wfhDate || ''} onChange={(e) => setFormEditData({ ...formEditData, wfhDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.workingOn')}</label>
                          <input type="text" value={formEditData.wfhWorkingOn || ''} onChange={(e) => setFormEditData({ ...formEditData, wfhWorkingOn: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                      </>
                    )}
                    {formEditData.type === 'extra_hours' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.date')}</label>
                          <input type="date" value={formEditData.extraHoursDate || ''} onChange={(e) => setFormEditData({ ...formEditData, extraHoursDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.extraHours')}</label>
                          <input type="number" value={formEditData.extraHoursWorked ?? ''} onChange={(e) => setFormEditData({ ...formEditData, extraHoursWorked: Number(e.target.value) })} className="form-input-elegant" style={{ width: '100%' }} min="0" step="0.5" />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.workDone')}</label>
                          <input type="text" value={formEditData.extraHoursDescription || ''} onChange={(e) => setFormEditData({ ...formEditData, extraHoursDescription: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                      </>
                    )}
                    {formEditData.type === 'mission' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.startDate')}</label>
                          <input type="date" value={formEditData.missionStartDate || ''} onChange={(e) => setFormEditData({ ...formEditData, missionStartDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.endDate')}</label>
                          <input type="date" value={formEditData.missionEndDate || ''} onChange={(e) => setFormEditData({ ...formEditData, missionEndDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.missionDestination')}</label>
                          <input type="text" value={formEditData.missionDestination || ''} onChange={(e) => setFormEditData({ ...formEditData, missionDestination: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label-elegant">{t('forms.missionFromTime') || 'Time From'}</label>
                            <input type="time" value={formEditData.missionFromTime || ''} onChange={(e) => setFormEditData({ ...formEditData, missionFromTime: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                          </div>
                          <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label-elegant">{t('forms.missionToTime') || 'Time To'}</label>
                            <input type="time" value={formEditData.missionToTime || ''} onChange={(e) => setFormEditData({ ...formEditData, missionToTime: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className="comment-section">
                  <label htmlFor="managerComment">
                    {actionType === 'approve' ? t('commentOptional') : t('reasonForRejectionRequired')}:
                  </label>
                  <textarea
                    id="managerComment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      actionType === 'approve' 
                        ? t('addAnyCommentsAboutThisApproval') 
                        : t('pleaseProvideAClearReasonForRejection')
                    }
                    rows={4}
                    className={actionType === 'reject' && !comment.trim() ? 'required-field' : ''}
                  />
                  {actionType === 'reject' && !comment.trim() && (
                    <small className="error-text">{t('aReasonForRejectionIsRequired')}</small>
                  )}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={closeCommentModal}
                disabled={submitting}
              >
                {t('cancel')}
              </button>
              <button 
                className={actionType === 'approve' ? 'approve-btn' : 'reject-btn'}
                onClick={handleFormAction}
                disabled={submitting || (actionType === 'reject' && !comment.trim())}
              >
                {submitting ? t('processing') : 
                 actionType === 'approve' ? t('approveRequest') : t('rejectRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal (for managers with canEditDepartmentForms) */}
      {showEditFormModal && Object.keys(formEditData).length > 0 && (
        <div className="modal-overlay" onClick={closeEditFormModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>✏️ {t('edit') || 'Edit'} Form</h3>
              <button className="close-btn" onClick={closeEditFormModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                <label className="form-label-elegant">{t('reason')}</label>
                <textarea
                  value={formEditData.reason || ''}
                  onChange={(e) => setFormEditData({ ...formEditData, reason: e.target.value })}
                  rows={3}
                  className="form-input-elegant"
                />
              </div>
              {formEditData.type === 'vacation' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.startDate')}</label>
                    <input type="date" value={formEditData.startDate || ''} onChange={(e) => setFormEditData({ ...formEditData, startDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.endDate')}</label>
                    <input type="date" value={formEditData.endDate || ''} onChange={(e) => setFormEditData({ ...formEditData, endDate: e.target.value })} className="form-input-elegant" />
                  </div>
                </>
              )}
              {formEditData.type === 'excuse' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('excuseDate')}{fieldDirty('excuseDate') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                    <input type="date" value={formEditData.excuseDate || ''} onChange={(e) => setFormEditData({ ...formEditData, excuseDate: e.target.value })} className="form-input-elegant" style={{ boxShadow: fieldDirty('excuseDate') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('timePeriod') || 'Time'}{fieldDirty('fromHour') || fieldDirty('toHour') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input type="time" value={formEditData.fromHour || ''} onChange={(e) => setFormEditData({ ...formEditData, fromHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('fromHour') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                      <input type="time" value={formEditData.toHour || ''} onChange={(e) => setFormEditData({ ...formEditData, toHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('toHour') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }} />
                    </div>
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('excuseType') || 'Excuse Type'}{fieldDirty('excuseType') ? ' · ' + (t('modified') || 'Modified') : ''}</label>
                    <select value={formEditData.excuseType || 'paid'} onChange={(e) => setFormEditData({ ...formEditData, excuseType: e.target.value })} className="form-input-elegant" style={{ boxShadow: fieldDirty('excuseType') ? '0 0 0 2px rgba(102, 126, 234, 0.6)' : undefined }}>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </>
              )}
              {formEditData.type === 'sick_leave' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.startDate')}</label>
                    <input type="date" value={formEditData.sickLeaveStartDate || ''} onChange={(e) => setFormEditData({ ...formEditData, sickLeaveStartDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.endDate')}</label>
                    <input type="date" value={formEditData.sickLeaveEndDate || ''} onChange={(e) => setFormEditData({ ...formEditData, sickLeaveEndDate: e.target.value })} className="form-input-elegant" />
                  </div>
                </>
              )}
              {formEditData.type === 'wfh' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.date')}</label>
                    <input type="date" value={formEditData.wfhDate || ''} onChange={(e) => setFormEditData({ ...formEditData, wfhDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.workingOn')}</label>
                    <input type="text" value={formEditData.wfhWorkingOn || ''} onChange={(e) => setFormEditData({ ...formEditData, wfhWorkingOn: e.target.value })} className="form-input-elegant" />
                  </div>
                </>
              )}
              {formEditData.type === 'extra_hours' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.date')}</label>
                    <input type="date" value={formEditData.extraHoursDate || ''} onChange={(e) => setFormEditData({ ...formEditData, extraHoursDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.extraHours')}</label>
                    <input type="number" value={formEditData.extraHoursWorked || 0} onChange={(e) => setFormEditData({ ...formEditData, extraHoursWorked: Number(e.target.value) })} className="form-input-elegant" min="0" step="0.5" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.workDone')}</label>
                    <input type="text" value={formEditData.extraHoursDescription || ''} onChange={(e) => setFormEditData({ ...formEditData, extraHoursDescription: e.target.value })} className="form-input-elegant" />
                  </div>
                </>
              )}
              {formEditData.type === 'mission' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.startDate')}</label>
                    <input type="date" value={formEditData.missionStartDate || ''} onChange={(e) => setFormEditData({ ...formEditData, missionStartDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.endDate')}</label>
                    <input type="date" value={formEditData.missionEndDate || ''} onChange={(e) => setFormEditData({ ...formEditData, missionEndDate: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.missionDestination')}</label>
                    <input type="text" value={formEditData.missionDestination || ''} onChange={(e) => setFormEditData({ ...formEditData, missionDestination: e.target.value })} className="form-input-elegant" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">{t('forms.missionFromTime') || 'Time From'}</label>
                      <input type="time" value={formEditData.missionFromTime || ''} onChange={(e) => setFormEditData({ ...formEditData, missionFromTime: e.target.value })} className="form-input-elegant" />
                    </div>
                    <div className="form-group-elegant">
                      <label className="form-label-elegant">{t('forms.missionToTime') || 'Time To'}</label>
                      <input type="time" value={formEditData.missionToTime || ''} onChange={(e) => setFormEditData({ ...formEditData, missionToTime: e.target.value })} className="form-input-elegant" />
                    </div>
                  </div>
                </>
              )}
              <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                <label className="form-label-elegant">{t('managerComment') || 'Manager Comment'}</label>
                <textarea value={formEditData.managerComment || ''} onChange={(e) => setFormEditData({ ...formEditData, managerComment: e.target.value })} rows={2} className="form-input-elegant" placeholder="Optional comment" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeEditFormModal} disabled={formEditSubmitting}>{t('cancel')}</button>
              <button className="approve-btn" onClick={handleFormEditSubmit} disabled={formEditSubmitting}>
                {formEditSubmitting ? t('processing') : (t('save') || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && selectedEmployee && (
        <div className="modal-overlay" onClick={closeFlagModal}>
          <div className="modal-content flag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚩 {t('flags.flagEmployee') || 'Flag Employee'}</h3>
              <button className="close-btn" onClick={closeFlagModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="employee-summary">
                <div className="employee-avatar">👤</div>
                <div className="employee-info">
                  <h4>{selectedEmployee.name}</h4>
                  <p>{selectedEmployee.department}</p>
                </div>
              </div>
              
              <div className="flag-type-section">
                <label>{t('flags.flagType') || 'Flag Type'}:</label>
                <div className="flag-type-options">
                  <button 
                    className={`flag-type-btn ${flagType === 'deduction' ? 'active deduction' : ''}`}
                    onClick={() => setFlagType('deduction')}
                  >
                    ⚠️ {t('flags.deduction') || 'Deduction'}
                  </button>
                  <button 
                    className={`flag-type-btn ${flagType === 'reward' ? 'active reward' : ''}`}
                    onClick={() => setFlagType('reward')}
                  >
                    ⭐ {t('flags.reward') || 'Reward'}
                  </button>
                </div>
              </div>
              
              <div className="flag-reason-section">
                <label>{t('flags.reason') || 'Reason'}:</label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder={t('flags.enterReason') || 'Enter reason for flag...'}
                  rows={4}
                  className={!flagReason.trim() ? 'required-field' : ''}
                />
                {!flagReason.trim() && (
                  <small className="error-text">{t('validation.required') || 'This field is required'}</small>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={closeFlagModal}
                disabled={flagSubmitting}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button 
                className={`flag-submit-btn ${flagType === 'deduction' ? 'deduction' : 'reward'}`}
                onClick={handleCreateFlag}
                disabled={flagSubmitting || !flagReason.trim()}
              >
                {flagSubmitting ? (t('managerDashboard.processing') || 'Processing...') : (t('flags.createFlag') || 'Create Flag')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .manager-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          padding: 20px;
          color: #ffffff;
        }

        .dashboard-header {
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
        }

        .user-info h1 {
          color: #ffffff;
          margin: 0 0 10px 0;
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .user-info p {
          color: rgba(255, 255, 255, 0.8);
          margin: 5px 0;
        }

        .departments {
          font-style: italic;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .logout-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
        }

        .logout-btn:hover {
          background: linear-gradient(135deg, #764ba2, #667eea);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
          border: 1px solid rgba(76, 175, 80, 0.4);
        }

        .message.error {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
          border: 1px solid rgba(244, 67, 54, 0.4);
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(255, 255, 255, 0.15);
          background: rgba(0, 0, 0, 0.7);
        }

        .stat-card-clickable {
          cursor: pointer;
          border: 2px solid rgba(6, 182, 212, 0.4);
          background: rgba(6, 182, 212, 0.1);
        }

        .stat-card-clickable:hover {
          border-color: rgba(6, 182, 212, 0.8);
          background: rgba(6, 182, 212, 0.2);
          box-shadow: 0 12px 40px rgba(6, 182, 212, 0.2);
        }

        .stat-card-clickable.pending-approvals-stat {
          border: 2px solid rgba(255, 193, 7, 0.45);
          background: rgba(255, 193, 7, 0.08);
        }

        .stat-card-clickable.pending-approvals-stat:hover {
          border-color: rgba(255, 193, 7, 0.9);
          background: rgba(255, 193, 7, 0.18);
          box-shadow: 0 12px 40px rgba(255, 193, 7, 0.25);
        }

        .stat-card h3 {
          font-size: 2.5rem;
          margin: 0 0 10px 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: bold;
        }

        .stat-card p {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .stat-card small {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }

        .section {
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
        }

        .section h2 {
          margin: 0 0 20px 0;
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .team-card {
          background: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          padding: 20px !important;
          border-radius: 10px !important;
          border-left: 4px solid #667eea !important;
          text-align: center !important;
          transition: all 0.3s ease !important;
        }

        .team-card h4 {
          margin: 0 0 5px 0;
          color: #ffffff;
          font-weight: 600;
        }

        .team-card p {
          margin: 0 0 10px 0;
          color: rgba(255, 255, 255, 0.7);
        }

        .vacation-days {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .requests-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .request-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          margin-bottom: 15px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          border-left: 4px solid #667eea;
          transition: all 0.3s ease;
        }

        .request-card:hover {
          background: rgba(0, 0, 0, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1);
        }

        .request-info {
          flex: 1;
        }

        .request-info h4 {
          margin: 0 0 10px 0;
          color: #ffffff;
          font-weight: 600;
        }

        .request-info p {
          margin: 5px 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .request-info strong {
          color: #ffffff;
        }

        .request-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-left: 20px;
        }

        .approve-btn, .reject-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          min-width: 80px;
        }

        .approve-btn {
          background: #4CAF50;
          color: white;
        }

        .approve-btn:hover {
          background: #45a049;
        }

        .approve-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .reject-btn {
          background: #f44336;
          color: white;
        }

        .reject-btn:hover {
          background: #da190b;
        }

        .reject-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .no-requests {
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
          padding: 40px;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(255, 255, 255, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h3 {
          margin: 0;
          color: #ffffff;
          font-size: 1.4rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.7);
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 25px;
        }

        .request-summary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .request-summary h4 {
          margin: 0 0 10px 0;
          color: #ffffff;
          font-weight: 600;
        }

        .request-summary p {
          margin: 5px 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .request-summary strong {
          color: #ffffff;
        }

        .comment-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #ffffff;
        }

        .comment-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .comment-section textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .comment-section textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        /* Enhanced Input Field Styling */
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="number"],
        input[type="date"],
        input[type="time"],
        input[type="search"],
        select,
        textarea {
          background: rgba(0, 0, 0, 0.6) !important;
          color: #ffffff !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px !important;
          padding: 12px 16px !important;
          font-size: 14px !important;
          transition: all 0.3s ease !important;
          backdrop-filter: blur(10px) !important;
        }

        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="password"]:focus,
        input[type="number"]:focus,
        input[type="date"]:focus,
        input[type="time"]:focus,
        input[type="search"]:focus,
        select:focus,
        textarea:focus {
          outline: none !important;
          border-color: #667eea !important;
          background: rgba(0, 0, 0, 0.8) !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3) !important;
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          font-style: italic;
        }

        /* Select dropdown specific styling */
        select option {
          background: rgba(0, 0, 0, 0.95) !important;
          color: #ffffff !important;
          padding: 10px !important;
        }

        /* Form labels */
        label {
          color: #ffffff !important;
          font-weight: 600 !important;
          margin-bottom: 8px !important;
          display: block !important;
        }

        /* Form groups */
        .form-group,
        .form-field,
        .input-group {
          margin-bottom: 20px;
        }

        .form-group label,
        .form-field label,
        .input-group label {
          color: #ffffff !important;
          font-weight: 600;
          margin-bottom: 8px;
          display: block;
        }

        /* Button improvements */
        button:not(.logout-btn):not(.close-btn) {
          background: linear-gradient(135deg, #667eea, #764ba2) !important;
          color: white !important;
          border: none !important;
          padding: 12px 24px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }

        button:not(.logout-btn):not(.close-btn):hover {
          background: linear-gradient(135deg, #764ba2, #667eea) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3) !important;
        }

        /* Search inputs specific styling */
        .search-input,
        input[type="search"] {
          background: rgba(0, 0, 0, 0.5) !important;
          color: #ffffff !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 25px !important;
          padding: 12px 20px !important;
          font-size: 14px !important;
          width: 100% !important;
        }

        .search-input:focus,
        input[type="search"]:focus {
          border-color: #667eea !important;
          background: rgba(0, 0, 0, 0.7) !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
        }

        /* Card content text clarity */
        .stat-card h3,
        .team-card h4,
        .request-card h4,
        .my-form-card h4 {
          color: #ffffff !important;
          font-weight: 600 !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
        }

        .stat-card p,
        .team-card p,
        .request-card p,
        .my-form-card p {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .stat-card small,
        .team-card small,
        .request-card small,
        .my-form-card small {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        /* Enhanced contrast for specific elements */
        strong {
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        /* Form container improvements */
        .form-container input,
        .form-container textarea,
        .form-container select {
          background: rgba(0, 0, 0, 0.7) !important;
          color: #ffffff !important;
          border: 2px solid rgba(76, 175, 80, 0.3) !important;
        }

        .form-container input:focus,
        .form-container textarea:focus,
        .form-container select:focus {
          border-color: #4caf50 !important;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2) !important;
        }

        /* File input styling */
        input[type="file"] {
          background: rgba(0, 0, 0, 0.6) !important;
          color: #ffffff !important;
          border: 2px dashed rgba(255, 255, 255, 0.3) !important;
          border-radius: 8px !important;
          padding: 16px !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }

        input[type="file"]:hover {
          border-color: #667eea !important;
          background: rgba(0, 0, 0, 0.8) !important;
        }

        input[type="file"]:focus {
          outline: none !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
        }

        /* Radio buttons and checkboxes */
        input[type="radio"],
        input[type="checkbox"] {
          accent-color: #667eea !important;
          transform: scale(1.2) !important;
          margin-right: 8px !important;
        }

        /* Date picker improvements */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) !important;
          cursor: pointer !important;
        }

        /* Number input spinner styling */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }

        /* Manager Dashboard specific text improvements */
        .manager-dashboard h1,
        .manager-dashboard h2,
        .manager-dashboard h3,
        .manager-dashboard h4,
        .manager-dashboard h5,
        .manager-dashboard h6 {
          color: #ffffff !important;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
        }

        .manager-dashboard p,
        .manager-dashboard span,
        .manager-dashboard div {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .manager-dashboard strong,
        .manager-dashboard b {
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        /* Table styling if present */
        table,
        .table {
          background: rgba(0, 0, 0, 0.4) !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }

        table th,
        .table th {
          background: rgba(0, 0, 0, 0.6) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          border: none !important;
          padding: 12px 16px !important;
        }

        table td,
        .table td {
          background: rgba(0, 0, 0, 0.3) !important;
          color: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 12px 16px !important;
        }

        table tr:hover td,
        .table tr:hover td {
          background: rgba(0, 0, 0, 0.5) !important;
        }

        /* Enhanced visibility for all text elements */
        .manager-dashboard *:not(input):not(textarea):not(select):not(button) {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Universal override for any white backgrounds */
        .manager-dashboard .card,
        .manager-dashboard .stat-card,
        .manager-dashboard .team-card,
        .manager-dashboard .request-card,
        .manager-dashboard [class*="card"],
        .manager-dashboard [class*="Card"] {
          background: rgba(0, 0, 0, 0.7) !important;
          color: #ffffff !important;
        }

        /* Ensure all card text is white */
        .manager-dashboard .card *,
        .manager-dashboard .stat-card *,
        .manager-dashboard .team-card *,
        .manager-dashboard .request-card *,
        .manager-dashboard [class*="card"] *,
        .manager-dashboard [class*="Card"] * {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .manager-dashboard .card h1,
        .manager-dashboard .card h2,
        .manager-dashboard .card h3,
        .manager-dashboard .card h4,
        .manager-dashboard .card h5,
        .manager-dashboard .card h6,
        .manager-dashboard .stat-card h1,
        .manager-dashboard .stat-card h2,
        .manager-dashboard .stat-card h3,
        .manager-dashboard .stat-card h4,
        .manager-dashboard .stat-card h5,
        .manager-dashboard .stat-card h6,
        .manager-dashboard .team-card h1,
        .manager-dashboard .team-card h2,
        .manager-dashboard .team-card h3,
        .manager-dashboard .team-card h4,
        .manager-dashboard .team-card h5,
        .manager-dashboard .team-card h6,
        .manager-dashboard .request-card h1,
        .manager-dashboard .request-card h2,
        .manager-dashboard .request-card h3,
        .manager-dashboard .request-card h4,
        .manager-dashboard .request-card h5,
        .manager-dashboard .request-card h6,
        .manager-dashboard [class*="card"] h1,
        .manager-dashboard [class*="card"] h2,
        .manager-dashboard [class*="card"] h3,
        .manager-dashboard [class*="card"] h4,
        .manager-dashboard [class*="card"] h5,
        .manager-dashboard [class*="card"] h6,
        .manager-dashboard [class*="Card"] h1,
        .manager-dashboard [class*="Card"] h2,
        .manager-dashboard [class*="Card"] h3,
        .manager-dashboard [class*="Card"] h4,
        .manager-dashboard [class*="Card"] h5,
        .manager-dashboard [class*="Card"] h6 {
          color: #ffffff !important;
          font-weight: 600 !important;
        }

        /* Ensure proper contrast for all interactive elements */
        .manager-dashboard [role="button"],
        .manager-dashboard .clickable {
          background: rgba(0, 0, 0, 0.5) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px !important;
          padding: 8px 16px !important;
          transition: all 0.3s ease !important;
        }

        .manager-dashboard [role="button"]:hover,
        .manager-dashboard .clickable:hover {
          background: rgba(0, 0, 0, 0.7) !important;
          border-color: #667eea !important;
        }

        .comment-section textarea.required-field {
          border-color: #f44336;
          box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
        }

        .error-text {
          color: #ff5252;
          font-size: 0.8rem;
          margin-top: 5px;
          display: block;
          font-weight: 500;
        }

        .modal-actions {
          padding: 20px 25px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .cancel-btn {
          padding: 10px 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.5);
          color: rgba(255, 255, 255, 0.8);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Form submission styles */
        .action-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 20px;
        }

        .btn-action {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          color: white;
          font-size: 16px;
        }

        .submit-btn {
          background: linear-gradient(135deg, #4CAF50, #45a049);
        }

        .submit-btn:hover {
          background: linear-gradient(135deg, #45a049, #3d8b40);
          transform: translateY(-2px);
        }

        .view-btn {
          background: linear-gradient(135deg, #2196F3, #1976D2);
        }

        .view-btn:hover {
          background: linear-gradient(135deg, #1976D2, #1565C0);
          transform: translateY(-2px);
        }

        /* My forms grid */
        .my-forms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .my-form-card {
          background: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px !important;
          padding: 20px !important;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1) !important;
          border-left: 4px solid #667eea !important;
          transition: all 0.3s ease !important;
        }

        .my-form-card:hover {
          transform: translateY(-2px);
          background: rgba(0, 0, 0, 0.6);
          box-shadow: 0 8px 30px rgba(255, 255, 255, 0.15);
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .form-header h4 {
          margin: 0;
          color: #ffffff;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .form-details p {
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .form-details strong {
          color: #ffffff;
        }

        .my-form-card .comment-section {
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.3);
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }

        .my-form-card .comment-section strong {
          color: #64b5f6;
          font-size: 0.9rem;
        }

        .my-form-card .comment-section p {
          margin: 5px 0 0 0;
          color: rgba(255, 255, 255, 0.8);
          font-style: italic;
        }

        /* Badge styles */
        .badge-elegant {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge-success {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
        }

        .badge-warning {
          background: linear-gradient(135deg, #FF9800, #F57C00);
          color: white;
        }

        .badge-info {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
        }

        .badge-danger {
          background: linear-gradient(135deg, #f44336, #d32f2f);
          color: white;
        }

        .badge-secondary {
          background: linear-gradient(135deg, #9E9E9E, #757575);
          color: white;
        }

        /* Manager Personal Section Styles */
        .manager-personal-section {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
          border: 2px solid rgba(76, 175, 80, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .manager-personal-section::before {
          content: "👤 PERSONAL";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        .manager-form-section {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
          border: 2px solid rgba(76, 175, 80, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .manager-form-section::before {
          content: "📝 PERSONAL FORM";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        .manager-forms-view-section {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
          border: 2px solid rgba(76, 175, 80, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .manager-forms-view-section::before {
          content: "📋 MY FORMS";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        /* Team Management Section Styles */
        .manager-team-attendance-section {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.05));
          border: 2px solid rgba(6, 182, 212, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .manager-team-attendance-section::before {
          content: "📊 TEAM ATTENDANCE";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
        }

        .team-management-section {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05));
          border: 2px solid rgba(33, 150, 243, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .team-management-section::before {
          content: "👥 TEAM MANAGEMENT";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }

        .team-requests-section {
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 152, 0, 0.05));
          border: 2px solid rgba(255, 152, 0, 0.3);
          border-radius: 20px;
          position: relative;
        }

        .team-requests-section::before {
          content: "⏳ TEAM REQUESTS";
          position: absolute;
          top: -12px;
          left: 20px;
          background: linear-gradient(135deg, #FF9800, #F57C00);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
        }

        /* Section Headers */
        .section-header {
          margin-bottom: 25px;
          padding-top: 10px;
        }

        .section-header h2 {
          margin: 0 0 8px 0;
          color: #ffffff;
          font-size: 1.6rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .section-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        /* Manager Buttons — base style for inline actions (edit, refresh, etc.) */
        .btn-manager {
          padding: 14px 28px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          color: white;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        /* Manager Stats */
        .manager-stats .manager-stat-card {
          background: rgba(0, 0, 0, 0.7) !important;
          border: 2px solid #4CAF50 !important;
          border-radius: 16px !important;
          position: relative !important;
          overflow: hidden !important;
        }

        .manager-stats .manager-stat-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4CAF50, #45a049);
        }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }

        /* Team Member Cards */
        .team-member-card {
          background: rgba(0, 0, 0, 0.7) !important;
          border: 2px solid #2196F3 !important;
          border-radius: 16px !important;
          text-align: center !important;
          position: relative !important;
          transition: all 0.3s ease !important;
        }

        .team-member-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(33, 150, 243, 0.3);
        }

        .member-avatar {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }

        .member-department {
          color: #2196F3;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .team-stat {
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: bold;
          display: inline-block;
          margin-top: 8px;
        }

        /* Team Request Cards */
        .team-request-card {
          background: rgba(0, 0, 0, 0.7) !important;
          border: 2px solid #FF9800 !important;
          border-left: 6px solid #FF9800 !important;
          border-radius: 12px !important;
          transition: all 0.3s ease !important;
        }

        .team-request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 152, 0, 0.2);
        }

        /* Manager's Own Form Cards */
        .manager-own-form {
          background: rgba(0, 0, 0, 0.7) !important;
          border: 2px solid #4CAF50 !important;
          border-left: 6px solid #4CAF50 !important;
          border-radius: 12px !important;
        }

        /* Form Container */
        .form-container {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 25px;
          margin-top: 20px;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        /* No Content Styling */
        .no-content {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.7);
        }

        .no-content-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 15px;
          opacity: 0.6;
        }

        .no-content p {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .no-content small {
          color: rgba(255, 255, 255, 0.6);
          font-style: italic;
        }

        /* Flag Styles */
        .member-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 10px 0;
          justify-content: center;
        }

        .flag-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: bold;
          position: relative;
        }

        .flag-deduction {
          background: linear-gradient(135deg, #f44336, #d32f2f);
          color: white;
          border: 1px solid rgba(244, 67, 54, 0.5);
        }

        .flag-reward {
          background: linear-gradient(135deg, #4caf50, #388e3c);
          color: white;
          border: 1px solid rgba(76, 175, 80, 0.5);
        }

        .flag-remove-btn {
          background: rgba(255, 255, 255, 0.3) !important;
          border: none !important;
          color: white !important;
          width: 16px !important;
          height: 16px !important;
          border-radius: 50% !important;
          padding: 0 !important;
          margin-left: 4px !important;
          cursor: pointer !important;
          font-size: 12px !important;
          line-height: 1 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .flag-remove-btn:hover {
          background: rgba(255, 255, 255, 0.5) !important;
        }

        .btn-flag-employee {
          margin-top: 12px !important;
          padding: 8px 16px !important;
          background: linear-gradient(135deg, #ff9800, #f57c00) !important;
          color: white !important;
          border: none !important;
          border-radius: 8px !important;
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          width: 100% !important;
        }

        .btn-flag-employee:hover {
          background: linear-gradient(135deg, #f57c00, #ef6c00) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4) !important;
        }

        /* Flag Modal Styles */
        .flag-modal {
          max-width: 450px !important;
        }

        .employee-summary {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .employee-avatar {
          font-size: 2.5rem;
        }

        .employee-info h4 {
          margin: 0 0 5px 0;
          color: #ffffff;
          font-size: 1.2rem;
        }

        .employee-info p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .flag-type-section {
          margin-bottom: 20px;
        }

        .flag-type-section label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #ffffff;
        }

        .flag-type-options {
          display: flex;
          gap: 10px;
        }

        .flag-type-btn {
          flex: 1 !important;
          padding: 12px 16px !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          background: rgba(0, 0, 0, 0.4) !important;
          color: rgba(255, 255, 255, 0.7) !important;
          border-radius: 10px !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }

        .flag-type-btn:hover {
          background: rgba(0, 0, 0, 0.6) !important;
          color: #ffffff !important;
        }

        .flag-type-btn.active.deduction {
          background: linear-gradient(135deg, #f44336, #d32f2f) !important;
          border-color: #f44336 !important;
          color: white !important;
        }

        .flag-type-btn.active.reward {
          background: linear-gradient(135deg, #4caf50, #388e3c) !important;
          border-color: #4caf50 !important;
          color: white !important;
        }

        .flag-reason-section {
          margin-bottom: 10px;
        }

        .flag-reason-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #ffffff;
        }

        .flag-reason-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .flag-reason-section textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .flag-submit-btn {
          padding: 12px 24px !important;
          border: none !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
        }

        .flag-submit-btn.deduction {
          background: linear-gradient(135deg, #f44336, #d32f2f) !important;
          color: white !important;
        }

        .flag-submit-btn.deduction:hover:not(:disabled) {
          background: linear-gradient(135deg, #d32f2f, #c62828) !important;
        }

        .flag-submit-btn.reward {
          background: linear-gradient(135deg, #4caf50, #388e3c) !important;
          color: white !important;
        }

        .flag-submit-btn.reward:hover:not(:disabled) {
          background: linear-gradient(135deg, #388e3c, #2e7d32) !important;
        }

        .flag-submit-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .stats-section {
            grid-template-columns: 1fr;
          }

          .my-forms-grid {
            grid-template-columns: 1fr;
          }

          .team-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ManagerDashboard; 
