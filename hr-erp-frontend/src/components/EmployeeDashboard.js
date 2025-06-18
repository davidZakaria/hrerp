import React, { useState, useEffect } from 'react';
import FormSubmission from './FormSubmission';
import LogoutButton from './LogoutButton';

const EmployeeDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vacationDaysLeft, setVacationDaysLeft] = useState(null);
  const [excuseHoursLeft, setExcuseHoursLeft] = useState(null);

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

  const fetchExcuseHours = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/forms/excuse-hours', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setExcuseHoursLeft(data.excuseHoursLeft);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchVacationDays();
    fetchExcuseHours();
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
    fetchExcuseHours();
  };

  const handleShowForm = () => {
    setShowForm(true);
    setShowPreview(false);
    fetchVacationDays();
    fetchExcuseHours();
  };

  const handleFormSubmitted = () => {
    fetchVacationDays();
    fetchExcuseHours();
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
    
    const statusText = status === 'manager_approved' ? 'Manager Approved' :
                      status === 'manager_submitted' ? 'Awaiting HR Approval' :
                      status === 'manager_rejected' ? 'Manager Rejected' :
                      status.charAt(0).toUpperCase() + status.slice(1);
    
    return <span className={`badge-elegant ${badgeClass}`}>{statusText}</span>;
  };

  return (
    <div className="dashboard-container fade-in">
      {/* Header */}
      <div className="app-header">
        <h1 className="app-title">Employee Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Vacation Days Card */}
        <div className="elegant-card hover-lift" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Annual Vacation Days
          </h2>
          <div className="stats-number" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {vacationDaysLeft !== null ? vacationDaysLeft : '...'}
          </div>
          <div className="stats-label">Days Remaining</div>
        </div>

        {/* Excuse Hours Card */}
        <div className="elegant-card hover-lift" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Monthly Excuse Hours
          </h2>
          <div className="stats-number" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {excuseHoursLeft !== null ? excuseHoursLeft : '...'}
          </div>
          <div className="stats-label">Hours Remaining</div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn-elegant btn-success"
            onClick={handlePreview}
          >
            Preview Submitted Forms
          </button>
          <button 
            className="btn-elegant"
            onClick={handleShowForm}
          >
            Submit New Form
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
              Your Submitted Forms
            </h2>
            
            {loading && <div className="spinner-elegant"></div>}
            
            {error && (
              <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto' }}>
                {error}
              </div>
            )}
            
            {!loading && forms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>No forms submitted yet.</p>
              </div>
            )}
            
            {forms.length > 0 && (
              <div className="grid-2">
                {forms.map(form => (
                  <div key={form._id} className="glass-card hover-lift">
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">Type:</span>
                        <span className="text-elegant">{form.type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">Status:</span>
                        {getStatusBadge(form.status)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="form-label-elegant">Submitted:</span>
                        <span className="text-elegant">{new Date(form.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {form.type === 'vacation' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Start Date:</span>
                            <span className="text-elegant">{new Date(form.startDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">End Date:</span>
                            <span className="text-elegant">{new Date(form.endDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Days:</span>
                            <span className="text-elegant">{form.days}</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'excuse' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Excuse Date:</span>
                            <span className="text-elegant">{new Date(form.excuseDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Time Period:</span>
                            <span className="text-elegant">{form.fromHour} - {form.toHour}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Duration:</span>
                            <span className="text-elegant">{((new Date(`2000-01-01T${form.toHour}`) - new Date(`2000-01-01T${form.fromHour}`)) / (1000 * 60 * 60)).toFixed(1)} hours</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'wfh' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Work Hours:</span>
                            <span className="text-elegant">{form.wfhHours} hours</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Description:</span>
                            <span className="text-elegant">{form.wfhDescription?.substring(0, 50)}...</span>
                          </div>
                        </>
                      )}
                      
                      {form.type === 'sick_leave' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Start Date:</span>
                            <span className="text-elegant">{new Date(form.sickLeaveStartDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">End Date:</span>
                            <span className="text-elegant">{new Date(form.sickLeaveEndDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="form-label-elegant">Duration:</span>
                            <span className="text-elegant">{Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} days</span>
                          </div>
                          {form.medicalDocument && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span className="form-label-elegant">Medical Document:</span>
                              <span className="text-elegant">📄 Attached</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {form.reason && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>Reason:</div>
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
                      
                      {form.managerComment && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>Manager Comment:</div>
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

                      {form.adminComment && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="form-label-elegant" style={{ marginBottom: '0.5rem' }}>Admin Comment:</div>
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
      </div>
    </div>
  );
};

export default EmployeeDashboard; 