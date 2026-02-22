import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';

// Allowed company email domains
const ALLOWED_EMAIL_DOMAINS = ['@newjerseyegypt.com', '@gycegypt.com'];

const Register = ({ onBack, onRegisterSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'employee',
    managedDepartments: [],
    employeeCode: '',
    workSchedule: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleDepartmentCheckbox = (departmentName) => {
    const updatedDepartments = form.managedDepartments.includes(departmentName)
      ? form.managedDepartments.filter(dept => dept !== departmentName)
      : [...form.managedDepartments, departmentName];
    
    setForm({ ...form, managedDepartments: updatedDepartments });
  };

  const departments = ['Human Resources', 'Finance', 'Marketing', 'Sales', 'IT', 'Operations', 'Engineer', 'Customer Service', 'Legal', 'Community', 'Reception', 'Jamila Engineer', 'Jura Engineer', 'Green Icon Engineer', 'Green Avenue Engineer', 'Architectural Engineer', 'Technical Office Engineer', 'Personal Assistant', 'Service', 'Site Service', 'Driver', 'Other'];

  const isValidCompanyEmail = (email) => {
    const emailLower = email.toLowerCase();
    return ALLOWED_EMAIL_DOMAINS.some(domain => emailLower.endsWith(domain));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // Email domain validation
    if (!isValidCompanyEmail(form.email)) {
      setMessage(t('register.companyEmailRequired'));
      return;
    }
    
    // Validation
    if (form.password.length < 6) {
      setMessage(t('register.passwordTooShort'));
      return;
    }
    
    if (form.password !== form.confirmPassword) {
      setMessage(t('register.passwordsNotMatch'));
      return;
    }

    if (form.role === 'manager' && form.managedDepartments.length === 0) {
      setMessage(t('register.managersSelectDepartment'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          department: form.department,
          role: form.role,
          managedDepartments: form.role === 'manager' ? form.managedDepartments : [],
          employeeCode: form.employeeCode || null,
          workSchedule: form.workSchedule ? JSON.parse(form.workSchedule) : null
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setMessage(t('register.registrationSuccessful'));
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          department: '',
          role: 'employee',
          managedDepartments: [],
          employeeCode: '',
          workSchedule: ''
        });
        
        // Redirect back to login after 3 seconds
        setTimeout(() => {
          if (onRegisterSuccess) onRegisterSuccess();
        }, 3000);
        
      } else {
        setMessage(data.msg || t('register.registrationFailed'));
      }
    } catch (err) {
      setMessage(t('login.serverError'));
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="elegant-card fade-in" style={{ maxWidth: '450px', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          {t('register.title')}
        </h1>
        <p className="text-elegant" style={{ marginBottom: '2rem', fontSize: '1rem', opacity: 0.8 }}>
          {t('register.subtitle')}
        </p>

        <form className="form-elegant" onSubmit={handleSubmit}>
          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('register.fullName')}</label>
            <input
              name="name"
              type="text"
              placeholder={t('register.fullNamePlaceholder')}
              value={form.name}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('register.emailAddress')}</label>
            <input
              name="email"
              type="email"
              placeholder="name@newjerseyegypt.com"
              value={form.email}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
            <small style={{ color: '#64b5f6', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', textAlign: 'left' }}>
              📧 {t('register.allowedDomains')}: @newjerseyegypt.com, @gycegypt.com
            </small>
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('register.role')}</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="employee">{t('register.employee')}</option>
              <option value="manager">{t('register.manager')}</option>
            </select>
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">{t('register.yourDepartment')}</label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="">{t('register.selectDepartment')}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{t(`departments.${dept}`) || dept}</option>
              ))}
            </select>
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">Employee Code</label>
            <input
              name="employeeCode"
              type="text"
              placeholder="Enter your biometric device code"
              value={form.employeeCode}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            />
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', textAlign: 'left' }}>
              This code must match your biometric attendance device code
            </small>
          </div>

          <div className="form-group-elegant">
            <label className="form-label-elegant">Work Schedule</label>
            <select
              name="workSchedule"
              value={form.workSchedule}
              onChange={handleChange}
              className="form-input-elegant focus-elegant"
              required
            >
              <option value="">Select your work schedule</option>
              <option value='{"startTime":"11:00","endTime":"19:00"}'>11:00 AM - 7:00 PM</option>
              <option value='{"startTime":"10:30","endTime":"18:30"}'>10:30 AM - 6:30 PM</option>
              <option value='{"startTime":"09:30","endTime":"18:30"}'>9:30 AM - 6:30 PM</option>
              <option value='{"startTime":"08:30","endTime":"16:30"}'>8:30 AM - 4:30 PM</option>
            </select>
          </div>

          {form.role === 'manager' && (
            <div className="form-group-elegant">
              <label className="form-label-elegant">{t('register.managedDepartments')}</label>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' }}>
                {t('register.managedDepartmentsDescription')}
              </p>
              <div className="departments-selection">
                {departments.map(dept => (
                  <label 
                    key={dept} 
                    className={`department-checkbox ${form.managedDepartments.includes(dept) ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.managedDepartments.includes(dept)}
                      onChange={() => handleDepartmentCheckbox(dept)}
                      className="checkbox-input"
                    />
                    <span className="checkmark"></span>
                    <span className="department-name">{t(`departments.${dept}`) || dept}</span>
                  </label>
                ))}
              </div>
              {form.managedDepartments.length > 0 && (
                <div className="selected-departments">
                  <small style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    ✓ {t('register.selectedDepartments')} ({form.managedDepartments.length}): {form.managedDepartments.map(dept => t(`departments.${dept}`) || dept).join(', ')}
                  </small>
                </div>
              )}
              {form.role === 'manager' && form.managedDepartments.length === 0 && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  background: 'rgba(255, 193, 7, 0.1)', 
                  borderRadius: '4px',
                  textAlign: 'left'
                }}>
                  <small style={{ color: '#FFA000', fontStyle: 'italic' }}>
                    ⚠️ {t('register.selectAtLeastOneDepartment')}
                  </small>
                </div>
              )}
            </div>
          )}

          <div className="grid-2">
            <div className="form-group-elegant">
              <label className="form-label-elegant">{t('register.password')}</label>
              <input
                name="password"
                type="password"
                placeholder={t('register.passwordPlaceholder')}
                value={form.password}
                onChange={handleChange}
                className="form-input-elegant focus-elegant"
                minLength="6"
                required
              />
            </div>

            <div className="form-group-elegant">
              <label className="form-label-elegant">{t('register.confirmPassword')}</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder={t('register.confirmPasswordPlaceholder')}
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
                  {t('register.registering')}
                </>
              ) : (
                t('register.registerAs', { role: t(`register.${form.role}`) })
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
              {t('register.backToLogin')}
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
              <strong>{t('register.nextSteps')}</strong><br />
              • {t('register.nextStep1')}<br />
              • {t('register.nextStep2')}<br />
              • {t('register.nextStep3')}
            </p>
          </div>
        )}
      </div>

      <style>{`
        /* Department selection styles */
        .departments-selection {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          margin: 1rem 0;
          text-align: left;
        }

        .department-checkbox {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .department-checkbox:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .department-checkbox.checked {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4CAF50;
        }

        .checkbox-input {
          display: none;
        }

        .checkmark {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 4px;
          margin-right: 0.75rem;
          position: relative;
          transition: all 0.3s ease;
          background: transparent;
        }

        .checkbox-input:checked + .checkmark {
          background: #4CAF50;
          border-color: #4CAF50;
        }

        .checkbox-input:checked + .checkmark::after {
          content: '';
          position: absolute;
          left: 6px;
          top: 3px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .department-name {
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .selected-departments {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(76, 175, 80, 0.1);
          border-radius: 6px;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

export default Register; 
