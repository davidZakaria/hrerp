import React, { useState, useEffect, useRef, useMemo } from 'react';
import DashboardSectionNav from './layout/DashboardSectionNav';
import DashboardAppHeader from './layout/DashboardAppHeader';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import FormSubmission from './FormSubmission';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import ATSDashboard from './ATS/ATSDashboard';
import ManagerTeamAttendance from './ManagerTeamAttendance';
import DashboardWelcomeCard from './dashboard/DashboardWelcomeCard';
import { DashboardStatCard, DashboardStatGrid } from './dashboard/DashboardStatCard';
import { formatShiftTime } from '../utils/welcomeGreeting';
import API_URL from '../config/api';
import logger from '../utils/logger';
import { normalizeExcuseType, isPaidExcuse } from '../utils/excuseType';
import { smoothScrollToElement, DEFAULT_SCROLL_OFFSET } from '../utils/smoothScroll';
import { formatVacationDeductionDays } from '../utils/vacationDays';
import { persistProfilePicture } from '../utils/avatarHelpers';
import { ACTION, MISC, MANAGER_NAV } from '../utils/dashboardEmojis';

const MD_PANEL =
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-6';
const MD_H2 = 'text-xl font-bold !text-slate-900 dark:!text-white m-0 mb-2';
const MD_SUB = 'block text-sm !text-slate-500 dark:!text-slate-400 m-0 leading-relaxed';
const MD_BTN_EDIT =
  'md-btn-edit bg-slate-100 dark:bg-slate-700 !text-slate-700 dark:!text-white rounded-lg px-4 py-2 font-medium border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer disabled:opacity-50';
const MD_BTN_APPROVE =
  'md-btn-approve bg-emerald-500 hover:bg-emerald-600 !text-white rounded-lg px-4 py-2 font-medium shadow-sm border-none cursor-pointer disabled:opacity-50';
const MD_BTN_REJECT =
  'md-btn-reject bg-rose-500 hover:bg-rose-600 !text-white rounded-lg px-4 py-2 font-medium shadow-sm border-none cursor-pointer disabled:opacity-50';
const MD_BTN_REFRESH =
  'md-btn-refresh bg-indigo-600 hover:bg-indigo-700 !text-white rounded-lg px-4 py-2 font-medium shadow-sm border-none cursor-pointer disabled:opacity-50';
const MD_PENDING_CARD =
  'bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500 border-y border-r border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm mb-4 flex flex-col md:flex-row justify-between gap-4';
const MD_TEAM_CARD =
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-5 text-center';
const MD_FORM_CARD =
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-500 shadow-sm rounded-xl p-5';
const MD_HEAD = 'md-section-head mb-4';
const MD_HEAD_ROW = 'md-section-head md-section-head--row mb-4';

function memberInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function approvalActorClass(rejected) {
  return rejected
    ? '!text-rose-600 dark:!text-rose-400 font-semibold m-0'
    : '!text-emerald-600 dark:!text-emerald-400 font-semibold m-0';
}

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
  const [managerNavActiveId, setManagerNavActiveId] = useState('teamAttendance');
  const [myForms, setMyForms] = useState([]);
  const [teamForms, setTeamForms] = useState([]);
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);
  
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

  const effectiveDeptList = useMemo(() => {
    if (!user) return [];
    const eff = user.effectiveManagedDepartments;
    if (Array.isArray(eff) && eff.length) return eff;
    return user.managedDepartments || [];
  }, [user]);

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
    fetchTeamFlags();
  }, []);

  // Auto-refresh pending forms every 20 seconds to keep data synchronized
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingForms();
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
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
        persistProfilePicture(response.data.profilePicture || '');
        localStorage.setItem(
          'managedDepartments',
          JSON.stringify(response.data.effectiveManagedDepartments || response.data.managedDepartments || [])
        );
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
    setManagerNavActiveId('submit');
    setShowForm(true);
    setShowMyForms(false);
    setShowTeamForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchVacationDays();
    scrollToManagerSection(managerFormRef);
  };

  const handleShowMyForms = () => {
    setManagerNavActiveId('myForms');
    setShowMyForms(true);
    setShowForm(false);
    setShowTeamForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchMyForms();
    fetchVacationDays();
    scrollToManagerSection(managerMyFormsRef);
  };

  const handleShowTeamForms = () => {
    setManagerNavActiveId('teamForms');
    setShowTeamForms(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowATS(false);
    setShowTeamAttendance(false);
    fetchTeamForms();
    scrollToManagerSection(managerTeamFormsRef);
  };

  const handleShowATS = () => {
    setManagerNavActiveId('ats');
    setShowATS(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowTeamForms(false);
    setShowTeamAttendance(false);
    scrollToManagerSection(managerAtsRef);
  };

  const handleShowTeamAttendance = () => {
    setManagerNavActiveId('teamAttendance');
    setShowTeamAttendance(true);
    setShowATS(false);
    setShowForm(false);
    setShowMyForms(false);
    setShowTeamForms(false);
    scrollToManagerSection(teamAttendanceRef);
  };

  const handleGoToTeamApprovals = () => {
    setManagerNavActiveId('teamApprovals');
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
    setShowForm(false);
    setShowMyForms(true);
    setManagerNavActiveId('myForms');
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

      const response = await axios.get(`${API_URL}/api/forms/manager/pending`, {
        headers: { 'x-auth-token': token }
      });

      setPendingForms(response.data);
    } catch (error) {
      console.error('Error fetching pending team requests:', error);
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

      setMessage(t('flags.flagCreated') || 'Flag created successfully');
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

      setMessage(t('flags.flagRemoved') || 'Flag removed successfully');
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
      isHalfDay: !!form.isHalfDay,
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
      approvedHours: form.approvedHours ?? form.extraHoursWorked ?? 0,
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
          isHalfDay: formEditData.isHalfDay,
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
          approvedHours: formEditData.approvedHours,
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
            isHalfDay: formEditData.isHalfDay !== undefined ? formEditData.isHalfDay : base.isHalfDay,
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
            approvedHours: formEditData.approvedHours !== undefined ? formEditData.approvedHours : base.approvedHours,
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

        setMessage(`Request ${actionType}d successfully!`);
        closeCommentModal();
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage('');
        }, 3000);
        
        // Background refresh for consistency
        setTimeout(async () => {
          logger.log('Background refresh for consistency...');
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
      isHalfDay: !!form.isHalfDay,
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
      approvedHours: form.approvedHours ?? form.extraHoursWorked ?? 0,
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

  const calculateDays = (startDate, endDate, isHalfDay = false) => {
    return formatVacationDeductionDays({ startDate, endDate, isHalfDay });
  };

  const updateVacationEdit = (updates) => {
    setFormEditData(prev => {
      const next = { ...prev, ...updates };
      if (next.isHalfDay && next.startDate) {
        next.endDate = next.startDate;
      }
      return next;
    });
  };

  if (loading || !user) {
    return (
      <div className="loading-container flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="manager-attendance-spinner mb-5" aria-hidden />
        <p className="!text-slate-600 dark:!text-slate-400">{t('managerDashboard.loadingManagerDashboard')}</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard dashboard-container modern-dash min-h-screen bg-slate-50 dark:bg-slate-900">
      <DashboardAppHeader title={t('managerDashboard.managerDashboard')} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 w-full">
      {user && (
        <DashboardWelcomeCard user={user} showAvatar showGreeting onUserUpdate={setUser}>
          <p className="text-sm text-slate-500 dark:text-slate-400" style={{ margin: '0.5rem 0 0' }}>
            {t('managerDashboard.managing', {
              departments: effectiveDeptList.length ? effectiveDeptList.join(', ') : t('managerDashboard.noDepartmentsAssigned')
            })}
          </p>
        </DashboardWelcomeCard>
      )}

      {user && (
        <DashboardStatGrid columns={3}>
          <DashboardStatCard
            value={vacationDaysLeft ?? user.vacationDaysLeft ?? MISC.emDash}
            label={t('welcomeHero.leaveRemaining')}
          />
          <DashboardStatCard
            value={user.excuseRequestsLeft ?? MISC.emDash}
            label={t('welcomeHero.excusesRemaining')}
          />
          <DashboardStatCard
            value={formatShiftTime(user.workSchedule)}
            label={t('welcomeHero.todaysShift')}
          />
        </DashboardStatGrid>
      )}

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <DashboardSectionNav
        stickyBelowAppHeader={false}
        variant="light"
        role="manager"
        title={t('dashboard.nav.managerTitle')}
        description={t('dashboard.nav.managerDesc')}
        badgeLabel={t('dashboard.nav.badgeManager')}
        activeId={managerNavActiveId}
        subtitle={`${pendingForms.length} ${t('managerDashboard.pendingTeamRequests')}`}
        sections={[
          { id: 'teamAttendance', label: t('managerDashboard.teamAttendance', 'Team Attendance'), icon: MANAGER_NAV.teamAttendance, onSelect: handleShowTeamAttendance },
          { id: 'submit', label: t('managerDashboard.submitMyForm'), icon: MANAGER_NAV.submit, onSelect: handleShowForm },
          { id: 'myForms', label: t('managerDashboard.viewMyForms'), icon: MANAGER_NAV.myForms, onSelect: handleShowMyForms },
          { id: 'teamForms', label: t('managerDashboard.myTeamMembersForms'), icon: MANAGER_NAV.teamForms, onSelect: handleShowTeamForms },
          { id: 'teamApprovals', label: t('managerDashboard.approveTeamForms'), icon: MANAGER_NAV.approvals, onSelect: handleGoToTeamApprovals },
          { id: 'ats', label: t('managerDashboard.atsSystem', 'ATS'), icon: MANAGER_NAV.ats, onSelect: handleShowATS }
        ]}
      />

      <DashboardStatGrid>
        <DashboardStatCard
          value={teamMembers.length}
          label={t('managerDashboard.myTeamMembers')}
          subtitle={t('managerDashboard.activeEmployeesInManagedDepartments')}
        />
        <DashboardStatCard
          value={pendingForms.length}
          label={t('managerDashboard.pendingTeamRequests')}
          subtitle={t('managerDashboard.awaitingYourApproval')}
          onClick={handleGoToTeamApprovals}
          title={t('managerDashboard.approveTeamFormsHint')}
        />
        <DashboardStatCard
          value={effectiveDeptList.length}
          label={t('common.managedDepartments')}
          subtitle={t('managerDashboard.underYourSupervision')}
        />
      </DashboardStatGrid>

      {/* Manager's Personal Section */}
      <div className={`section manager-personal-section ${MD_PANEL}`}>
        <div className={MD_HEAD}>
          <h2 className={MD_H2}>{t('managerDashboard.myPersonalFormsAndRequests')}</h2>
        </div>
      </div>

      {/* Team Attendance */}
      {showTeamAttendance && (
        <div
          ref={teamAttendanceRef}
          className={`section manager-team-attendance-section dashboard-section-anchor ${MD_PANEL}`}
        >
          <ManagerTeamAttendance />
        </div>
      )}

      {/* ATS System */}
      {showATS && (
        <div ref={managerAtsRef} className={`section manager-ats-section dashboard-section-anchor ${MD_PANEL}`}>
          <ATSDashboard />
        </div>
      )}

      {/* Form Submission */}
      {showForm && (
        <div ref={managerFormRef} className={`section manager-form-section dashboard-section-anchor ${MD_PANEL}`}>
          <div className={MD_HEAD}>
            <h2 className={MD_H2}>{MANAGER_NAV.submit} {t('managerDashboard.submitNewPersonalForm')}</h2>
            <small className={MD_SUB}>{t('managerDashboard.thisIsForYourOwnPersonalRequestsVacationSickLeaveEtc')}</small>
          </div>
          <div className="form-container mt-4">
            <FormSubmission onFormSubmitted={handleFormSubmitted} />
          </div>
        </div>
      )}

      {/* My Forms Preview */}
      {showMyForms && (
        <div ref={managerMyFormsRef} className={`section manager-forms-view-section dashboard-section-anchor ${MD_PANEL}`}>
          <div className={MD_HEAD}>
            <h2 className={MD_H2}>{MANAGER_NAV.myForms} {t('managerDashboard.mySubmittedForms')}</h2>
            <small className={MD_SUB}>{t('managerDashboard.yourPersonalFormSubmissionsAndTheirStatus')}</small>
          </div>
          {myForms.length > 0 ? (
            <div className="my-forms-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {myForms.map(form => (
                <div key={form._id} className={`my-form-card manager-own-form ${MD_FORM_CARD}`}>
                  <div className="form-header flex justify-between items-start gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="!text-slate-900 dark:!text-white font-semibold m-0 text-base">
                      {form.type === 'vacation' ? 'ANNUAL VACATION' :
                       form.type.toUpperCase()}
                    </h4>
                    {getStatusBadge(form.status)}
                  </div>
                  
                  <div className="form-details text-sm !text-slate-700 dark:!text-slate-300 space-y-1">
                    <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                    
                    {form.type === 'vacation' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                        <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate, form.isHalfDay)} {t('days')}</p>
                        {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                      </>
                    )}
                    
                    {form.type === 'excuse' && (
                      <>
                        <p><strong>Excuse Type:</strong>{' '}
                          <span className={isPaidExcuse(form) ? '!text-emerald-600 dark:!text-emerald-400 font-semibold' : '!text-amber-600 dark:!text-amber-400 font-semibold'}>
                            {isPaidExcuse(form) ? 'Paid' : 'Unpaid'}
                          </span>
                        </p>
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
                        <p><strong>{t('forms.requestedOtHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                        {form.approvedHours != null && (
                          <p><strong>{t('forms.approvedOtHours')}:</strong> <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} {t('forms.hours')}</span></p>
                        )}
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
                        <p><strong>{t('forms.missionDestination')}:</strong> {form.missionDestination}</p>
                      </>
                    )}
                    
                    <p><strong>{t('reason')}:</strong> {form.reason?.substring(0, 80)}...</p>
                    
                    {form.managerApprovedBy && (
                      <div className="comment-section manager-action-section">
                        <strong>
                          {form.status === 'manager_rejected' ? t('rejectedByManager') : t('approvedByManager')}:
                        </strong>
                        <p className={approvalActorClass(form.status === 'manager_rejected')}>
                          {form.managerApprovedBy.name}
                          {form.managerApprovedAt && (
                            <span className="text-sm font-normal !text-slate-500 dark:!text-slate-400 ml-1">
                              {t('on')} {new Date(form.managerApprovedAt).toLocaleDateString()}
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
                          {form.status === 'rejected'
                            ? t('managerDashboard.hrRejectedByHR')
                            : t('managerDashboard.hrApprovedByHR')}:
                        </strong>
                        <p className={approvalActorClass(form.status === 'rejected')}>
                          {form.adminApprovedBy.name}
                          {form.adminApprovedAt && (
                            <span className="text-sm font-normal !text-slate-500 dark:!text-slate-400 ml-1">
                              {t('managerDashboard.on')} {new Date(form.adminApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {form.adminComment && (
                      <div className="comment-section">
                        <strong>
                          {form.adminApprovedBy
                            ? t('managerDashboard.hrCommentWithName', { name: form.adminApprovedBy.name })
                            : t('managerDashboard.hrComment')}:
                        </strong>
                        <p>{form.adminComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-content text-center py-10 !text-slate-500 dark:!text-slate-400">
              <span className="no-content-icon text-4xl block mb-3">{MANAGER_NAV.myForms}</span>
              <p className="!text-slate-900 dark:!text-white m-0 mb-1">{t('managerDashboard.noPersonalFormsSubmittedYet')}</p>
              <small className="text-sm italic">{t('managerDashboard.theseAreYourOwnFormsVacationSickLeaveEtc')}</small>
            </div>
          )}
        </div>
      )}

      {/* Team Members Forms */}
      {showTeamForms && (
        <div ref={managerTeamFormsRef} className={`section team-management-section dashboard-section-anchor ${MD_PANEL}`}>
          <div className={MD_HEAD}>
            <h2 className={MD_H2}>{t('managerDashboard.myTeamMembersForms')}</h2>
            <small className={MD_SUB}>{t('managerDashboard.allFormsSubmittedByYourTeamMembersFromManagedDepartments')}</small>
          </div>
          {teamForms.length > 0 ? (
            <div className="my-forms-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teamForms.map(form => (
                <div key={form._id} className={`my-form-card team-request-card ${MD_FORM_CARD}`}>
                  <div className="form-header flex justify-between items-start gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="!text-slate-900 dark:!text-white font-semibold m-0 text-base">
                      {form.user.name} - {form.type === 'vacation' ? 'ANNUAL VACATION' :
                                          form.type.toUpperCase()}
                    </h4>
                    {getStatusBadge(form.status)}
                  </div>
                  
                  <div className="form-details text-sm !text-slate-700 dark:!text-slate-300 space-y-1">
                    <p><strong>{t('employee')}:</strong> {form.user.name}</p>
                    <p><strong>{t('department')}:</strong> {form.user.department}</p>
                    <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                    
                    {form.type === 'vacation' && (
                      <>
                        <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                        <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate, form.isHalfDay)} {t('days')}</p>
                        {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                      </>
                    )}
                    
                    {form.type === 'excuse' && (
                      <>
                        <p><strong>Excuse Type:</strong>{' '}
                          <span className={isPaidExcuse(form) ? '!text-emerald-600 dark:!text-emerald-400 font-semibold' : '!text-amber-600 dark:!text-amber-400 font-semibold'}>
                            {isPaidExcuse(form) ? 'Paid' : 'Unpaid'}
                          </span>
                        </p>
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
                        <p><strong>{t('forms.requestedOtHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                        {form.approvedHours != null && (
                          <p><strong>{t('forms.approvedOtHours')}:</strong> <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} {t('forms.hours')}</span></p>
                        )}
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
                        <p><strong>{t('forms.missionDestination')}:</strong> {form.missionDestination}</p>
                      </>
                    )}
                    
                    <p><strong>{t('reason')}:</strong> {form.reason?.substring(0, 80)}...</p>
                    
                    {form.managerApprovedBy && (
                      <div className="comment-section manager-action-section">
                        <strong>
                          {form.status === 'manager_rejected' ? t('rejectedByManager') : t('approvedByManager')}:
                        </strong>
                        <p className={approvalActorClass(form.status === 'manager_rejected')}>
                          {form.managerApprovedBy.name}
                          {form.managerApprovedAt && (
                            <span className="text-sm font-normal !text-slate-500 dark:!text-slate-400 ml-1">
                              {t('on')} {new Date(form.managerApprovedAt).toLocaleDateString()}
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
                          {form.status === 'rejected'
                            ? t('managerDashboard.hrRejectedByHR')
                            : t('managerDashboard.hrApprovedByHR')}:
                        </strong>
                        <p className={approvalActorClass(form.status === 'rejected')}>
                          {form.adminApprovedBy.name}
                          {form.adminApprovedAt && (
                            <span className="text-sm font-normal !text-slate-500 dark:!text-slate-400 ml-1">
                              {t('managerDashboard.on')} {new Date(form.adminApprovedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {form.adminComment && (
                      <div className="comment-section">
                        <strong>
                          {form.adminApprovedBy
                            ? t('managerDashboard.hrCommentWithName', { name: form.adminApprovedBy.name })
                            : t('managerDashboard.hrComment')}:
                        </strong>
                        <p>{form.adminComment}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <button type="button" onClick={() => openEditFormModal(form)} className={MD_BTN_EDIT}>
                      {t('edit') || 'Edit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-content text-center py-10 !text-slate-500 dark:!text-slate-400">
              <span className="no-content-icon text-4xl block mb-3">{MANAGER_NAV.teamForms}</span>
              <p className="!text-slate-900 dark:!text-white m-0 mb-1">{t('managerDashboard.noFormsFoundFromYourTeamMembers')}</p>
              <small className="text-sm italic">{t('managerDashboard.yourTeamMembersHaventSubmittedAnyFormsYetOrYouDontHaveAnyManagedDepartmentsAssigned')}</small>
            </div>
          )}
        </div>
      )}

      {/* Team Members */}
      <div className={`section team-management-section ${MD_PANEL}`}>
        <div className={MD_HEAD}>
          <h2 className={MD_H2}>{t('managerDashboard.myTeamMembers')}</h2>
          <small className={MD_SUB}>
            {t('managerDashboard.employeesFromYourManagedDepartments', {
              departments: effectiveDeptList.length ? effectiveDeptList.join(', ') : t('managerDashboard.noDepartmentsAssigned')
            })}
          </small>
        </div>
        {teamMembers.length > 0 ? (
          <div className="team-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamMembers.map(member => {
              const memberFlags = getEmployeeFlags(member._id);
              return (
                <div key={member._id} className={`team-card team-member-card ${MD_TEAM_CARD}`}>
                  <div
                    className="member-avatar w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center !text-indigo-700 dark:!text-indigo-300 font-bold text-lg"
                    aria-hidden
                  >
                    {memberInitial(member.name)}
                  </div>
                  <h4 className="!text-slate-900 dark:!text-white font-semibold m-0 mb-1">{member.name}</h4>
                  <p className="member-department !text-slate-500 dark:!text-slate-400 text-sm m-0 mb-2">{member.department}</p>
                  <span className="vacation-days team-stat inline-block bg-indigo-50 dark:bg-indigo-900/30 !text-indigo-700 dark:!text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {Number(member.vacationDaysLeft).toFixed(1)} {t('daysLeft')}
                  </span>
                  
                  {/* Display existing flags */}
                  {memberFlags.length > 0 && (
                    <div className="member-flags">
                      {memberFlags.map(flag => (
                        <div 
                          key={flag._id} 
                          className={`flag-badge ${flag.type === 'deduction' ? 'flag-deduction' : 'flag-reward'}`}
                          title={`${flag.reason} - ${new Date(flag.createdAt).toLocaleDateString()}`}
                        >
                          {flag.type === 'deduction' ? t('flags.deduction') : t('flags.reward')}
                          <button 
                            className="flag-remove-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveFlag(flag._id); }}
                            title={t('flags.removeFlag')}
                          >{'\u00D7'}</button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Flag Employee Button */}
                  <button
                    type="button"
                    className="btn-flag-employee mt-3 w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 !text-slate-700 dark:!text-white rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 cursor-pointer"
                    onClick={() => openFlagModal(member)}
                    title={t('flags.flagEmployee')}
                  >
                    {t('flags.flagEmployee') || 'Flag Employee'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-content text-center py-10 !text-slate-500 dark:!text-slate-400">
            <span className="no-content-icon text-4xl block mb-3">{MISC.users}</span>
            <p className="!text-slate-900 dark:!text-white m-0">{t('managerDashboard.noTeamMembersFoundInYourManagedDepartments')}</p>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      <div ref={pendingApprovalsRef} className={`section team-requests-section dashboard-section-anchor ${MD_PANEL}`}>
        <div className={MD_HEAD_ROW}>
          <div className="md-section-head-main flex-1 min-w-[200px]">
            <h2 className={MD_H2}>
              {t('managerDashboard.pendingTeamRequests')}
              {refreshingPending ? ` (${t('managerDashboard.refreshing')})` : ''}
            </h2>
            <small className={MD_SUB}>
              {t('managerDashboard.employeeRequestsAwaitingYourApprovalFromManagedDepartments')}
            </small>
          </div>
          <button
            type="button"
            className={MD_BTN_REFRESH}
            onClick={() => fetchPendingForms()}
            title={t('managerDashboard.refreshPendingRequests')}
            disabled={refreshingPending}
          >
            {refreshingPending ? t('managerDashboard.refreshing') : t('managerDashboard.refresh')}
          </button>
        </div>
        {pendingForms.length > 0 ? (
          <div className="requests-list">
            {pendingForms.map(form => (
              <div key={form._id} className={`request-card team-request-card ${MD_PENDING_CARD}`}>
                <div className="request-info flex-1 min-w-0">
                  <h4 className="!text-slate-900 dark:!text-white font-semibold m-0 mb-2 text-base">
                    {form.user.name} - {form.type === 'vacation' ? 'ANNUAL VACATION' :
                                        form.type.toUpperCase()}
                  </h4>
                  <div className="text-sm !text-slate-700 dark:!text-slate-300 space-y-1">
                  <p className="m-0"><strong className="!text-slate-900 dark:!text-white">{t('department')}:</strong> {form.user.department}</p>
                  
                  {/* Display different information based on form type */}
                  {form.type === 'vacation' && (
                    <>
                      <p><strong>{t('dates')}:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                      <p><strong>{t('duration')}:</strong> {calculateDays(form.startDate, form.endDate, form.isHalfDay)} {t('days')}</p>
                      {form.vacationType && <p><strong>{t('type')}:</strong> {form.vacationType}</p>}
                    </>
                  )}
                  
                  {form.type === 'excuse' && (
                    <>
                      <p><strong>Excuse Type:</strong>{' '}
                        <span className={isPaidExcuse(form) ? '!text-emerald-600 dark:!text-emerald-400 font-semibold' : '!text-amber-600 dark:!text-amber-400 font-semibold'}>
                          {isPaidExcuse(form) ? 'Paid' : 'Unpaid'}
                        </span>
                      </p>
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
                      <p><strong>{t('forms.requestedOtHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{form.extraHoursWorked} {t('forms.hours')}</span></p>
                      {form.approvedHours != null && (
                        <p><strong>{t('forms.approvedOtHours')}:</strong> <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>{form.approvedHours} {t('forms.hours')}</span></p>
                      )}
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
                      <p><strong>{t('forms.missionDestination')}:</strong> {form.missionDestination}</p>
                    </>
                  )}
                  
                  <p className="m-0"><strong className="!text-slate-900 dark:!text-white">{t('reason')}:</strong> {form.reason}</p>
                  <p className="m-0"><strong className="!text-slate-900 dark:!text-white">{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                  </div>
                </div>
                <div className="request-actions flex flex-col gap-2 shrink-0 md:min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => openEditFormModal(form)}
                    className={MD_BTN_EDIT}
                    title={t('edit') || 'Edit form'}
                  >
                    {t('edit') || 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openCommentModal(form, 'approve')}
                    className={MD_BTN_APPROVE}
                    title={`${t('managerDashboard.approve')} ${form.type} ${t('forms.from')} ${form.user.name}`}
                    disabled={processingForms.has(form._id)}
                  >
                    {processingForms.has(form._id) ? t('managerDashboard.processing') : t('managerDashboard.approve')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openCommentModal(form, 'reject')}
                    className={MD_BTN_REJECT}
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
          <div className="no-content text-center py-10 !text-slate-500 dark:!text-slate-400">
            <span className="no-content-icon text-4xl block mb-3">{ACTION.processing}</span>
            <p className="!text-slate-900 dark:!text-white m-0 mb-1">{t('managerDashboard.noPendingRequestsFromYourTeam')}</p>
            <small className="text-sm italic">{t('managerDashboard.allCaughtUpYourTeamHaventSubmittedAnyRequestsNeedingApproval')}</small>
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
              <button type="button" className="close-btn" onClick={closeCommentModal}>{'\u00D7'}</button>
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
                      <p><strong>{t('dates')}:</strong> {formatDate(selectedForm.startDate)}{selectedForm.isHalfDay ? '' : ` - ${formatDate(selectedForm.endDate)}`}{selectedForm.isHalfDay ? ` (${t('forms.halfDay')})` : ''}</p>
                      <p><strong>{t('duration')}:</strong> {calculateDays(selectedForm.startDate, selectedForm.endDate, selectedForm.isHalfDay)} {t('days')}</p>
                      {selectedForm.vacationType && <p><strong>{t('type')}:</strong> {selectedForm.vacationType}</p>}
                    </>
                  )}
                  
                  {selectedForm.type === 'excuse' && (
                    <>
                      <p><strong>{t('excuseType') || 'Excuse Type'}:</strong>{' '}
                        <span style={{ color: isPaidExcuse(selectedForm) ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>
                          {isPaidExcuse(selectedForm) ? 'Paid' : 'Unpaid'}
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
                      <p><strong>{t('forms.requestedOtHours')}:</strong> <span style={{ color: '#E65100', fontWeight: 'bold' }}>{selectedForm.extraHoursWorked} {t('forms.hours')}</span></p>
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
                  <div className="edit-before-submit-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(201, 162, 39, 0.1)', borderRadius: '8px', border: '1px solid rgba(201, 162, 39, 0.3)' }}>
                    <strong className="block mb-3 !text-slate-900 dark:!text-white">{t('edit') || 'Edit'} form before {actionType === 'approve' ? (t('approve') || 'approving') : (t('reject') || 'rejecting')}</strong>
                    <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label-elegant">{t('reason')}{fieldDirty('reason') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                      <textarea value={formEditData.reason || ''} onChange={(e) => setFormEditData({ ...formEditData, reason: e.target.value })} rows={2} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('reason') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                    </div>
                    {formEditData.type === 'vacation' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!formEditData.isHalfDay}
                              onChange={(e) => updateVacationEdit({ isHalfDay: e.target.checked, endDate: e.target.checked ? formEditData.startDate : formEditData.endDate })}
                            />
                            <span>{t('forms.halfDay')}</span>
                          </label>
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{formEditData.isHalfDay ? t('forms.date') : t('forms.startDate')}</label>
                          <input type="date" value={formEditData.startDate || ''} onChange={(e) => updateVacationEdit({ startDate: e.target.value, ...(formEditData.isHalfDay ? { endDate: e.target.value } : {}) })} className="form-input-elegant" style={{ width: '100%' }} />
                        </div>
                        {!formEditData.isHalfDay && (
                          <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                            <label className="form-label-elegant">{t('forms.endDate')}</label>
                            <input type="date" value={formEditData.endDate || ''} onChange={(e) => updateVacationEdit({ endDate: e.target.value })} className="form-input-elegant" style={{ width: '100%' }} />
                          </div>
                        )}
                      </>
                    )}
                    {formEditData.type === 'excuse' && (
                      <>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('excuseDate')}{fieldDirty('excuseDate') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                          <input type="date" value={formEditData.excuseDate || ''} onChange={(e) => setFormEditData({ ...formEditData, excuseDate: e.target.value })} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('excuseDate') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('timePeriod') || 'Time'}{fieldDirty('fromHour') || fieldDirty('toHour') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input type="time" value={formEditData.fromHour || ''} onChange={(e) => setFormEditData({ ...formEditData, fromHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('fromHour') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                            <input type="time" value={formEditData.toHour || ''} onChange={(e) => setFormEditData({ ...formEditData, toHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('toHour') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                          </div>
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('excuseType') || 'Excuse Type'}{fieldDirty('excuseType') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                          <select value={formEditData.excuseType || 'paid'} onChange={(e) => setFormEditData({ ...formEditData, excuseType: e.target.value })} className="form-input-elegant" style={{ width: '100%', boxShadow: fieldDirty('excuseType') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }}>
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
                          <label className="form-label-elegant">{t('forms.requestedOtHours')}</label>
                          <input type="number" value={formEditData.extraHoursWorked ?? ''} readOnly className="form-input-elegant" style={{ width: '100%', background: '#f5f5f5' }} />
                        </div>
                        <div className="form-group-elegant" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label-elegant">{t('forms.approvedOtHours')}</label>
                          <input type="number" value={formEditData.approvedHours ?? ''} onChange={(e) => setFormEditData({ ...formEditData, approvedHours: Number(e.target.value) })} className="form-input-elegant" style={{ width: '100%' }} min="0.5" step="0.5" />
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
              <h3>{t('edit') || 'Edit'} Form</h3>
              <button type="button" className="close-btn" onClick={closeEditFormModal}>{'\u00D7'}</button>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!formEditData.isHalfDay}
                        onChange={(e) => updateVacationEdit({ isHalfDay: e.target.checked, endDate: e.target.checked ? formEditData.startDate : formEditData.endDate })}
                      />
                      <span>{t('forms.halfDay')}</span>
                    </label>
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{formEditData.isHalfDay ? t('forms.date') : t('forms.startDate')}</label>
                    <input type="date" value={formEditData.startDate || ''} onChange={(e) => updateVacationEdit({ startDate: e.target.value, ...(formEditData.isHalfDay ? { endDate: e.target.value } : {}) })} className="form-input-elegant" />
                  </div>
                  {!formEditData.isHalfDay && (
                    <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                      <label className="form-label-elegant">{t('forms.endDate')}</label>
                      <input type="date" value={formEditData.endDate || ''} onChange={(e) => updateVacationEdit({ endDate: e.target.value })} className="form-input-elegant" />
                    </div>
                  )}
                </>
              )}
              {formEditData.type === 'excuse' && (
                <>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('excuseDate')}{fieldDirty('excuseDate') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                    <input type="date" value={formEditData.excuseDate || ''} onChange={(e) => setFormEditData({ ...formEditData, excuseDate: e.target.value })} className="form-input-elegant" style={{ boxShadow: fieldDirty('excuseDate') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('timePeriod') || 'Time'}{fieldDirty('fromHour') || fieldDirty('toHour') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input type="time" value={formEditData.fromHour || ''} onChange={(e) => setFormEditData({ ...formEditData, fromHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('fromHour') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                      <input type="time" value={formEditData.toHour || ''} onChange={(e) => setFormEditData({ ...formEditData, toHour: e.target.value })} className="form-input-elegant" style={{ flex: 1, minWidth: '120px', boxShadow: fieldDirty('toHour') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }} />
                    </div>
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('excuseType') || 'Excuse Type'}{fieldDirty('excuseType') ? ' Â· ' + (t('modified') || 'Modified') : ''}</label>
                    <select value={formEditData.excuseType || 'paid'} onChange={(e) => setFormEditData({ ...formEditData, excuseType: e.target.value })} className="form-input-elegant" style={{ boxShadow: fieldDirty('excuseType') ? '0 0 0 2px rgba(201, 162, 39, 0.6)' : undefined }}>
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
                    <label className="form-label-elegant">{t('forms.requestedOtHours')}</label>
                    <input type="number" value={formEditData.extraHoursWorked || 0} readOnly className="form-input-elegant" style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
                    <label className="form-label-elegant">{t('forms.approvedOtHours')}</label>
                    <input type="number" value={formEditData.approvedHours || 0} onChange={(e) => setFormEditData({ ...formEditData, approvedHours: Number(e.target.value) })} className="form-input-elegant" min="0.5" step="0.5" />
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
              <h3>{t('flags.flagEmployee') || 'Flag Employee'}</h3>
              <button type="button" className="close-btn" onClick={closeFlagModal}>{'\u00D7'}</button>
            </div>
            
            <div className="modal-body">
              <div className="employee-summary">
                <div
                  className="employee-avatar w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center !text-indigo-700 dark:!text-indigo-300 font-bold text-lg"
                  aria-hidden
                >
                  {memberInitial(selectedEmployee?.name)}
                </div>
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
                    {t('flags.deduction') || 'Deduction'}
                  </button>
                  <button 
                    className={`flag-type-btn ${flagType === 'reward' ? 'active reward' : ''}`}
                    onClick={() => setFlagType('reward')}
                  >
                    {t('flags.reward') || 'Reward'}
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

      </div>

    </div>
  );
};

export default ManagerDashboard; 
