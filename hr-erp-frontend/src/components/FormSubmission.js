import React, { useState } from 'react';
import logo from '../assets/njd-logo.png';

const FormSubmission = ({ onFormSubmitted }) => {
  const [form, setForm] = useState({
    type: 'vacation',
    vacationType: '',
    startDate: '',
    endDate: '',
    reason: '',
    fromHour: '',
    toHour: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVacationTypeChange = e => {
    setForm({ ...form, vacationType: e.target.value });
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

    let payload = {};
    if (form.type === 'vacation') {
      payload = {
        type: 'vacation',
        vacationType: form.vacationType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason
      };
    } else {
      payload = {
        type: 'excuse',
        fromHour: form.fromHour,
        toHour: form.toHour,
        reason: form.reason
      };
    }

    try {
      const res = await fetch('http://localhost:5000/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Form submitted successfully!');
        setForm({ type: 'vacation', vacationType: '', startDate: '', endDate: '', reason: '', fromHour: '', toHour: '' });
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
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
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
                  min={form.startDate || new Date().toISOString().split('T')[0]} // End date must be after start date
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
        ) : (
          <div className="time-selection-section">
            <h4 className="form-section-title">🕐 Select Your Excuse Time</h4>
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
                  min="10:30" 
                  max="18:30" 
                  required 
                  title="Select start time (10:30 AM - 6:30 PM)"
                />
                <small className="input-helper">Working hours: 10:30 AM - 6:30 PM</small>
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
                  min="10:30" 
                  max="18:30" 
                  required 
                  title="Select end time (10:30 AM - 6:30 PM)"
                />
                <small className="input-helper">Must be after start time</small>
              </div>
            </div>
            {form.fromHour && form.toHour && (
              <div className="time-summary">
                <div className="summary-card">
                  <h5>⏰ Time Summary</h5>
                  <div className="summary-details">
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