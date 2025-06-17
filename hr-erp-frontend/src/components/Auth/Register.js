import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const Register = ({ onBack, onRegisterSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'employee',
    managedDepartments: []
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'managedDepartments') {
      const options = Array.from(e.target.selectedOptions, option => option.value);
      setForm({ ...form, [name]: options });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const departments = ['Human Resources', 'Finance', 'Marketing', 'Sales', 'IT', 'Operations', 'Customer Service', 'Legal', 'Engineering', 'Other'];

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

    if (form.role === 'manager' && form.managedDepartments.length === 0) {
      setMessage('Managers must select at least one department to manage.');
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
          role: form.role,
          managedDepartments: form.role === 'manager' ? form.managedDepartments : []
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
          department: '',
          role: 'employee',
          managedDepartments: []
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
          Register for HR ERP System
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
            <label className="form-label-elegant">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">Your Department</label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="">Select Your Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {form.role === 'manager' && (
            <div className="form-group-elegant">
              <label className="form-label-elegant">Departments You Will Manage</label>
              <select
                name="managedDepartments"
                value={form.managedDepartments}
                onChange={handleChange}
                className="form-input-elegant focus-elegant"
                multiple
                size="4"
                required
                style={{ height: 'auto', minHeight: '120px' }}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <small style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
                Hold Ctrl (Cmd on Mac) to select multiple departments
              </small>
            </div>
          )}

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
                `Register as ${form.role.charAt(0).toUpperCase() + form.role.slice(1)}`
              )}
            </button>
            
                        <button
              type="button"
              className="btn-elegant"
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white'
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