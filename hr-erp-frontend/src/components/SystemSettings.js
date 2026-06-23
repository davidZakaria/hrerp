import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const EMPTY_FORM = {
  companyName: '',
  annualVacationDays: 15,
  casualVacationDays: 6,
  monthlyExcuseRequests: 2,
  payPeriodAnchorDay: 25,
  latenessGracePeriodMinutes: 15,
  standardShiftHours: 8
};

const SystemSettings = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'x-auth-token': localStorage.getItem('token')
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || t('systemSettings.loadError'));
      }
      setForm({
        companyName: data.companyName ?? EMPTY_FORM.companyName,
        annualVacationDays: data.annualVacationDays ?? EMPTY_FORM.annualVacationDays,
        casualVacationDays: data.casualVacationDays ?? EMPTY_FORM.casualVacationDays,
        monthlyExcuseRequests: data.monthlyExcuseRequests ?? EMPTY_FORM.monthlyExcuseRequests,
        payPeriodAnchorDay: data.payPeriodAnchorDay ?? EMPTY_FORM.payPeriodAnchorDay,
        latenessGracePeriodMinutes: data.latenessGracePeriodMinutes ?? EMPTY_FORM.latenessGracePeriodMinutes,
        standardShiftHours: data.standardShiftHours ?? EMPTY_FORM.standardShiftHours
      });
    } catch (err) {
      setError(err.message || t('systemSettings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: field === 'companyName' ? value : Number(value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.msg || t('systemSettings.saveError'));
      }
      if (data.settings) {
        setForm({
          companyName: data.settings.companyName,
          annualVacationDays: data.settings.annualVacationDays,
          casualVacationDays: data.settings.casualVacationDays,
          monthlyExcuseRequests: data.settings.monthlyExcuseRequests,
          payPeriodAnchorDay: data.settings.payPeriodAnchorDay,
          latenessGracePeriodMinutes: data.settings.latenessGracePeriodMinutes,
          standardShiftHours: data.settings.standardShiftHours
        });
      }
      setSuccess(data.msg || t('systemSettings.saveSuccess'));
    } catch (err) {
      setError(err.message || t('systemSettings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="elegant-card" style={{ marginTop: '1.5rem' }}>
        <div className="spinner-elegant" />
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#b0bec5' }}>
          {t('systemSettings.loading')}
        </p>
      </div>
    );
  }

  return (
    <div className="elegant-card" style={{ marginTop: '1.5rem' }}>
      <div className="section-header-redesign">
        <div className="section-info">
          <h3 className="text-gradient">{t('systemSettings.title')}</h3>
          <p className="section-description">{t('systemSettings.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="notification error" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '10px', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="notification success" style={{ position: 'relative', top: 'auto', right: 'auto', marginBottom: '1rem' }}>
          {success}
          <button
            type="button"
            onClick={() => setSuccess('')}
            style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '10px', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="elegant-card" style={{ margin: 0, background: 'rgba(255,255,255,0.03)' }}>
            <h4 style={{ marginBottom: '1rem', color: '#64b5f6' }}>{t('systemSettings.companyProfile')}</h4>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="companyName">
                {t('systemSettings.companyName')}
              </label>
              <input
                id="companyName"
                type="text"
                className="form-input-elegant"
                value={form.companyName}
                onChange={handleChange('companyName')}
                required
              />
            </div>
          </div>

          <div className="elegant-card" style={{ margin: 0, background: 'rgba(255,255,255,0.03)' }}>
            <h4 style={{ marginBottom: '1rem', color: '#64b5f6' }}>{t('systemSettings.leaveQuotas')}</h4>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="annualVacationDays">
                {t('systemSettings.annualVacationDays')}
              </label>
              <input
                id="annualVacationDays"
                type="number"
                min="0"
                max="365"
                className="form-input-elegant"
                value={form.annualVacationDays}
                onChange={handleChange('annualVacationDays')}
                required
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="casualVacationDays">
                {t('systemSettings.casualVacationDays')}
              </label>
              <input
                id="casualVacationDays"
                type="number"
                min="0"
                max="365"
                className="form-input-elegant"
                value={form.casualVacationDays}
                onChange={handleChange('casualVacationDays')}
                required
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="monthlyExcuseRequests">
                {t('systemSettings.monthlyExcuseRequests')}
              </label>
              <input
                id="monthlyExcuseRequests"
                type="number"
                min="0"
                max="31"
                className="form-input-elegant"
                value={form.monthlyExcuseRequests}
                onChange={handleChange('monthlyExcuseRequests')}
                required
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="payPeriodAnchorDay">
                {t('systemSettings.payPeriodAnchorDay')}
              </label>
              <input
                id="payPeriodAnchorDay"
                type="number"
                min="1"
                max="31"
                className="form-input-elegant"
                value={form.payPeriodAnchorDay}
                onChange={handleChange('payPeriodAnchorDay')}
                required
              />
              <small style={{ color: '#90a4ae', display: 'block', marginTop: '0.35rem' }}>
                {t('systemSettings.payPeriodAnchorDayHint')}
              </small>
            </div>
          </div>
        </div>

        <div className="elegant-card" style={{ margin: 0, marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
          <h4 style={{ marginBottom: '1rem', color: '#64b5f6' }}>{t('systemSettings.timeAttendance')}</h4>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="latenessGracePeriodMinutes">
                {t('systemSettings.latenessGracePeriodMinutes')}
              </label>
              <input
                id="latenessGracePeriodMinutes"
                type="number"
                min="0"
                max="240"
                className="form-input-elegant"
                value={form.latenessGracePeriodMinutes}
                onChange={handleChange('latenessGracePeriodMinutes')}
                required
              />
            </div>
            <div className="form-group-elegant">
              <label className="form-label-elegant" htmlFor="standardShiftHours">
                {t('systemSettings.standardShiftHours')}
              </label>
              <input
                id="standardShiftHours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                className="form-input-elegant"
                value={form.standardShiftHours}
                onChange={handleChange('standardShiftHours')}
                required
              />
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button type="submit" className="btn-elegant btn-success" disabled={saving}>
            {saving ? t('systemSettings.saving') : t('systemSettings.saveButton')}
          </button>
          <button
            type="button"
            className="btn-elegant"
            onClick={fetchSettings}
            disabled={saving || loading}
          >
            {t('systemSettings.resetForm')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;
