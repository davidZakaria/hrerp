import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import FormSubmission from './FormSubmission';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import ATSDashboard from './ATS/ATSDashboard';
import API_URL from '../config/api';
import logger from '../utils/logger';

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
  const [myForms, setMyForms] = useState([]);
  const [teamForms, setTeamForms] = useState([]);
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);
  const [excuseHoursLeft, setExcuseHoursLeft] = useState(null);
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [actionType, setActionType] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [processingForms, setProcessingForms] = useState(new Set());
  const [refreshingPending, setRefreshingPending] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchPendingForms();
    fetchTeamMembers();
    fetchVacationDays();
    fetchExcuseHours();
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
      // First, get basic user info from localStorage
      const userName = localStorage.getItem('userName');
      const managedDepartments = JSON.parse(localStorage.getItem('managedDepartments') || '[]');
      
      if (userName) {
        setUser({
          name: userName,
          managedDepartments: managedDepartments
        });
      } else {
        // If not in localStorage, fetch from API
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { 'x-auth-token': token }
        });
        
        if (response.data) {
          setUser(response.data);
          // Update localStorage for future use
          localStorage.setItem('userName', response.data.name);
          localStorage.setItem('managedDepartments', JSON.stringify(response.data.managedDepartments || []));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to whatever we can get from localStorage
      setUser({
        name: localStorage.getItem('userName') || 'Manager',
        managedDepartments: JSON.parse(localStorage.getItem('managedDepartments') || '[]')
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
        setExcuseHoursLeft(data.excuseHoursLeft);
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
    fetchVacationDays();
    fetchExcuseHours();
  };

  const handleShowMyForms = () => {
    setShowMyForms(true);
    setShowForm(false);
    setShowTeamForms(false);
    setShowATS(false);
    fetchMyForms();
    fetchVacationDays();
    fetchExcuseHours();
  };

  const handleShowTeamForms = () => {
    setShowTeamForms(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowATS(false);
    fetchTeamForms();
  };

  const handleShowATS = () => {
    setShowATS(true);
    setShowForm(false);
    setShowMyForms(false);
    setShowTeamForms(false);
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

  const openCommentModal = (form, action) => {
    setSelectedForm(form);
    setActionType(action);
    setComment('');
    setShowCommentModal(true);
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setSelectedForm(null);
    setActionType('');
    setComment('');
    setSubmitting(false);
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

      const response = await axios.put(`${API_URL}/api/forms/manager/${selectedForm._id}`, {
        action: actionType,
        managerComment: comment.trim()
      }, {
        headers: { 'x-auth-token': token },
        timeout: 30000 // 30 second timeout
      });
      
      // Check if response is successful
      if (response.status === 200) {
        const newStatus = actionType === 'approve' ? 'manager_approved' : 'manager_rejected';
        
        // OPTIMISTIC UPDATE: Immediately remove from pending list
        setPendingForms(prev => prev.filter(form => form._id !== selectedForm._id));
        
        // Update team forms if viewing them
        setTeamForms(prev => 
          prev.map(form => 
            form._id === selectedForm._id 
              ? { 
                  ...form, 
                  status: newStatus,
                  managerApprovedBy: user,
                  managerApprovedAt: new Date().toISOString(),
                  managerComment: comment.trim()
                } 
              : form
          )
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

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-card">
          <h3>{teamMembers.length}</h3>
          <p>{t('managerDashboard.myTeamMembers')}</p>
          <small>{t('managerDashboard.activeEmployeesInManagedDepartments')}</small>
        </div>
        <div className="stat-card">
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
            <h3>{excuseHoursLeft !== null ? excuseHoursLeft : '...'}</h3>
            <p>{t('managerDashboard.excuseHoursLeft')}</p>
            <small>{t('managerDashboard.yourMonthlyAllowanceRemaining')}</small>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons manager-actions">
          <button 
            className="btn-manager submit-btn"
            onClick={handleShowForm}
          >
            <span className="btn-icon">📝</span>
            {t('managerDashboard.submitMyForm')}
          </button>
          <button 
            className="btn-manager view-btn"
            onClick={handleShowMyForms}
          >
            <span className="btn-icon">📋</span>
            {t('managerDashboard.viewMyForms')}
          </button>
          <button 
            className="btn-manager team-forms-btn"
            onClick={handleShowTeamForms}
          >
            <span className="btn-icon">👥</span>
            {t('managerDashboard.myTeamMembersForms')}
          </button>
          <button 
            className="btn-manager ats-btn"
            onClick={handleShowATS}
          >
            <span className="btn-icon">🎯</span>
            {t('managerDashboard.atsSystem') || 'ATS System'}
          </button>
        </div>
      </div>

      {/* ATS System */}
      {showATS && (
        <div className="section manager-ats-section">
          <ATSDashboard />
        </div>
      )}

      {/* Form Submission */}
      {showForm && (
        <div className="section manager-form-section">
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
        <div className="section manager-forms-view-section">
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
                        <p><strong>Excuse Type:</strong> <span style={{ color: form.excuseType === 'paid' ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}</span></p>
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
        <div className="section team-management-section">
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
                        <p><strong>Excuse Type:</strong> <span style={{ color: form.excuseType === 'paid' ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}</span></p>
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
            {teamMembers.map(member => (
              <div key={member._id} className="team-card team-member-card">
                <div className="member-avatar">👤</div>
                <h4>{member.name}</h4>
                <p className="member-department">{member.department}</p>
                <span className="vacation-days team-stat">{Number(member.vacationDaysLeft).toFixed(1)} {t('daysLeft')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-content">
            <span className="no-content-icon">👥</span>
            <p>{t('noTeamMembersFoundInYourManagedDepartments')}</p>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      <div className="section team-requests-section">
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
                      <p><strong>Excuse Type:</strong> <span style={{ color: form.excuseType === 'paid' ? '#4caf50' : '#ff9800', fontWeight: 'bold' }}>{form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}</span></p>
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
                  
                  <p><strong>{t('reason')}:</strong> {form.reason}</p>
                  <p><strong>{t('submitted')}:</strong> {formatDate(form.createdAt)}</p>
                </div>
                <div className="request-actions">
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

        /* Manager Buttons */
        .manager-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 25px;
        }

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

        .btn-manager.submit-btn {
          background: linear-gradient(135deg, #4CAF50, #45a049);
        }

        .btn-manager.submit-btn:hover {
          background: linear-gradient(135deg, #45a049, #3d8b40);
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .btn-manager.view-btn {
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
        }

        .btn-manager.view-btn:hover {
          background: linear-gradient(135deg, #2E7D32, #1B5E20);
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(46, 125, 50, 0.4);
        }

        .btn-manager.team-forms-btn {
          background: linear-gradient(135deg, #2196F3, #1976D2);
        }

        .btn-manager.team-forms-btn:hover {
          background: linear-gradient(135deg, #1976D2, #1565C0);
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
        }

        .btn-icon {
          font-size: 1.1rem;
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

        /* Responsive Design */
        @media (max-width: 768px) {
          .manager-actions {
            flex-direction: column;
            align-items: center;
          }

          .btn-manager {
            width: 100%;
            max-width: 280px;
          }

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
