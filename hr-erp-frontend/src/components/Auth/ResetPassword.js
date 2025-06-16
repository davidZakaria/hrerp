import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get token from URL
  const token = window.location.pathname.split('/').pop();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage('Password has been reset successfully. You can now log in with your new password.');
      } else {
        setMessage(data.msg || 'Failed to reset password.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="elegant-card fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <img src={logo} alt="NJD Logo" className="app-logo" style={{ margin: '0 auto 2rem auto', display: 'block' }} />
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
          Set New Password
        </h1>
        
        <form className="form-elegant" onSubmit={handleSubmit}>
          <div className="form-group-elegant">
            <label className="form-label-elegant">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input-elegant focus-elegant"
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group-elegant">
            <label className="form-label-elegant">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="form-input-elegant focus-elegant"
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-elegant"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-elegant" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></div>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {message && (
          <div className={`notification ${success ? 'success' : 'error'}`}
               style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: '1rem' }}>
            {message}
          </div>
        )}

        {success && (
          <div style={{ marginTop: '1.5rem' }}>
            <a 
              href="/login" 
              className="btn-elegant"
              style={{ 
                textDecoration: 'none',
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#333'
              }}
            >
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 