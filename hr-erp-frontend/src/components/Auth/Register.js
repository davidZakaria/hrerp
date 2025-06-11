import React, { useState } from 'react';
import logo from '../../assets/njd-logo.png';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'employee' })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Registration successful! You can now log in.');
      } else {
        setMessage(data.msg || 'Registration failed.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    }
  };

  return (
    <div className="njd-card">
      <img src={logo} alt="NJD Logo" className="njd-logo" />
      <div className="njd-title">NEW JERSEY DEVELOPMENTS</div>
      <div className="njd-subtitle">It's all about The Experience</div>
      <form className="njd-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <label>Email</label>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <label>Password</label>
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <label>Department</label>
        <select name="department" value={form.department} onChange={handleChange} required>
          <option value="">Select Department</option>
          <option value="Sale">Sale</option>
          <option value="Engineer">Engineer</option>
          <option value="Marketing">Marketing</option>
          <option value="Finance">Finance</option>
          <option value="Legal">Legal</option>
          <option value="IT">IT</option>
          <option value="PA">PA</option>
          <option value="Customer Relations">Customer Relations</option>
        </select>
        <button type="submit">Register</button>
      </form>
      {message && <div className="njd-message">{message}</div>}
    </div>
  );
};

export default Register; 