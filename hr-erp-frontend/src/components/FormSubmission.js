import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/njd-logo.png';
import API_URL from '../config/api';
import logger from '../utils/logger';
import { getSubmissionPeriodBounds } from '../utils/formSubmissionMonthBounds';
import { formatVacationDeductionDays } from '../utils/vacationDays';

const FormSubmission = ({ onFormSubmitted, initialType = 'vacation', initialVacationType = 'annual' }) => {
  const { t } = useTranslation();
  const periodBounds = getSubmissionPeriodBounds();
  const [form, setForm] = useState({
    type: initialType,
    vacationType: initialVacationType, // Default to annual (unpaid vacation removed)
    startDate: '',
    endDate: '',
    isHalfDay: false,
    excuseDate: '',
    excuseType: 'paid',
    sickLeaveStartDate: '',
    sickLeaveEndDate: '',
    medicalDocument: null,
    reason: '',
    fromHour: '',
    toHour: '',
    wfhDescription: '',
    wfhHours: '',
    wfhDate: '',
    wfhWorkingOn: '',
    extraHoursDate: '',
    extraHoursWorked: '',
    extraHoursDescription: '',
    missionStartDate: '',
    missionEndDate: '',
    missionDestination: '',
    missionFromTime: '',
    missionToTime: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Fetch user info
  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUserInfo(data);
      }
    } catch (err) {
      logger.error('Failed to fetch user info:', err);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      type: initialType,
      vacationType: initialVacationType
    }));
  }, [initialType, initialVacationType]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name === 'isHalfDay') {
      setForm(prev => ({
        ...prev,
        isHalfDay: checked,
        endDate: checked && prev.startDate ? prev.startDate : prev.endDate
      }));
      return;
    }
    if (name === 'startDate' && form.isHalfDay) {
      setForm(prev => ({ ...prev, startDate: value, endDate: value }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        endDate: form.isHalfDay ? form.startDate : form.endDate,
        isHalfDay: form.isHalfDay,
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
    } else if (form.type === 'wfh') {
      // WFH form - simplified for Marketing department
      payload = {
        type: 'wfh',
        wfhDate: form.wfhDate,
        wfhWorkingOn: form.wfhWorkingOn,
        reason: form.wfhWorkingOn // Use working on as the reason
      };
    } else if (form.type === 'extra_hours') {
      // Extra Hours form - for Marketing department
      payload = {
        type: 'extra_hours',
        extraHoursDate: form.extraHoursDate,
        extraHoursWorked: form.extraHoursWorked,
        extraHoursDescription: form.extraHoursDescription,
        reason: form.extraHoursDescription // Use description as the reason
      };
    } else if (form.type === 'mission') {
      payload = {
        type: 'mission',
        missionStartDate: form.missionStartDate,
        missionEndDate: form.missionEndDate,
        missionDestination: form.missionDestination.trim(),
        missionFromTime: form.missionFromTime?.trim() || undefined,
        missionToTime: form.missionToTime?.trim() || undefined,
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

      const res = await fetch(`${API_URL}/api/forms`, {
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
          isHalfDay: false,
          excuseDate: '', 
          excuseType: 'paid',
          sickLeaveStartDate: '', 
          sickLeaveEndDate: '', 
          medicalDocument: null, 
          reason: '', 
          fromHour: '', 
          toHour: '', 
          wfhDescription: '', 
          wfhHours: '',
          wfhDate: '',
          wfhWorkingOn: '',
          extraHoursDate: '',
          extraHoursWorked: '',
          extraHoursDescription: '',
          missionStartDate: '',
          missionEndDate: '',
          missionDestination: '',
          missionFromTime: '',
          missionToTime: ''
        });
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
      logger.error('Form submission error:', err);
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
            <option value="mission">✈️ {t('forms.missionRequestOption')}</option>
            <option value="sick_leave">🏥 {t('forms.sickLeaveRequestOption')}</option>
            {userInfo?.department === 'Marketing' && (
              <option value="wfh">🏠 {t('forms.wfhRequestOption')}</option>
            )}
            <option value="extra_hours">⏱️ {t('forms.extraHoursRequestOption')}</option>
          </select>
          <small className="input-helper" style={{ marginTop: '0.5rem', display: 'block' }}>
            {form.type === 'vacation' && t('forms.vacationRequestHelp')}
            {form.type === 'wfh' && t('forms.wfhRequestHelp')}
            {form.type === 'extra_hours' && t('forms.extraHoursRequestHelp')}
            {form.type === 'sick_leave' && t('forms.sickLeaveRequestHelp')}
            {form.type === 'mission' && t('forms.missionRequestHelp')}
          </small>
        </div>

        {/* Vacation type: annual or casual */}
        {form.type === 'vacation' && (
          <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
            <label className="form-label-elegant">
              <span className="label-icon">🏖️</span>
              {t('forms.vacationType')}
            </label>
            {userInfo && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                color: '#90a4ae'
              }}>
                <span>{t('forms.annualBalance')}: <strong style={{ color: '#4caf50' }}>{Number(userInfo.vacationDaysLeft ?? 0).toFixed(1)}</strong></span>
                <span>{t('forms.casualBalance')}: <strong style={{ color: '#64b5f6' }}>{Number(userInfo.casualDaysLeft ?? 0).toFixed(1)}</strong></span>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="vacationType"
                  value="annual"
                  checked={form.vacationType === 'annual'}
                  onChange={handleChange}
                />
                <span>{t('forms.annualLeave')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="vacationType"
                  value="casual"
                  checked={form.vacationType === 'casual'}
                  onChange={handleChange}
                />
                <span>{t('forms.casualLeave')}</span>
              </label>
            </div>
            <small className="input-helper" style={{ display: 'block', marginTop: '0.5rem' }}>
              {form.vacationType === 'casual'
                ? (t('forms.casualLeaveHelp') || 'Deducted from your casual leave balance')
                : (t('forms.annualLeaveHelp') || 'Deducted from your annual vacation days balance')}
            </small>
          </div>
        )}

        {form.type === 'vacation' ? (
          <div className="date-selection-section">
            <h4 className="form-section-title">📅 {t('forms.selectVacationDates')}</h4>
            <div className="form-group-elegant" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  name="isHalfDay"
                  type="checkbox"
                  checked={form.isHalfDay}
                  onChange={handleChange}
                  style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: '#4caf50' }}
                />
                <span>
                  <strong style={{ color: '#4caf50' }}>{t('forms.halfDay')}</strong>
                  <small className="input-helper" style={{ display: 'block', marginTop: '0.25rem' }}>
                    {t('forms.halfDayHelp')}
                  </small>
                </span>
              </label>
            </div>
            <div className={form.isHalfDay ? '' : 'grid-2'}>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {form.isHalfDay ? t('forms.date') : t('forms.startDate')}
                </label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={periodBounds.first}
                  max={periodBounds.last}
                  required 
                  title={form.isHalfDay ? t('forms.selectHalfDayDate') : t('forms.selectFirstDayVacation')}
                />
                <small className="input-helper">
                  {form.isHalfDay ? t('forms.selectHalfDayDate') : t('forms.selectFirstDayVacation')} ({t('forms.submissionMonthRangeHelp')})
                </small>
              </div>
              {!form.isHalfDay && (
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
                    min={form.startDate || periodBounds.first}
                    max={periodBounds.last}
                    required 
                    title={t('forms.selectLastDayVacation')}
                  />
                  <small className="input-helper">{t('forms.selectLastDayVacation')} ({t('forms.submissionMonthRangeHelp')})</small>
                </div>
              )}
            </div>
            {form.startDate && (form.isHalfDay || form.endDate) && (
              <div className="date-summary">
                <div className="summary-card">
                  <h5>📊 {t('forms.vacationSummary')}</h5>
                  <div className="summary-details">
                    {form.isHalfDay ? (
                      <div className="summary-item">
                        <span className="summary-label">{t('forms.date')}:</span>
                        <span className="summary-value">{new Date(form.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    ) : (
                      <>
                        <div className="summary-item">
                          <span className="summary-label">{t('forms.from')}:</span>
                          <span className="summary-value">{new Date(form.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">{t('forms.to')}:</span>
                          <span className="summary-value">{new Date(form.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                      </>
                    )}
                    <div className="summary-item total-days">
                      <span className="summary-label">{t('forms.totalDays')}:</span>
                      <span className="summary-value">
                        {formatVacationDeductionDays(form)} {t('forms.days')}
                        {form.isHalfDay && ` (${t('forms.halfDay')})`}
                      </span>
                    </div>
                  </div>
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
        ) : form.type === 'wfh' ? (
          <div className="wfh-selection-section">
            <h4 className="form-section-title">🏠 {t('forms.workFromHomeRequest')}</h4>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {t('forms.wfhMarketingOnly')}
            </p>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📅</span>
                {t('forms.date')}
              </label>
              <input 
                name="wfhDate" 
                type="date" 
                value={form.wfhDate} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
                title={t('forms.selectWfhDate')}
              />
              <small className="input-helper">{t('forms.selectWfhDate')}</small>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">💼</span>
                {t('forms.workingOn')}
              </label>
              <textarea 
                name="wfhWorkingOn" 
                placeholder={t('forms.wfhWorkingOnPlaceholder')}
                value={form.wfhWorkingOn} 
                onChange={handleChange} 
                className="form-input-elegant"
                rows="3"
                required 
                title={t('forms.describeTasksForDay')}
              />
              <small className="input-helper">{t('forms.describeTasksForDay')}</small>
            </div>
            
            {form.wfhDate && form.wfhWorkingOn && (
              <div className="wfh-summary" style={{ marginTop: '1rem' }}>
                <div className="summary-card" style={{ 
                  background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  border: '1px solid #90CAF9'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#1565C0' }}>🏠 {t('forms.wfhRequestSummary')}</h5>
                  <div style={{ color: '#333' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>{t('forms.date')}:</strong> {new Date(form.wfhDate).toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div>
                      <strong>{t('forms.workingOn')}:</strong> {form.wfhWorkingOn.substring(0, 100)}{form.wfhWorkingOn.length > 100 ? '...' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'extra_hours' ? (
          <div className="extra-hours-selection-section">
            <h4 className="form-section-title">⏱️ {t('forms.overtimeRequest')}</h4>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {t('forms.overtimeRequestHelp')}
            </p>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📅</span>
                {t('forms.date')}
              </label>
              <input 
                name="extraHoursDate" 
                type="date" 
                value={form.extraHoursDate} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
                title={t('forms.selectExtraHoursDate')}
              />
              <small className="input-helper">{t('forms.selectExtraHoursDate')}</small>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">⏰</span>
                {t('forms.numberOfExtraHours')}
              </label>
              <input 
                name="extraHoursWorked" 
                type="number" 
                min="0.5"
                max="12"
                step="0.5"
                value={form.extraHoursWorked} 
                onChange={handleChange} 
                className="form-input-elegant"
                placeholder={t('forms.enterExtraHours')}
                required 
                title={t('forms.enterExtraHours')}
              />
              <small className="input-helper">{t('forms.extraHoursHelper')}</small>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">💼</span>
                {t('forms.workDoneDescription')}
              </label>
              <textarea 
                name="extraHoursDescription" 
                placeholder={t('forms.extraHoursDescriptionPlaceholder')}
                value={form.extraHoursDescription} 
                onChange={handleChange} 
                className="form-input-elegant"
                rows="3"
                required 
                title={t('forms.describeWorkDone')}
              />
              <small className="input-helper">{t('forms.describeWorkDone')}</small>
            </div>
            
            {form.extraHoursDate && form.extraHoursWorked && form.extraHoursDescription && (
              <div className="extra-hours-summary" style={{ marginTop: '1rem' }}>
                <div className="summary-card" style={{ 
                  background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  border: '1px solid #FFB74D'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#E65100' }}>⏱️ {t('forms.extraHoursSummary')}</h5>
                  <div style={{ color: '#333' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>{t('forms.date')}:</strong> {new Date(form.extraHoursDate).toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>{t('forms.extraHours')}:</strong> {form.extraHoursWorked} {t('forms.hours')}
                    </div>
                    <div>
                      <strong>{t('forms.workDone')}:</strong> {form.extraHoursDescription.substring(0, 100)}{form.extraHoursDescription.length > 100 ? '...' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'mission' ? (
          <div className="mission-selection-section">
            <h4 className="form-section-title">✈️ {t('forms.missionDetails')}</h4>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {t('forms.missionRequestHelp')}
            </p>
            
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.startDate')}
                </label>
                <input 
                  name="missionStartDate" 
                  type="date" 
                  value={form.missionStartDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={periodBounds.first}
                  max={periodBounds.last}
                  required 
                  title={t('forms.selectMissionStartDate')}
                />
                <small className="input-helper">{t('forms.selectMissionStartDate')} ({t('forms.submissionMonthRangeHelp')})</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  {t('forms.endDate')}
                </label>
                <input 
                  name="missionEndDate" 
                  type="date" 
                  value={form.missionEndDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={form.missionStartDate || periodBounds.first}
                  max={periodBounds.last}
                  required 
                  title={t('forms.selectMissionEndDate')}
                />
                <small className="input-helper">{t('forms.selectMissionEndDate')} ({t('forms.submissionMonthRangeHelp')})</small>
              </div>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📍</span>
                {t('forms.missionDestination')}
              </label>
              <input 
                name="missionDestination" 
                type="text" 
                placeholder={t('forms.missionDestinationPlaceholder')}
                value={form.missionDestination} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
                title={t('forms.enterMissionDestination')}
              />
              <small className="input-helper">{t('forms.enterMissionDestination')}</small>
            </div>

            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕐</span>
                  {t('forms.missionFromTime') || 'Time From'}
                </label>
                <input 
                  name="missionFromTime" 
                  type="time" 
                  value={form.missionFromTime} 
                  onChange={handleChange} 
                  className="form-input-elegant"
                  title={t('forms.missionFromTimeHelp') || 'Start time of mission'}
                />
                <small className="input-helper">{t('forms.missionFromTimeHelp') || 'e.g. 09:00'}</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕔</span>
                  {t('forms.missionToTime') || 'Time To'}
                </label>
                <input 
                  name="missionToTime" 
                  type="time" 
                  value={form.missionToTime} 
                  onChange={handleChange} 
                  className="form-input-elegant"
                  title={t('forms.missionToTimeHelp') || 'End time of mission'}
                />
                <small className="input-helper">{t('forms.missionToTimeHelp') || 'e.g. 17:00'}</small>
              </div>
            </div>
            
            {form.missionStartDate && form.missionEndDate && form.missionDestination && (
              <div className="mission-summary" style={{ marginTop: '1rem' }}>
                <div className="summary-card" style={{ 
                  background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  border: '1px solid #81C784'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#2E7D32' }}>✈️ {t('forms.missionSummary')}</h5>
                  <div style={{ color: '#333' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>{t('forms.from')}:</strong> {new Date(form.missionStartDate).toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>{t('forms.to')}:</strong> {new Date(form.missionEndDate).toLocaleDateString(t('common.locale'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {(form.missionFromTime || form.missionToTime) && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>{t('forms.time') || 'Time'}:</strong> {form.missionFromTime || '--'} {t('forms.to')} {form.missionToTime || '--'}
                      </div>
                    )}
                    <div>
                      <strong>{t('forms.missionDestination')}:</strong> {form.missionDestination}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Reason field - not shown for WFH or Extra Hours since their description fields serve as the reason */}
        {form.type !== 'wfh' && form.type !== 'extra_hours' && (
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
        )}

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
