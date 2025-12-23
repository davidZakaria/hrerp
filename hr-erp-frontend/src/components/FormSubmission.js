import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/njd-logo.png';

const FormSubmission = ({ onFormSubmitted }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    type: 'vacation',
    vacationType: 'annual', // Default to annual (unpaid vacation removed)
    startDate: '',
    endDate: '',
    excuseDate: '',
    excuseType: 'paid',
    sickLeaveStartDate: '',
    sickLeaveEndDate: '',
    medicalDocument: null,
    reason: '',
    fromHour: '',
    toHour: '',
    wfhDescription: '',
    wfhHours: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [excuseRequestsLeft, setExcuseRequestsLeft] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Fetch user info
  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:5001/api/auth/me', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUserInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  // Fetch excuse requests left
  const fetchExcuseRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:5001/api/forms/excuse-hours', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseRequestsLeft(data.excuseRequestsLeft);
      }
    } catch (err) {
      console.error('Failed to fetch excuse requests:', err);
    }
  };

  // Load user info and excuse requests when component mounts
  useEffect(() => {
    fetchUserInfo();
    fetchExcuseRequests();
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVacationTypeChange = e => {
    setForm({ ...form, vacationType: e.target.value });
  };

  const handleFileChange = e => {
    setForm({ ...form, medicalDocument: e.target.files[0] });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('forms.mustBeLoggedIn'));
      setLoading(false);
      return;
    }

    let payload;
    let isFileUpload = false;

    if (form.type === 'vacation') {
      payload = {
        type: 'vacation',
        vacationType: form.vacationType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason
      };
    } else if (form.type === 'excuse') {
      // Calculate hours requested
      const fromTime = new Date(`2000-01-01T${form.fromHour}`);
      const toTime = new Date(`2000-01-01T${form.toHour}`);
      const hoursRequested = (toTime - fromTime) / (1000 * 60 * 60);
      
      // For paid excuse requests, validate exactly 2 hours
      if (form.excuseType === 'paid') {
        if (hoursRequested !== 2) {
          setMessage(`Paid excuse requests must be exactly 2 hours. You requested ${hoursRequested.toFixed(1)} hours.`);
          setLoading(false);
          return;
        }
        
        // Check if user has requests left
        if (excuseRequestsLeft !== null && excuseRequestsLeft <= 0) {
          setMessage('You have exhausted your 2 paid excuse requests for this month. Please submit an unpaid excuse request instead.');
          setLoading(false);
          return;
        }
      }
      
      payload = {
        type: 'excuse',
        excuseDate: form.excuseDate,
        excuseType: form.excuseType,
        fromHour: form.fromHour,
        toHour: form.toHour,
        reason: form.reason
      };
    } else if (form.type === 'sick_leave') {
      // Use FormData for file upload
      payload = new FormData();
      payload.append('type', 'sick_leave');
      payload.append('sickLeaveStartDate', form.sickLeaveStartDate);
      payload.append('sickLeaveEndDate', form.sickLeaveEndDate);
      payload.append('reason', form.reason);
      if (form.medicalDocument) {
        payload.append('medicalDocument', form.medicalDocument);
      }
      isFileUpload = true;
    } else {
      payload = {
        type: 'wfh',
        wfhDescription: form.wfhDescription,
        wfhHours: parseInt(form.wfhHours),
        reason: form.reason
      };
    }

    try {
      const headers = {
        'x-auth-token': token
      };
      
      // Don't set Content-Type for FormData, let browser set it
      if (!isFileUpload) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(payload);
      }

      const res = await fetch('http://localhost:5001/api/forms', {
        method: 'POST',
        headers: headers,
        body: payload
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(t('forms.formSubmittedSuccessfully'));
        setForm({ 
          type: 'vacation', 
          vacationType: '', 
          startDate: '', 
          endDate: '', 
          excuseDate: '', 
          excuseType: 'paid',
          sickLeaveStartDate: '', 
          sickLeaveEndDate: '', 
          medicalDocument: null, 
          reason: '', 
          fromHour: '', 
          toHour: '', 
          wfhDescription: '', 
          wfhHours: '' 
        });
        fetchExcuseRequests(); // Refresh excuse requests after submission
        if (onFormSubmitted) onFormSubmitted();
      } else {
        // Provide specific error messages for common issues
        let errorMessage = data.msg || t('messages.errorOccurred');
        if (errorMessage.includes('File too large')) {
          errorMessage = t('forms.fileTooLarge');
        } else if (errorMessage.includes('Invalid file type')) {
          errorMessage = t('forms.invalidFileType');
        }
        setMessage(errorMessage);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setMessage(t('forms.errorConnectingServer'));
    }
    setLoading(false);
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src={logo} alt="NJD Logo" className="app-logo" style={{ width: '80px', marginBottom: '1rem' }} />
        <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {t('login.title')}
        </h2>
                 <div style={{ 
           background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(129, 199, 132, 0.2))',
           border: '1px solid rgba(76, 175, 80, 0.3)',
           borderRadius: '12px',
           padding: '1rem',
           marginBottom: '1rem'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <span style={{ fontSize: '1.2rem' }}>👤</span>
             <h3 style={{ margin: 0, color: '#4caf50', fontSize: '1.1rem' }}>
               {userInfo?.role === 'manager' ? t('forms.managerPersonalLeaveRequest') : 
                userInfo?.role === 'admin' ? t('forms.adminPersonalLeaveRequest') :
                t('forms.personalLeaveRequest')}
             </h3>
           </div>
           {userInfo && (
             <div style={{ marginBottom: '0.5rem' }}>
               <span style={{ fontSize: '0.8rem', color: '#4caf50', fontWeight: 'bold' }}>
                 👋 {t('forms.hello')}, {userInfo.name}
               </span>
               {(userInfo.role === 'manager' || userInfo.role === 'admin') && (
                 <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '0.5rem' }}>
                   ({userInfo.role === 'manager' ? t('dashboard.manager') : t('dashboard.admin')})
                 </span>
               )}
             </div>
           )}
           <p className="text-elegant" style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0 }}>
             {t('forms.submitPersonalRequests')}
           </p>
           <small style={{ fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
             {userInfo?.role === 'manager' ? 
               t('forms.managerPersonalNote') :
               userInfo?.role === 'admin' ?
               t('forms.adminPersonalNote') :
               t('forms.employeePersonalNote')
             }
           </small>
         </div>
      </div>

      {form.type === 'excuse' && excuseRequestsLeft !== null && (
        <div className="elegant-card" style={{ marginBottom: '1rem', textAlign: 'center', backgroundColor: excuseRequestsLeft > 0 ? 'rgba(100, 181, 246, 0.1)' : 'rgba(255, 152, 0, 0.1)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: excuseRequestsLeft > 0 ? '#64b5f6' : '#ff9800' }}>
            ⏰ Paid Excuse Requests This Month
          </h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>
            {excuseRequestsLeft} / 2 {t('forms.requestsRemaining')}
          </div>
          <small style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', marginTop: '0.5rem' }}>
            {excuseRequestsLeft > 0 ? 'Each paid request is exactly 2 hours' : 'You can still submit unpaid excuse requests'}
          </small>
        </div>
      )}

      <form className="form-elegant" onSubmit={handleSubmit}>
        <div className="form-group-elegant">
          <label className="form-label-elegant">
            <span className="label-icon">📋</span>
            {t('forms.requestType')}
          </label>
          <select 
            name="type" 
            value={form.type} 
            onChange={handleChange} 
            className="form-input-elegant"
            required
            style={{ 
              background: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid rgba(76, 175, 80, 0.3)',
              fontWeight: '500',
              padding: '12px 16px',
              fontSize: '1rem',
              color: '#ffffff',
              borderRadius: '8px',
              minHeight: '50px',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '20px',
              paddingRight: '50px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <option value="vacation">🏖️ {t('forms.vacationRequestOption')}</option>
            <option value="excuse">⏰ {t('forms.excuseRequestOption')}</option>
            {userInfo?.department === 'Marketing' && (
              <option value="wfh">🏠 {t('forms.wfhRequestOption')}</option>
            )}
            <option value="sick_leave">🏥 {t('forms.sickLeaveRequestOption')}</option>
          </select>
          <small className="input-helper" style={{ marginTop: '0.5rem', display: 'block' }}>
            {form.type === 'vacation' && t('forms.vacationRequestHelp')}
            {form.type === 'excuse' && t('forms.excuseRequestHelp')}
            {form.type === 'wfh' && t('forms.wfhRequestHelp')}
            {form.type === 'sick_leave' && t('forms.sickLeaveRequestHelp')}
          </small>
        </div>

        {/* Vacation type removed - all vacation requests are Annual Leave */}
        {form.type === 'vacation' && (
          <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              borderLeft: '4px solid #4caf50', 
              borderRadius: '4px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🏖️</span>
                <span style={{ fontWeight: 'bold', color: '#4caf50' }}>Annual Vacation Leave</span>
              </div>
              <small style={{ display: 'block', marginTop: '0.5rem', opacity: 0.8 }}>
                {t('forms.annualLeaveHelp') || 'Deducted from your annual vacation days balance'}
              </small>
            </div>
          </div>
        )}

        {form.type === 'vacation' ? (
          <div className="date-selection-section">
            <h4 className="form-section-title">📅 {t('forms.selectVacationDates')}</h4>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.startDate')}
                </label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={new Date().toISOString().split('T')[0]}
                  required 
                  title={t('forms.selectFirstDayVacation')}
                />
                <small className="input-helper">{t('forms.selectFirstDayVacation')}</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.endDate')}
                </label>
                <input 
                  name="endDate" 
                  type="date" 
                  value={form.endDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  required 
                  title={t('forms.selectLastDayVacation')}
                />
                <small className="input-helper">{t('forms.selectLastDayVacation')}</small>
              </div>
            </div>
            {form.startDate && form.endDate && (
              <div className="date-summary">
                <div className="summary-card">
                  <h5>📊 {t('forms.vacationSummary')}</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.from')}:</span>
                      <span className="summary-value">{new Date(form.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.to')}:</span>
                      <span className="summary-value">{new Date(form.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">{t('forms.totalDays')}:</span>
                      <span className="summary-value">{Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1} {t('forms.days')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'excuse' ? (
          <div className="time-selection-section">
            <h4 className="form-section-title">🕐 {t('forms.selectExcuseDetails')}</h4>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">💳 Excuse Type</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                {/* Paid Excuse Option - always available if requests remain */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: excuseRequestsLeft > 0 ? 'pointer' : 'not-allowed', 
                  flex: 1, 
                  padding: '0.75rem', 
                  border: form.excuseType === 'paid' ? '2px solid #4caf50' : '2px solid rgba(255,255,255,0.2)', 
                  borderRadius: '8px', 
                  backgroundColor: form.excuseType === 'paid' ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                  opacity: excuseRequestsLeft > 0 ? 1 : 0.5
                }}>
                  <input 
                    type="radio" 
                    name="excuseType" 
                    value="paid" 
                    checked={form.excuseType === 'paid'} 
                    onChange={handleChange}
                    disabled={excuseRequestsLeft <= 0}
                    required 
                  />
                  <div>
                    <span className="text-elegant" style={{ fontWeight: 'bold' }}>💰 Paid Excuse</span>
                    <small style={{ display: 'block', opacity: 0.7, fontSize: '0.75rem' }}>
                      Exactly 2 hours ({excuseRequestsLeft} of 2 left this month)
                    </small>
                  </div>
                </label>
                
                {/* Unpaid Excuse Option - always available */}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer', 
                  flex: 1, 
                  padding: '0.75rem', 
                  border: form.excuseType === 'unpaid' ? '2px solid #ff9800' : '2px solid rgba(255,255,255,0.2)', 
                  borderRadius: '8px', 
                  backgroundColor: form.excuseType === 'unpaid' ? 'rgba(255, 152, 0, 0.1)' : 'transparent'
                }}>
                  <input 
                    type="radio" 
                    name="excuseType" 
                    value="unpaid" 
                    checked={form.excuseType === 'unpaid'} 
                    onChange={handleChange}
                    required 
                  />
                  <div>
                    <span className="text-elegant" style={{ fontWeight: 'bold' }}>📝 Unpaid Excuse</span>
                    <small style={{ display: 'block', opacity: 0.7, fontSize: '0.75rem' }}>
                      Any duration - deducts 0.5 vacation day
                    </small>
                  </div>
                </label>
              </div>
              <small style={{ display: 'block', color: '#64b5f6', marginTop: '0.5rem', fontStyle: 'italic' }}>
                💡 Choose paid (uses monthly request) or unpaid (deducts half vacation day)
              </small>
              {excuseRequestsLeft <= 0 && (
                <small style={{ display: 'block', color: '#ff9800', marginTop: '0.25rem' }}>
                  ⚠️ No paid excuse requests remaining this month. Use unpaid option to deduct from vacation days.
                </small>
              )}
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📅</span>
                {t('forms.excuseDate')}
              </label>
              <input 
                name="excuseDate" 
                type="date" 
                value={form.excuseDate} 
                onChange={handleChange} 
                className="form-input-elegant date-input"
                max={new Date().toISOString().split('T')[0]}
                required 
                title={t('forms.chooseDateExcuse')}
              />
              <small className="input-helper">{t('forms.chooseDateExcuse')}</small>
            </div>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕐</span>
                  {t('forms.fromTime')}
                </label>
                <input 
                  name="fromHour" 
                  type="time" 
                  value={form.fromHour} 
                  onChange={handleChange} 
                  className="form-input-elegant time-input"
                  required 
                  title={t('forms.selectStartTime')}
                />
                <small className="input-helper">{t('forms.selectStartTime')}</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕐</span>
                  {t('forms.toTime')}
                </label>
                <input 
                  name="toHour" 
                  type="time" 
                  value={form.toHour} 
                  onChange={handleChange} 
                  className="form-input-elegant time-input"
                  required 
                  title={t('forms.mustBeAfterStartTime')}
                />
                <small className="input-helper">{t('forms.mustBeAfterStartTime')}</small>
              </div>
            </div>
            {form.excuseDate && form.fromHour && form.toHour && (
              <div className="time-summary">
                <div className="summary-card">
                  <h5>⏰ {t('forms.excuseSummary')}</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">Type:</span>
                      <span className="summary-value">{form.excuseType === 'paid' ? '💰 Paid' : '📝 Unpaid'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.date')}:</span>
                      <span className="summary-value">{new Date(form.excuseDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.from')}:</span>
                      <span className="summary-value">{new Date(`2000-01-01T${form.fromHour}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.to')}:</span>
                      <span className="summary-value">{new Date(`2000-01-01T${form.toHour}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">{t('forms.duration')}:</span>
                      <span className="summary-value">{((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} {t('forms.hours')}</span>
                    </div>
                  </div>
                  {form.excuseType === 'paid' && ((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)) !== 2 && (
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '6px' }}>
                      <small style={{ color: '#f44336', fontSize: '0.85rem' }}>
                        ⚠️ Paid excuse requests must be exactly 2 hours. Please adjust your time selection.
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'sick_leave' ? (
          <div className="sick-leave-selection-section">
            <h4 className="form-section-title">🏥 {t('forms.sickLeaveDetails')}</h4>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.startDate')}
                </label>
                <input 
                  name="sickLeaveStartDate" 
                  type="date" 
                  value={form.sickLeaveStartDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  required 
                  title={t('forms.selectFirstDaySickLeave')}
                />
                <small className="input-helper">{t('forms.selectFirstDaySickLeave')}</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.endDate')}
                </label>
                <input 
                  name="sickLeaveEndDate" 
                  type="date" 
                  value={form.sickLeaveEndDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={form.sickLeaveStartDate}
                  required 
                  title={t('forms.selectLastDaySickLeave')}
                />
                <small className="input-helper">{t('forms.selectLastDaySickLeave')}</small>
              </div>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📄</span>
                {t('forms.medicalDocumentOptional')}
              </label>
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="form-input-elegant"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                title={t('forms.uploadMedicalCertificate')}
              />
                      <small className="input-helper">
          {t('forms.uploadMedicalCertificate')}
        </small>
            </div>

            {form.sickLeaveStartDate && form.sickLeaveEndDate && (
              <div className="sick-leave-summary">
                <div className="summary-card">
                  <h5>🏥 {t('forms.sickLeaveSummary')}</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.from')}:</span>
                      <span className="summary-value">{new Date(form.sickLeaveStartDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.to')}:</span>
                      <span className="summary-value">{new Date(form.sickLeaveEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">{t('forms.totalDays')}:</span>
                      <span className="summary-value">{Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} {t('forms.days')}</span>
                    </div>
                    {form.medicalDocument && (
                      <div className="summary-item">
                        <span className="summary-label">{t('forms.document')}:</span>
                        <span className="summary-value">📄 {form.medicalDocument.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="wfh-selection-section">
            <h4 className="form-section-title">🏠 {t('forms.workFromHomeDetails')}</h4>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📝</span>
                {t('forms.workDescription')}
              </label>
              <textarea 
                name="wfhDescription" 
                placeholder={t('forms.describeWorkFromHome')} 
                value={form.wfhDescription} 
                onChange={handleChange} 
                className="form-input-elegant"
                rows="3"
                required 
                title={t('forms.provideWorkDetails')}
              />
              <small className="input-helper">{t('forms.provideWorkDetails')}</small>
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">⏱️</span>
                {t('forms.numberOfHours')}
              </label>
              <input 
                name="wfhHours" 
                type="number" 
                value={form.wfhHours} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
                title={t('forms.enterHoursFromHome')}
              />
              <small className="input-helper">{t('forms.enterHoursFromHome')}</small>
            </div>
            {form.wfhHours && (
              <div className="wfh-summary">
                <div className="summary-card">
                  <h5>🏠 {t('forms.workFromHomeSummary')}</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.hours')}:</span>
                      <span className="summary-value">{form.wfhHours} {form.wfhHours != 1 ? t('forms.hours') : t('forms.hours')}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">{t('forms.workType')}:</span>
                      <span className="summary-value">{t('forms.remoteWork')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="form-group-elegant">
          <label className="form-label-elegant">
            <span className="label-icon">✏️</span>
            {t('forms.reasonForRequest')}
          </label>
          <textarea 
            name="reason" 
            placeholder={
              userInfo?.role === 'manager' ? 
                t('forms.managerReasonPlaceholder') :
                t('forms.provideDetailedReason')
            }
            value={form.reason} 
            onChange={handleChange} 
            className="form-input-elegant"
            rows="4"
            required 
            style={{ 
              border: '2px solid rgba(76, 175, 80, 0.3)',
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)'
            }}
          />
          <small className="input-helper">
            {userInfo?.role === 'manager' ? 
              t('forms.managerApprovalHelp') :
              t('forms.helpApprovalProcess')
            }
          </small>
        </div>

        {(userInfo?.role === 'manager' || userInfo?.role === 'admin') && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(30, 136, 229, 0.1))',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>ℹ️</span>
              <strong style={{ color: '#2196f3', fontSize: '0.9rem' }}>
                {userInfo?.role === 'manager' ? t('forms.managerApprovalProcess') : t('forms.adminApprovalProcess')}
              </strong>
            </div>
            <small style={{ fontSize: '0.75rem', opacity: 0.9, lineHeight: '1.4' }}>
              {userInfo?.role === 'manager' ? 
                t('forms.managerApprovalNote') :
                t('forms.adminApprovalNote')
              }
            </small>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-elegant btn-success"
          disabled={loading}
          style={{ 
            width: '100%',
            background: loading ? 'rgba(76, 175, 80, 0.5)' : 'linear-gradient(135deg, #4caf50, #66bb6a)',
            transform: loading ? 'scale(0.98)' : 'scale(1)',
            fontSize: '1rem',
            padding: '0.75rem 2rem',
            fontWeight: 'bold',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(76, 175, 80, 0.3)'
          }}
        >
          {loading ? (
            <>
              <div className="spinner-elegant" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></div>
              ⏳ {t('forms.submittingPersonalRequest')}
            </>
          ) : (
            `🚀 ${userInfo?.role === 'manager' || userInfo?.role === 'admin' ? t('forms.submitPersonalRequest') : t('forms.submitMyRequest')}`
          )}
        </button>
        
        {(userInfo?.role === 'manager' || userInfo?.role === 'admin') && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '1rem',
            fontSize: '0.75rem',
            opacity: 0.7,
            fontStyle: 'italic'
          }}>
            💡 {userInfo?.role === 'manager' ? t('forms.rememberTeamManagement') : t('forms.rememberUserManagement')}
          </div>
        )}
      </form>

      {message && (
        <div 
          className={`notification ${message.includes('successfully') ? 'success' : 'error'}`}
          style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: '1rem' }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default FormSubmission;
