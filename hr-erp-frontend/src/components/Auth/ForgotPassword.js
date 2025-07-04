import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const ForgotPassword = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setMessage(data.msg || 'If an account with that email exists, a password reset link has been sent. Please check your email.');
      } else {
        setSuccess(false);
        // Handle specific error cases
        if (res.status === 500 && data.msg && data.msg.includes('not configured')) {
          setMessage('Password reset is temporarily unavailable. Please contact your administrator or try again later.');
        } else if (res.status === 400) {
          setMessage(data.msg || 'Please enter a valid email address.');
        } else {
          setMessage(data.msg || 'Failed to send reset email. Please try again.');
        }
      }
    } catch (err) {
      console.error('Password reset request failed:', err);
      setSuccess(false);
      
      // Check if it's a network error
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setMessage('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        setMessage('An unexpected error occurred. Please try again later.');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="elegant-card fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <img src={logo} alt="NJD Logo" className="app-logo" style={{ margin: '0 auto 2rem auto', display: 'block' }} />
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
          Reset Password
        </h1>
        
        <form className="form-elegant" onSubmit={handleSubmit}>
          <div className="form-group-elegant">
            <label className="form-label-elegant">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="form-input-elegant focus-elegant"
              required
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
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
          
          <button 
            type="button" 
            className="btn-elegant"
            onClick={onBack}
            style={{ 
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#333',
              marginTop: '1rem'
            }}
          >
            Back to Login
          </button>
        </form>

        {message && (
          <div className={`notification ${success ? 'success' : 'error'}`}
               style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: '1rem' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 