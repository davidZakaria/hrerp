import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FormSubmission from './FormSubmission';
import LogoutButton from './LogoutButton';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import EmployeeAttendance from './EmployeeAttendance';

const EmployeeDashboard = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);
  const [excuseRequestsLeft, setExcuseRequestsLeft] = useState(null);
  const [nextResetDate, setNextResetDate] = useState(null);
  const [user, setUser] = useState(null);

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/auth/me', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchVacationDays = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/forms/vacation-days', {
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

  const fetchExcuseRequests = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/forms/excuse-hours', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseRequestsLeft(data.excuseRequestsLeft);
        if (data.nextResetDate) {
          setNextResetDate(new Date(data.nextResetDate));
        }
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchVacationDays();
    fetchExcuseRequests();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5001/api/forms/my-forms', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setForms(data);
      } else {
        setError(data.msg || t('messages.errorOccurred'));
      }
    } catch (err) {
      setError(t('login.serverError'));
    }
    setLoading(false);
  };

  const handlePreview = () => {
    setShowPreview(true);
    setShowForm(false);
    fetchForms();
    fetchVacationDays();
    fetchExcuseRequests();
  };

  const handleShowForm = () => {
    setShowForm(true);
    setShowPreview(false);
    fetchVacationDays();
    fetchExcuseRequests();
  };

  const handleFormSubmitted = () => {
    fetchVacationDays();
    fetchExcuseRequests();
    setShowForm(false);
    setShowPreview(true);
    fetchForms();
  };

  const getStatusBadge = (status) => {
    const badgeClass = status === 'pending' ? 'badge-warning' :
                     status === 'manager_approved' ? 'badge-info' :
                     status === 'manager_submitted' ? 'badge-info' :
                     status === 'approved' ? 'badge-success' :
                     status.includes('rejected') ? 'badge-danger' : 'badge-secondary';
    
    const statusText = status === 'manager_approved' ? t('dashboard.managerApproved') :
                      status === 'manager_submitted' ? t('dashboard.awaitingHRApproval') :
                      status === 'manager_rejected' ? t('dashboard.managerRejected') :
                      t(`status.${status}`) || status.charAt(0).toUpperCase() + status.slice(1);
    
    return <span className={`badge-elegant ${badgeClass}`}>{statusText}</span>;
  };

  return (
    <div className="dashboard-container fade-in">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">{t('dashboard.employee')}</h1>
        <LogoutButton />
      </div>

      {/* Welcome Message */}
      {user && (
        <div className="elegant-card hover-lift" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '2rem',
          marginBottom: '2rem',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
        }}>
          <h2 style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem',
            fontWeight: '600',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            👋 Welcome, {user.name}!
          </h2>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '2rem',
            flexWrap: 'wrap',
            marginTop: '1rem'
          }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ opacity: 0.9, fontSize: '0.9rem' }}>🏢 Department</span>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                {user.department}
              </div>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ opacity: 0.9, fontSize: '0.9rem' }}>🆔 Employee Code</span>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                {user.employeeCode || 'Not Assigned'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Vacation Days Card */}
        <div className="elegant-card hover-lift" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            {t('dashboard.vacationDays')}
          </h2>
          <div className="stats-number" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {vacationDaysLeft !== null ? Number(vacationDaysLeft).toFixed(1) : '...'}
          </div>
          <div className="stats-label">{t('dashboard.daysRemaining')}</div>
          <small style={{ fontSize: '0.85rem', opacity: 0.7, display: 'block', marginTop: '0.5rem' }}>
            💡 Unpaid excuse requests deduct 0.5 days
          </small>
        </div>

        {/* Excuse Requests Card */}
        <div className="elegant-card hover-lift" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            ⏰ Paid Excuse Requests
          </h2>
          <div className="stats-number" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: excuseRequestsLeft > 0 ? '#4caf50' : '#ff9800' }}>
            {excuseRequestsLeft !== null ? `${excuseRequestsLeft} / 2` : '...'}
          </div>
          <div className="stats-label">Current Period (Each = 2 hours)</div>
          <small style={{ fontSize: '0.85rem', opacity: 0.7, display: 'block', marginTop: '0.5rem' }}>
            {excuseRequestsLeft > 0 ? 'You can submit paid excuse requests' : 'Submit unpaid excuse requests instead'}
          </small>
          {nextResetDate && (
            <small style={{ fontSize: '0.8rem', opacity: 0.6, display: 'block', marginTop: '0.5rem', color: '#64b5f6' }}>
              🔄 Resets on the 25th of each month
              <br />
              Next reset: {nextResetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </small>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-elegant btn-success"
            onClick={handlePreview}
          >
            {t('dashboard.previewForms')}
          </button>
          <button 
            className="btn-elegant"
            onClick={handleShowForm}
          >
            {t('dashboard.submitNewForm')}
          </button>
        </div>

        {/* Form Submission */}
        {showForm && (
          <div className="elegant-card slide-in-left">
            <FormSubmission onFormSubmitted={handleFormSubmitted} />
          </div>
        )}
        
        {/* Forms Preview */}
        {showPreview && (
          <div className="elegant-card slide-in-right">
            <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>
              {t('dashboard.yourSubmittedForms')}
            </h2>
            
            {loading && <div className="spinner-elegant"></div>}
            
            {error && (
              <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto' }}>
                {error}
              </div>
            )}
            
            {!loading && forms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>{t('dashboard.noFormsSubmitted')}</p>
              </div>
            )}
            
            {forms.length > 0 && (
              <div className="grid-2">
                {forms.map(form => (
                  <div key={form._id} className="glass-card hover-lift">
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">{t('common.type')}:</span>
                        <span className="text-elegant">
                          {form.type === 'vacation' ? 'Annual Vacation' :
                           t(`formTypes.${form.type}`) || form.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">{t('common.status')}:</span>
                        {getStatusBadge(form.status)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">{t('forms.submitted')}:</span>
                        <span className="text-elegant">{new Date(form.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {form.type === 'vacation' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.startDate')}:</span>
                            <span className="text-elegant">{new Date(form.startDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.endDate')}:</span>
                            <span className="text-elegant">{new Date(form.endDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.days')}:</span>
                            <span className="text-elegant">{form.days}</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'excuse' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Excuse Type:</span>
                            <span className="text-elegant" style={{ fontWeight: 'bold', color: form.excuseType === 'paid' ? '#4caf50' : '#ff9800' }}>
                              {form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.excuseDate')}:</span>
                            <span className="text-elegant">{new Date(form.excuseDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.timePeriod')}:</span>
                            <span className="text-elegant">{form.fromHour} - {form.toHour}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.duration')}:</span>
                            <span className="text-elegant">{((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('forms.hours')}</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'wfh' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.workHours')}:</span>
                            <span className="text-elegant">{form.wfhHours} {t('forms.hours')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.description')}:</span>
                            <span className="text-elegant">{form.wfhDescription?.substring(0, 50)}...</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'sick_leave' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.startDate')}:</span>
                            <span className="text-elegant">{new Date(form.sickLeaveStartDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.endDate')}:</span>
                            <span className="text-elegant">{new Date(form.sickLeaveEndDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.duration')}:</span>
                            <span className="text-elegant">{Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('forms.days')}</span>
                          </div>
                          <div style={{ marginTop: '1rem' }}>
                            <MedicalDocumentViewer form={form} userRole="employee" />
                          </div>
                        </>
                      )}
                      
                      {form.reason && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>{t('forms.reason')}:</div>
                          <div className="text-elegant" style={{ 
                            background: 'rgba(255, 255, 255, 0.5)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}>
                            {form.reason}
                          </div>
                        </div>
                      )}
                      
                      {form.managerApprovedBy && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>
                            {t('forms.managerAction')}:
                          </div>
                          <div style={{ 
                            background: form.status === 'manager_rejected' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: form.status === 'manager_rejected' ? '#d32f2f' : '#388e3c'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 'bold' }}>
                                {form.status === 'manager_rejected' ? '❌ ' + t('forms.rejectedBy') : '✅ ' + t('forms.approvedBy')} 👔 {form.managerApprovedBy.name}
                              </span>
                            </div>
                            {form.managerApprovedAt && (
                              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                {new Date(form.managerApprovedAt).toLocaleDateString()} at {new Date(form.managerApprovedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {form.managerComment && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>
                            {t('forms.managerComment')}{form.managerApprovedBy ? ` (${form.managerApprovedBy.name})` : ''}:
                          </div>
                          <div style={{ 
                            background: 'rgba(156, 39, 176, 0.1)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontStyle: 'italic',
                            color: '#7B1FA2'
                          }}>
                            {form.managerComment}
                          </div>
                        </div>
                      )}

                      {form.adminApprovedBy && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>
                            {t('forms.hrAction')}:
                          </div>
                          <div style={{ 
                            background: form.status === 'rejected' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            color: form.status === 'rejected' ? '#d32f2f' : '#388e3c'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 'bold' }}>
                                {form.status === 'rejected' ? '❌ ' + t('forms.rejectedBy') : '✅ ' + t('forms.approvedBy')} 🏢 {form.adminApprovedBy.name}
                              </span>
                            </div>
                            {form.adminApprovedAt && (
                              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                {new Date(form.adminApprovedAt).toLocaleDateString()} at {new Date(form.adminApprovedAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {form.adminComment && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>
                            {form.adminApprovedBy ? `${t('forms.hrComment')} (${form.adminApprovedBy.name})` : t('forms.hrComment')}:
                          </div>
                          <div style={{ 
                            background: 'rgba(52, 152, 219, 0.1)', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontStyle: 'italic',
                            color: '#2980b9'
                          }}>
                            {form.adminComment}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Employee Attendance Section */}
        <EmployeeAttendance />
      </div>
    </div>
  );
};

export default EmployeeDashboard; 
