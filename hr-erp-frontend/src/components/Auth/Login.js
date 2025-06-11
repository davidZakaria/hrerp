import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Login successful!');
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', form.email);
        if (onLogin) onLogin();
      } else {
        setMessage(data.msg || 'Login failed.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
  };

  const handleResetRequest = async e => {
    e.preventDefault();
    setResetMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMsg('If an account with that email exists, a reset link has been sent.');
      } else {
        setResetMsg(data.msg || 'Failed to send reset email.');
      }
    } catch (err) {
      setResetMsg('Error connecting to server.');
    }
  };

  if (showReset) {
    return (
      <div className="njd-card">
        <img src={logo} alt="NJD Logo" className="njd-logo" />
        <div className="njd-title">Reset Password</div>
        <form className="njd-form" onSubmit={handleResetRequest}>
          <label>Email</label>
          <input name="resetEmail" type="email" placeholder="Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
          <button type="submit">Send Reset Link</button>
        </form>
        {resetMsg && <div className="njd-message">{resetMsg}</div>}
        <button className="njd-btn" style={{ marginTop: 10 }} onClick={() => setShowReset(false)}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="njd-card">
      <img src={logo} alt="NJD Logo" className="njd-logo" />
      <div className="njd-title">NEW JERSEY DEVELOPMENTS</div>
      <div className="njd-subtitle">It's all about The Experience</div>
      <form className="njd-form" onSubmit={handleSubmit}>
        <label>Email</label>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <label>Password</label>
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <button type="submit">Login</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <button type="button" className="njd-btn" style={{ width: 'auto', padding: '6px 18px', fontSize: '1rem' }} onClick={() => setShowReset(true)}>
          Forgot Password?
        </button>
      </div>
      {message && <div className="njd-message">{message}</div>}
    </div>
  );
};

export default Login; 