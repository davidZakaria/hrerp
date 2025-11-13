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
  const [submitting, setSubmitting] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to submit a form.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/recruitment', {
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
    setSubmitting(false);
  };

  return (
    <div className="recruitment-form-container">
      <style>{`
        .recruitment-form-container {
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.8), rgba(26, 26, 26, 0.9));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
          padding: 2rem;
          max-width: 900px;
          margin: 0 auto;
          color: #ffffff;
        }
        
        .recruitment-form-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .form-description {
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          font-size: 1.1rem;
          line-height: 1.6;
        }
        
        .recruitment-form {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        
        .recruitment-form .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .recruitment-form .form-group.full-width {
          grid-column: 1 / -1;
        }
        
        .recruitment-form label {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .recruitment-form input,
        .recruitment-form select {
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .recruitment-form input:focus,
        .recruitment-form select:focus {
          border-color: #64b5f6;
          outline: none;
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
          transform: translateY(-2px);
        }
        
        .recruitment-form input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .recruitment-form select option {
          background: #1a1a1a;
          color: #ffffff;
        }
        
        .recruitment-form .submit-group {
          grid-column: 1 / -1;
          margin-top: 1rem;
        }
        
        .recruitment-form button {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 2px;
          position: relative;
          overflow: hidden;
        }
        
        .recruitment-form button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .recruitment-form button:hover::before {
          left: 100%;
        }
        
        .recruitment-form button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 210, 255, 0.4);
        }
        
        .recruitment-form button:disabled {
          background: linear-gradient(135deg, #666 0%, #555 100%);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .recruitment-form button:disabled::before {
          display: none;
        }
        
        .message {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          font-size: 1rem;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .message.success {
          background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        
        .message.error {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        }
        
        .form-section {
          grid-column: 1 / -1;
          margin: 1.5rem 0 1rem 0;
          padding: 1rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .form-section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .required-indicator {
          color: #ff6b6b;
          font-size: 0.875rem;
          margin-left: 0.25rem;
        }
        
        @media (max-width: 768px) {
          .recruitment-form {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .recruitment-form-container {
            padding: 1.5rem;
            margin: 0 1rem;
          }
          
          .recruitment-form-title {
            font-size: 1.5rem;
          }
          
          .form-description {
            font-size: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .recruitment-form-container {
            padding: 1rem;
            margin: 0 0.5rem;
          }
          
          .recruitment-form-title {
            font-size: 1.3rem;
          }
        }
      `}</style>

      <div className="recruitment-form-title">👤 Add New Recruit</div>
      <div className="form-description">
        Fill out the form below to add a new candidate to the recruitment pipeline. All fields marked with * are required.
      </div>
      
      <form className="recruitment-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-title">📋 Basic Information</div>
        </div>
        
        <div className="form-group">
          <label>
            🌐 Source <span className="required-indicator">*</span>
          </label>
          <select name="source" value={form.source} onChange={handleChange} required>
            <option value="">Select Source</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Wuzzuf">Wuzzuf</option>
            <option value="Facebook">Facebook</option>
            <option value="Referral">Referral</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            👤 Full Name <span className="required-indicator">*</span>
          </label>
          <input 
            name="name" 
            type="text" 
            value={form.name} 
            onChange={handleChange} 
            placeholder="Enter candidate's full name"
            required 
          />
        </div>

        <div className="form-group">
          <label>
            📱 Phone Number <span className="required-indicator">*</span>
          </label>
          <input 
            name="phone" 
            type="tel" 
            value={form.phone} 
            onChange={handleChange} 
            placeholder="Enter phone number"
            required 
          />
        </div>

        <div className="form-group">
          <label>
            📧 Email Address <span className="required-indicator">*</span>
          </label>
          <input 
            name="email" 
            type="email" 
            value={form.email} 
            onChange={handleChange} 
            placeholder="Enter email address"
            required 
          />
        </div>

        <div className="form-group full-width">
          <label>
            💼 Position <span className="required-indicator">*</span>
          </label>
          <input 
            name="position" 
            type="text" 
            value={form.position} 
            onChange={handleChange} 
            placeholder="Enter the position they're applying for"
            required 
          />
        </div>

        <div className="form-section">
          <div className="form-section-title">🎯 Interview Details</div>
        </div>

        <div className="form-group">
          <label>
            👩‍💼 HR Interviewer <span className="required-indicator">*</span>
          </label>
          <select name="hrInterviewer" value={form.hrInterviewer} onChange={handleChange} required>
            <option value="">Select HR Interviewer</option>
            <option value="Sandra">Sandra</option>
            <option value="Nour">Nour</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            🔧 Technical Interviewer <span className="required-indicator">*</span>
          </label>
          <select name="technicalInterviewer" value={form.technicalInterviewer} onChange={handleChange} required>
            <option value="">Select Technical Interviewer</option>
            <option value="Sales Manager">Sales Manager</option>
            <option value="Sales Director">Sales Director</option>
            <option value="Marketing Manager">Marketing Manager</option>
            <option value="Operation Manager">Operation Manager</option>
            <option value="CFO">CFO</option>
            <option value="Legal Manager">Legal Manager</option>
          </select>
        </div>

        <div className="form-section">
          <div className="form-section-title">📊 Assessment & Status</div>
        </div>

        <div className="form-group">
          <label>
            ✅ HR Assessment <span className="required-indicator">*</span>
          </label>
          <select name="hrAssessment" value={form.hrAssessment} onChange={handleChange} required>
            <option value="">Select Assessment</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="form-group">
          <label>
            🎯 Final Status <span className="required-indicator">*</span>
          </label>
          <select name="finalStatus" value={form.finalStatus} onChange={handleChange} required>
            <option value="">Select Status</option>
            <option value="Offered">Offered</option>
            <option value="Hired">Hired</option>
            <option value="Accepted">Accepted</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="submit-group">
          <button type="submit" disabled={submitting}>
            {submitting ? '⏳ Submitting...' : '🚀 Add Recruit'}
          </button>
        </div>
      </form>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message.includes('successfully') ? '✅ ' : '❌ '}
          {message}
        </div>
      )}
    </div>
  );
};

export default RecruitmentForm; 
