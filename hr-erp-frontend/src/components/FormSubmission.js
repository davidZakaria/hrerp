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
          <div className="grid-2">
            <div className="form-group-elegant">
              <label className="form-label-elegant">Start Date</label>
              <input 
                name="startDate" 
                type="date" 
                value={form.startDate} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant">End Date</label>
              <input 
                name="endDate" 
                type="date" 
                value={form.endDate} 
                onChange={handleChange} 
                className="form-input-elegant"
                required 
              />
            </div>
          </div>
        ) : (
          <div className="grid-2">
            <div className="form-group-elegant">
              <label className="form-label-elegant">From Time</label>
              <input 
                name="fromHour" 
                type="time" 
                value={form.fromHour} 
                onChange={handleChange} 
                className="form-input-elegant"
                min="10:30" 
                max="18:30" 
                required 
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant">To Time</label>
              <input 
                name="toHour" 
                type="time" 
                value={form.toHour} 
                onChange={handleChange} 
                className="form-input-elegant"
                min="10:30" 
                max="18:30" 
                required 
              />
            </div>
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