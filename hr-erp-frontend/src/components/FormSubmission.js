import React, { useState } from 'react';
// import logo from '../assets/njd-logo.png';

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

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVacationTypeChange = e => {
    setForm({ ...form, vacationType: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to submit a form.');
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
  };

  return (
    <div className="njd-card">
      {/* <img src={logo} alt="NJD Logo" className="njd-logo" /> */}
      <div className="njd-title">NEW JERSEY DEVELOPMENTS</div>
      <div className="njd-subtitle">It's all about The Experience</div>
      <form className="njd-form" onSubmit={handleSubmit}>
        <label>Form Type</label>
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="vacation">Vacation</option>
          <option value="excuse">Excuse</option>
        </select>
        {form.type === 'vacation' ? (
          <div className="radio-group">
            <label>
              <input type="radio" name="vacationType" value="annual" checked={form.vacationType === 'annual'} onChange={handleVacationTypeChange} required /> Annual
            </label>
            <label>
              <input type="radio" name="vacationType" value="casual" checked={form.vacationType === 'casual'} onChange={handleVacationTypeChange} required /> Casual
            </label>
            <label>
              <input type="radio" name="vacationType" value="unpaid" checked={form.vacationType === 'unpaid'} onChange={handleVacationTypeChange} required /> Unpaid
            </label>
          </div>
        ) : null}
        {form.type === 'vacation' ? (
          <>
            <label>Start Date</label>
            <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
            <label>End Date</label>
            <input name="endDate" type="date" value={form.endDate} onChange={handleChange} required />
          </>
        ) : (
          <>
            <label>From</label>
            <input name="fromHour" type="time" value={form.fromHour} onChange={handleChange} min="10:30" max="18:30" required />
            <label>To</label>
            <input name="toHour" type="time" value={form.toHour} onChange={handleChange} min="10:30" max="18:30" required />
          </>
        )}
        <label>Reason</label>
        <textarea name="reason" placeholder="Reason" value={form.reason} onChange={handleChange} required />
        <button type="submit">Submit</button>
      </form>
      {message && (
        <div
          className="njd-message"
          style={{ color: message.includes('successfully') ? 'green' : message.includes('duplicate') || message.includes('already') ? 'red' : undefined }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default FormSubmission; 