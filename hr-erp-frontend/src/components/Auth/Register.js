import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const Register = ({ onBack, onRegisterSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // Validation
    if (form.password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    
    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          department: form.department,
          role: 'employee' // Always register as employee
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setMessage('Registration successful! Your account is pending approval by an administrator.');
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          department: ''
        });
        
        // Redirect back to login after 3 seconds
        setTimeout(() => {
          if (onRegisterSuccess) onRegisterSuccess();
        }, 3000);
        
      } else {
        setMessage(data.msg || 'Registration failed.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="elegant-card fade-in" style={{ maxWidth: '450px', textAlign: 'center' }}>
        <img src={logo} alt="NJD Logo" className="app-logo" style={{ margin: '0 auto 2rem auto', display: 'block' }} />
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          Join Our Team
        </h1>
        <p className="text-elegant" style={{ marginBottom: '2rem', fontSize: '1rem', opacity: 0.8 }}>
          Register as an Employee
        </p>

        <form className="form-elegant" onSubmit={handleSubmit}>
          <div className="form-group-elegant">
            <label className="form-label-elegant">Full Name</label>
            <input
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">Department</label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="">Select Department</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="IT">Information Technology</option>
              <option value="Operations">Operations</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Legal">Legal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group-elegant">
              <label className="form-label-elegant">Password</label>
              <input
                name="password"
                type="password"
                placeholder="Create password"
                value={form.password}
                onChange={handleChange}
                className="form-input-elegant focus-elegant"
                minLength="6"
                required
              />
            </div>

            <div className="form-group-elegant">
              <label className="form-label-elegant">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="form-input-elegant focus-elegant"
                minLength="6"
                required
              />
            </div>
          </div>

          <div className="action-buttons">
            <button 
              type="submit" 
              className="btn-elegant btn-success"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner-elegant" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></div>
                  Registering...
                </>
              ) : (
                'Register as Employee'
              )}
            </button>
            
            <button 
              type="button" 
              className="btn-elegant"
              onClick={onBack}
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#333'
              }}
            >
              Back to Login
            </button>
          </div>
        </form>

        {message && (
          <div className={`notification ${success ? 'success' : 'error'}`}
               style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: '1rem' }}>
            {message}
          </div>
        )}

        {success && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
            <p style={{ color: '#2E7D32', fontSize: '0.9rem', margin: 0 }}>
              <strong>Next Steps:</strong><br />
              • Your account will be reviewed by an administrator<br />
              • You'll receive an email notification once approved<br />
              • You can then log in with your credentials
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register; 