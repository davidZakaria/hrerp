import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ForgotPassword from './ForgotPassword';
import Register from './Register';

const Login = ({ onLogin }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(t('login.loginSuccessful'));
        
        // Store authentication data
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', form.email);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('managedDepartments', JSON.stringify(data.managedDepartments || []));
        
        // Redirect based on user role
        setTimeout(() => {
          if (data.role === 'super_admin') {
            navigate('/super-admin');
          } else if (data.role === 'admin') {
            navigate('/admin');
          } else if (data.role === 'manager') {
            navigate('/manager');
          } else {
            navigate('/employee');
          }
          
          if (onLogin) onLogin();
        }, 1000); // Small delay to show success message
        
      } else {
        setMessage(data.msg || t('login.loginFailed'));
      }
    } catch (err) {
      setMessage(t('login.serverError'));
    }
    setLoading(false);
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
    setMessage(t('login.registrationSuccessful'));
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  if (showRegister) {
    return <Register onBack={() => setShowRegister(false)} onRegisterSuccess={handleRegisterSuccess} />;
  }

  return (
    <div className="auth-container">
      <div className="elegant-card fade-in" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          {t('login.title')}
        </h1>
        <p className="text-elegant" style={{ marginBottom: '2rem', fontSize: '1rem', opacity: 0.8 }}>
          {t('login.subtitle')}
        </p>

        <form className="form-elegant" onSubmit={handleSubmit}>
          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('common.email')}</label>
            <input
              name="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={form.email}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('common.password')}</label>
            <input
              name="password"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={form.password}
              onChange={handleChange}
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
                {t('login.loggingIn')}
              </>
            ) : (
              t('login.loginButton')
            )}
          </button>
        </form>

        {/* Action Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3498db',
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '8px',
                transition: 'all 0.3s ease',
                textDecoration: 'underline'
              }}
              onMouseOver={(e) => e.target.style.color = '#2980b9'}
              onMouseOut={(e) => e.target.style.color = '#3498db'}
            >
              {t('login.forgotPassword')}
            </button>

            <button 
              type="button" 
              onClick={() => setShowRegister(true)}
              className="btn-elegant"
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                background: 'rgba(52, 152, 219, 0.1)',
                color: '#2980b9',
                border: '1px solid rgba(52, 152, 219, 0.3)'
              }}
            >
              {t('login.registerEmployee')}
            </button>
          </div>

          <div style={{ 
            padding: '1rem', 
            background: 'rgba(52, 152, 219, 0.05)', 
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#666',
            lineHeight: '1.4'
          }}>
            <strong>{t('login.newEmployee')}</strong><br />
            {t('login.registerDescription')}
          </div>
        </div>

        {message && (
          <div className={`notification ${message.includes('successful') ? 'success' : 'error'}`} 
               style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: '1rem' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 
