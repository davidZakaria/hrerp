import React, { useState } from 'react';

const RecruitmentForm = ({ onFormSubmitted }) => {
  const [form, setForm] = useState({
    source: '',
    name: '',
    phone: '',
    email: '',
    position: '',
    hrInterviewer: '',
    technicalInterviewer: '',
    hrAssessment: '',
    finalStatus: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to submit a form.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/recruitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Recruitment form submitted successfully!');
        setForm({
          source: '',
          name: '',
          phone: '',
          email: '',
          position: '',
          hrInterviewer: '',
          technicalInterviewer: '',
          hrAssessment: '',
          finalStatus: ''
        });
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
      <div className="njd-title">Recruitment Form</div>
      <form className="njd-form" onSubmit={handleSubmit}>
        <label>Source</label>
        <select name="source" value={form.source} onChange={handleChange} required>
          <option value="">Select Source</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Wuzzuf">Wuzzuf</option>
          <option value="Facebook">Facebook</option>
          <option value="Referral">Referral</option>
        </select>

        <label>Name</label>
        <input name="name" type="text" value={form.name} onChange={handleChange} required />

        <label>Phone Number</label>
        <input name="phone" type="tel" value={form.phone} onChange={handleChange} required />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required />

        <label>Position</label>
        <input name="position" type="text" value={form.position} onChange={handleChange} required />

        <label>HR Interviewer</label>
        <select name="hrInterviewer" value={form.hrInterviewer} onChange={handleChange} required>
          <option value="">Select HR Interviewer</option>
          <option value="Sandra">Sandra</option>
          <option value="Nour">Nour</option>
        </select>

        <label>Technical Interviewer</label>
        <select name="technicalInterviewer" value={form.technicalInterviewer} onChange={handleChange} required>
          <option value="">Select Technical Interviewer</option>
          <option value="Sales Manager">Sales Manager</option>
          <option value="Sales Director">Sales Director</option>
          <option value="Marketing Manager">Marketing Manager</option>
          <option value="Operation Manager">Operation Manager</option>
          <option value="CFO">CFO</option>
          <option value="Legal Manager">Legal Manager</option>
        </select>

        <label>HR Assessment</label>
        <select name="hrAssessment" value={form.hrAssessment} onChange={handleChange} required>
          <option value="">Select Assessment</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Pending">Pending</option>
        </select>

        <label>Final Status</label>
        <select name="finalStatus" value={form.finalStatus} onChange={handleChange} required>
          <option value="">Select Status</option>
          <option value="Offered">Offered</option>
          <option value="Hired">Hired</option>
          <option value="Accepted">Accepted</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>

        <button type="submit">Submit</button>
      </form>
      {message && <div className="njd-message">{message}</div>}
    </div>
  );
};

export default RecruitmentForm; 