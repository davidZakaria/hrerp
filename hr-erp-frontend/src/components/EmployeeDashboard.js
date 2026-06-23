import React, { useState, useEffect, useRef } from 'react';
import DashboardSectionNav from './layout/DashboardSectionNav';
import { useTranslation } from 'react-i18next';
import FormSubmission from './FormSubmission';
import DashboardAppHeader from './layout/DashboardAppHeader';
import MedicalDocumentViewer from './MedicalDocumentViewer';
import EmployeeOtReport from './EmployeeOtReport';
import EmployeeDashboardHero from './employee/EmployeeDashboardHero';
import LeaveWallet from './employee/LeaveWallet';
import EmployeeQuickActions from './employee/EmployeeQuickActions';
import EmployeeMonthlySnapshot from './employee/EmployeeMonthlySnapshot';
import API_URL from '../config/api';
import { smoothScrollToElement, DEFAULT_SCROLL_OFFSET } from '../utils/smoothScroll';
import { formatVacationDeductionDays } from '../utils/vacationDays';
import { persistProfilePicture } from '../utils/avatarHelpers';

const DEFAULT_QUOTAS = { annual: 15, casual: 6, excuse: 2 };

const EmployeeDashboard = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [quotas, setQuotas] = useState(DEFAULT_QUOTAS);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);
  const [formIntent, setFormIntent] = useState({ type: 'vacation', vacationType: 'annual' });
  const [myFlags, setMyFlags] = useState([]);
  const overviewRef = useRef(null);
  const previewRef = useRef(null);
  const submitRef = useRef(null);
  const otReportRef = useRef(null);
  const [scrollSpySection, setScrollSpySection] = useState('overview');

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        persistProfilePicture(data.profilePicture || '');
      }
    } catch (err) {
      // ignore
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
        setUser((prev) => prev ? {
          ...prev,
          vacationDaysLeft: data.vacationDaysLeft,
          casualDaysLeft: data.casualDaysLeft,
          excuseRequestsLeft: data.excuseRequestsLeft
        } : prev);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleSnapshotLoaded = (data) => {
    if (data?.quotas) {
      setQuotas(data.quotas);
    }
  };

  const fetchMyFlags = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/employee-flags/my-flags`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setMyFlags(data.flags || []);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchVacationDays();
    fetchMyFlags();
  }, []);

  useEffect(() => {
    if (showForm || showPreview) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        intersecting.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = intersecting[0].target.getAttribute('data-nav-section');
        if (id === 'overview' || id === 'ot-report') setScrollSpySection(id);
      },
      { threshold: [0, 0.1, 0.25, 0.45], rootMargin: '-88px 0px -35% 0px' }
    );
    const o = overviewRef.current;
    const a = otReportRef.current;
    if (o) obs.observe(o);
    if (a) obs.observe(a);
    return () => obs.disconnect();
  }, [showForm, showPreview]);

  const fetchForms = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/forms/my-forms`, {
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
    setTimeout(() => smoothScrollToElement(previewRef.current, DEFAULT_SCROLL_OFFSET), 80);
  };

  const handleShowForm = (type = 'vacation', vacationType = 'annual') => {
    setFormIntent({ type, vacationType });
    setShowForm(true);
    setShowPreview(false);
    fetchVacationDays();
    setTimeout(() => smoothScrollToElement(submitRef.current, DEFAULT_SCROLL_OFFSET), 80);
  };

  const handleRequestLeave = () => handleShowForm('vacation', 'annual');
  const handleRequestOvertime = () => handleShowForm('extra_hours', 'annual');

  const goOverview = () => {
    setShowForm(false);
    setShowPreview(false);
    setTimeout(() => smoothScrollToElement(overviewRef.current, DEFAULT_SCROLL_OFFSET), 50);
  };

  const scrollToOtReport = () => {
    smoothScrollToElement(otReportRef.current, DEFAULT_SCROLL_OFFSET);
  };

  const handleFormSubmitted = () => {
    fetchVacationDays();
    fetchUserData();
    setSnapshotRefreshKey((k) => k + 1);
    setShowForm(false);
    setShowPreview(true);
    fetchForms();
  };

  const balances = user ? {
    vacationDaysLeft: user.vacationDaysLeft,
    casualDaysLeft: user.casualDaysLeft,
    excuseRequestsLeft: user.excuseRequestsLeft
  } : null;

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

  const employeeNavActiveId = showForm ? 'submit' : showPreview ? 'preview' : scrollSpySection;

  return (
    <div className="dashboard-container employee-dashboard-v2 fade-in">
      <DashboardAppHeader title={t('dashboard.employee')} />

      <div className="employee-dashboard-stack">
        <EmployeeDashboardHero user={user} onUserUpdate={setUser} />

        {user && (
          <>
            <LeaveWallet balances={balances} quotas={quotas} />
            <EmployeeQuickActions
              onRequestLeave={handleRequestLeave}
              onRequestOvertime={handleRequestOvertime}
              onViewRequests={handlePreview}
            />
          </>
        )}

      {/* Flags Section */}
      {myFlags.length > 0 && (
        <div className="flags-section" style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.3rem', 
            marginBottom: '1rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🚩 {t('flags.myFlags') || 'My Flags'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myFlags.map(flag => (
              <div 
                key={flag._id} 
                className="flag-card"
                style={{
                  background: flag.type === 'deduction' 
                    ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(244, 67, 54, 0.05))' 
                    : 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))',
                  border: flag.type === 'deduction' 
                    ? '2px solid rgba(244, 67, 54, 0.4)' 
                    : '2px solid rgba(76, 175, 80, 0.4)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  borderLeft: flag.type === 'deduction' 
                    ? '5px solid #f44336' 
                    : '5px solid #4caf50'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    background: flag.type === 'deduction' ? '#f44336' : '#4caf50',
                    color: 'white'
                  }}>
                    {flag.type === 'deduction' ? '⚠️' : '⭐'} {flag.type === 'deduction' ? (t('flags.deduction') || 'Deduction') : (t('flags.reward') || 'Reward')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    {new Date(flag.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.5)', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  marginBottom: '0.75rem'
                }}>
                  <p style={{ margin: 0, color: '#333', lineHeight: '1.5' }}>
                    {flag.reason}
                  </p>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <span>{t('flags.flaggedBy') || 'Flagged by'}: </span>
                  <span style={{ fontWeight: '600', color: '#333' }}>
                    👔 {flag.flaggedBy?.name || 'Manager'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Main Content */}
      <div className="main-content employee-dashboard-stack" style={{ paddingTop: 0 }}>
        <DashboardSectionNav
          variant="light"
          role="employee"
          title={t('dashboard.nav.employeeTitle')}
          description={t('dashboard.nav.employeeDesc')}
          badgeLabel={t('dashboard.nav.badgeEmployee')}
          activeId={employeeNavActiveId}
          sections={[
            { id: 'overview', label: t('dashboard.overview', 'Overview'), icon: '🏠', onSelect: goOverview },
            { id: 'preview', label: t('dashboard.previewForms'), icon: '📋', onSelect: handlePreview },
            { id: 'submit', label: t('dashboard.submitNewForm'), icon: '📝', onSelect: () => handleShowForm() },
            { id: 'ot-report', label: t('dashboard.otReport', 'My OT Report'), icon: '⏱️', onSelect: scrollToOtReport }
          ]}
        />

        <div
          ref={overviewRef}
          className="dashboard-section-anchor"
          data-nav-section="overview"
        >
        <EmployeeMonthlySnapshot refreshKey={snapshotRefreshKey} onLoaded={handleSnapshotLoaded} />
        </div>

        {/* Form Submission */}
        {showForm && (
          <div
            ref={submitRef}
            className="dashboard-section-anchor"
            data-nav-section="submit"
          >
            <div className="elegant-card slide-in-left">
              <FormSubmission
                key={`${formIntent.type}-${formIntent.vacationType}`}
                initialType={formIntent.type}
                initialVacationType={formIntent.vacationType}
                onFormSubmitted={handleFormSubmitted}
              />
            </div>
          </div>
        )}
        
        {/* Forms Preview */}
        {showPreview && (
          <div
            ref={previewRef}
            className="dashboard-section-anchor"
            data-nav-section="preview"
          >
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
                            <span className="form-label-elegant">{form.isHalfDay ? t('forms.date') : t('forms.startDate')}:</span>
                            <span className="text-elegant">{new Date(form.startDate).toLocaleDateString()}</span>
                          </div>
                          {!form.isHalfDay && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span className="form-label-elegant">{t('forms.endDate')}:</span>
                              <span className="text-elegant">{new Date(form.endDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.days')}:</span>
                            <span className="text-elegant">
                              {formatVacationDeductionDays(form)} {t('forms.days')}
                              {form.isHalfDay ? ` (${t('forms.halfDay')})` : ''}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'wfh' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.date')}:</span>
                            <span className="text-elegant">{new Date(form.wfhDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.workingOn')}:</span>
                            <span className="text-elegant">{form.wfhWorkingOn?.substring(0, 50) || form.wfhDescription?.substring(0, 50)}...</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'extra_hours' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.extraHoursDate')}:</span>
                            <span className="text-elegant">{new Date(form.extraHoursDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.requestedOtHours')}:</span>
                            <span className="text-elegant" style={{ color: '#E65100', fontWeight: 'bold' }}>
                              ⏱️ {form.extraHoursWorked} {t('forms.hours')}
                            </span>
                          </div>
                          {['manager_approved', 'approved'].includes(form.status) && form.approvedHours != null && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span className="form-label-elegant">{t('forms.approvedOtHours')}:</span>
                              <span className="text-elegant" style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                                ✅ {form.approvedHours} {t('forms.hours')}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.extraHoursDescription')}:</span>
                            <span className="text-elegant">{form.extraHoursDescription?.substring(0, 50)}...</span>
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
                      
                      {form.type === 'mission' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.startDate')}:</span>
                            <span className="text-elegant">{new Date(form.missionStartDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.endDate')}:</span>
                            <span className="text-elegant">{new Date(form.missionEndDate).toLocaleDateString()}</span>
                          </div>
                          {(form.missionFromTime || form.missionToTime) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span className="form-label-elegant">{t('forms.time') || 'Time'}:</span>
                              <span className="text-elegant">{form.missionFromTime || '--'} {t('forms.to')} {form.missionToTime || '--'}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">{t('forms.missionDestination')}:</span>
                            <span className="text-elegant">📍 {form.missionDestination}</span>
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
          </div>
        )}

        {/* Employee OT Report */}
        <div
          ref={otReportRef}
          className="dashboard-section-anchor"
          data-nav-section="ot-report"
        >
          <EmployeeOtReport />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard; 
