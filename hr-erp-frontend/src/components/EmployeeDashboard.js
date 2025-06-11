import React, { useState, useEffect } from 'react';
import FormSubmission from './FormSubmission';

const EmployeeDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);

  const fetchVacationDays = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/vacation-days', {
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

  useEffect(() => {
    fetchVacationDays();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/my-forms', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setForms(data);
      } else {
        setError(data.msg || 'Failed to fetch forms.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
    setLoading(false);
  };

  const handlePreview = () => {
    setShowPreview(true);
    setShowForm(false);
    fetchForms();
    fetchVacationDays();
  };

  const handleShowForm = () => {
    setShowForm(true);
    setShowPreview(false);
    fetchVacationDays();
  };

  const handleFormSubmitted = () => {
    fetchVacationDays();
    setShowForm(false);
    setShowPreview(true);
    fetchForms();
  };

  return (
    <div>
      <h3>Annual Vacation Days Left: {vacationDaysLeft !== null ? vacationDaysLeft : '...'}</h3>
      <button className="njd-btn" onClick={handlePreview}>Preview Submitted Forms</button>
      <button className="njd-btn" onClick={handleShowForm}>Submit New Form</button>
      {showForm && <FormSubmission onFormSubmitted={handleFormSubmitted} />}
      {showPreview && (
        <div style={{ marginTop: 20 }}>
          <h3>My Submitted Forms</h3>
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {forms.length === 0 && !loading && <p>No forms submitted yet.</p>}
          <ul>
            {forms.map(form => (
              <li key={form._id} style={{ marginBottom: 10, border: '1px solid #ccc', padding: 10 }}>
                <strong>Type:</strong> {form.type}<br />
                {form.type === 'vacation' && <><strong>Vacation Type:</strong> {form.vacationType || '-'}<br /></>}
                {form.type === 'vacation' && <><strong>Start:</strong> {form.startDate?.slice(0,10)}<br /><strong>End:</strong> {form.endDate?.slice(0,10)}<br /></>}
                {form.type === 'excuse' && <><strong>From:</strong> {form.fromHour}<br /><strong>To:</strong> {form.toHour}<br /></>}
                <strong>Reason:</strong> {form.reason}<br />
                <strong>Status:</strong> {form.status}<br />
                {form.adminComment && <><strong>Admin Comment:</strong> {form.adminComment}<br /></>}
                <strong>Submitted:</strong> {new Date(form.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard; 