import React, { useState, useEffect } from 'react';
import logo from '../assets/njd-logo.png';

const FormSubmission = ({ onFormSubmitted }) => {
  const [form, setForm] = useState({
    type: 'vacation',
    vacationType: '',
    startDate: '',
    endDate: '',
    excuseDate: '',
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
  const [excuseHoursLeft, setExcuseHoursLeft] = useState(null);

  // Fetch excuse hours left
  const fetchExcuseHours = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/forms/excuse-hours', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseHoursLeft(data.excuseHoursLeft);
      }
    } catch (err) {
      console.error('Failed to fetch excuse hours:', err);
    }
  };

  // Load excuse hours when component mounts
  useEffect(() => {
    fetchExcuseHours();
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
      setMessage('You must be logged in to submit a form.');
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
      // Check if user has enough excuse hours before submitting
      if (excuseHoursLeft !== null) {
        const fromTime = new Date(`2000-01-01T${form.fromHour}`);
        const toTime = new Date(`2000-01-01T${form.toHour}`);
        const hoursRequested = (toTime - fromTime) / (1000 * 60 * 60);
        
        if (excuseHoursLeft < hoursRequested) {
          setMessage(`Cannot submit: You only have ${excuseHoursLeft} excuse hours left, but requesting ${hoursRequested.toFixed(1)} hours.`);
          setLoading(false);
          return;
        }
      }
      
      payload = {
        type: 'excuse',
        excuseDate: form.excuseDate,
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

      const res = await fetch('http://localhost:5000/api/forms', {
        method: 'POST',
        headers: headers,
        body: payload
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Form submitted successfully!');
        setForm({ 
          type: 'vacation', 
          vacationType: '', 
          startDate: '', 
          endDate: '', 
          excuseDate: '', 
          sickLeaveStartDate: '', 
          sickLeaveEndDate: '', 
          medicalDocument: null, 
          reason: '', 
          fromHour: '', 
          toHour: '', 
          wfhDescription: '', 
          wfhHours: '' 
        });
        fetchExcuseHours(); // Refresh excuse hours after submission
        if (onFormSubmitted) onFormSubmitted();
      } else {
        setMessage(data.msg || 'Submission failed.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
    setLoading(false);
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src={logo} alt="NJD Logo" className="app-logo" style={{ width: '80px', marginBottom: '1rem' }} />
        <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          NEW JERSEY DEVELOPMENTS
        </h2>
        <p className="text-elegant" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          Submit Your Request
        </p>
      </div>

      {form.type === 'excuse' && excuseHoursLeft !== null && (
        <div className="elegant-card" style={{ marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(100, 181, 246, 0.1)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#64b5f6' }}>
            ⏰ Excuse Hours Remaining
          </h4>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>
            {excuseHoursLeft} hours
          </div>
        </div>
      )}

      <form className="form-elegant" onSubmit={handleSubmit}>
        <div className="form-group-elegant">
          <label className="form-label-elegant">Form Type</label>
          <select 
            name="type" 
            value={form.type} 
            onChange={handleChange} 
            className="form-input-elegant"
            required
          >
            <option value="vacation">Vacation Request</option>
            <option value="excuse">Excuse Request</option>
            <option value="wfh">Working From Home</option>
            <option value="sick_leave">Sick Leave</option>
          </select>
        </div>

        {form.type === 'vacation' && (
          <div className="form-group-elegant">
            <label className="form-label-elegant">Vacation Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="vacationType" 
                  value="annual" 
                  checked={form.vacationType === 'annual'} 
                  onChange={handleVacationTypeChange} 
                  required 
                />
                <span className="text-elegant">Annual Leave</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="vacationType" 
                  value="unpaid" 
                  checked={form.vacationType === 'unpaid'} 
                  onChange={handleVacationTypeChange} 
                  required 
                />
                <span className="text-elegant">Unpaid Leave</span>
              </label>
            </div>
          </div>
        )}

        {form.type === 'vacation' ? (
          <div className="date-selection-section">
            <h4 className="form-section-title">📅 Select Your Vacation Dates</h4>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  Start Date
                </label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={new Date().toISOString().split('T')[0]}
                  required 
                  title="Select the first day of your vacation"
                />
                <small className="input-helper">Choose the first day of your vacation</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  End Date
                </label>
                <input 
                  name="endDate" 
                  type="date" 
                  value={form.endDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  required 
                  title="Select the last day of your vacation"
                />
                <small className="input-helper">Choose the last day of your vacation</small>
              </div>
            </div>
            {form.startDate && form.endDate && (
              <div className="date-summary">
                <div className="summary-card">
                  <h5>📊 Vacation Summary</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">From:</span>
                      <span className="summary-value">{new Date(form.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">To:</span>
                      <span className="summary-value">{new Date(form.endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">Total Days:</span>
                      <span className="summary-value">{Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1} days</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'excuse' ? (
          <div className="time-selection-section">
            <h4 className="form-section-title">🕐 Select Your Excuse Details</h4>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📅</span>
                Excuse Date
              </label>
              <input 
                name="excuseDate" 
                type="date" 
                value={form.excuseDate} 
                onChange={handleChange} 
                className="form-input-elegant date-input"
                max={new Date().toISOString().split('T')[0]}
                required 
                title="Select the date when you took the excuse"
              />
              <small className="input-helper">Choose the date when you took the excuse</small>
            </div>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕐</span>
                  From Time
                </label>
                <input 
                  name="fromHour" 
                  type="time" 
                  value={form.fromHour} 
                  onChange={handleChange} 
                  className="form-input-elegant time-input"
                  required 
                  title="Select start time"
                />
                <small className="input-helper">Select the start time for your excuse</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">🕐</span>
                  To Time
                </label>
                <input 
                  name="toHour" 
                  type="time" 
                  value={form.toHour} 
                  onChange={handleChange} 
                  className="form-input-elegant time-input"
                  required 
                  title="Select end time"
                />
                <small className="input-helper">Must be after start time</small>
              </div>
            </div>
            {form.excuseDate && form.fromHour && form.toHour && (
              <div className="time-summary">
                <div className="summary-card">
                  <h5>⏰ Excuse Summary</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">Date:</span>
                      <span className="summary-value">{new Date(form.excuseDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">From:</span>
                      <span className="summary-value">{new Date(`2000-01-01T${form.fromHour}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">To:</span>
                      <span className="summary-value">{new Date(`2000-01-01T${form.toHour}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">Duration:</span>
                      <span className="summary-value">{((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : form.type === 'sick_leave' ? (
          <div className="sick-leave-selection-section">
            <h4 className="form-section-title">🏥 Sick Leave Details</h4>
            <div className="grid-2">
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  Start Date
                </label>
                <input 
                  name="sickLeaveStartDate" 
                  type="date" 
                  value={form.sickLeaveStartDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  required 
                  title="Select the first day of your sick leave"
                />
                <small className="input-helper">Choose the first day of your sick leave</small>
              </div>
              <div className="form-group-elegant">
                <label className="form-label-elegant">
                  <span className="label-icon">📅</span>
                  End Date
                </label>
                <input 
                  name="sickLeaveEndDate" 
                  type="date" 
                  value={form.sickLeaveEndDate} 
                  onChange={handleChange} 
                  className="form-input-elegant date-input"
                  min={form.sickLeaveStartDate}
                  required 
                  title="Select the last day of your sick leave"
                />
                <small className="input-helper">Choose the last day of your sick leave</small>
              </div>
            </div>
            
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📄</span>
                Medical Document (Optional)
              </label>
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="form-input-elegant"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                title="Upload medical certificate or doctor's note"
              />
              <small className="input-helper">
                Upload medical certificate, doctor's note, or hospital report (PDF, Word, or Image files, max 5MB)
              </small>
            </div>

            {form.sickLeaveStartDate && form.sickLeaveEndDate && (
              <div className="sick-leave-summary">
                <div className="summary-card">
                  <h5>🏥 Sick Leave Summary</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">From:</span>
                      <span className="summary-value">{new Date(form.sickLeaveStartDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">To:</span>
                      <span className="summary-value">{new Date(form.sickLeaveEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="summary-item total-days">
                      <span className="summary-label">Total Days:</span>
                      <span className="summary-value">{Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} days</span>
                    </div>
                    {form.medicalDocument && (
                      <div className="summary-item">
                        <span className="summary-label">Document:</span>
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
            <h4 className="form-section-title">🏠 Working From Home Details</h4>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">📝</span>
                Work Description
              </label>
              <textarea 
                name="wfhDescription" 
                placeholder="Describe the tasks you will be working on from home..." 
                value={form.wfhDescription} 
                onChange={handleChange} 
                className="form-input-elegant"
                rows="3"
                required 
                title="Describe what you'll be working on"
              />
              <small className="input-helper">Provide details about your work activities</small>
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant">
                <span className="label-icon">⏱️</span>
                Number of Hours
              </label>
              <input 
                name="wfhHours" 
                type="number" 
                value={form.wfhHours} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
                title="Number of hours you'll work from home"
              />
              <small className="input-helper">Enter the number of hours you'll work from home</small>
            </div>
            {form.wfhHours && (
              <div className="wfh-summary">
                <div className="summary-card">
                  <h5>🏠 Work From Home Summary</h5>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="summary-label">Hours:</span>
                      <span className="summary-value">{form.wfhHours} hour{form.wfhHours != 1 ? 's' : ''}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Work Type:</span>
                      <span className="summary-value">Remote Work</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="form-group-elegant">
          <label className="form-label-elegant">Reason</label>
          <textarea 
            name="reason" 
            placeholder="Please provide a detailed reason for your request..." 
            value={form.reason} 
            onChange={handleChange} 
            className="form-input-elegant"
            rows="4"
            required 
          />
        </div>

        <button 
          type="submit" 
          className="btn-elegant btn-success"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <div className="spinner-elegant" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></div>
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </button>
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
