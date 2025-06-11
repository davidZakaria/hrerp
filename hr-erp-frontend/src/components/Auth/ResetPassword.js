import React, { useState } from 'react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

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
    try {
      const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage('Password has been reset. You can now log in.');
      } else {
        setMessage(data.msg || 'Failed to reset password.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
  };

  return (
    <div className="njd-card">
      <div className="njd-title">Set New Password</div>
      <form className="njd-form" onSubmit={handleSubmit}>
        <label>New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <label>Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
        <button type="submit">Reset Password</button>
      </form>
      {message && <div className="njd-message" style={{ color: success ? 'green' : undefined }}>{message}</div>}
    </div>
  );
};

export default ResetPassword; 