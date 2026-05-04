/**
 * API Configuration
 * Centralizes the API URL configuration for the application.
 * - Production browser: prefer REACT_APP_API_URL; if missing, use the page origin so /api hits Nginx.
 * - Development browser: localhost:5001 (or set REACT_APP_API_URL).
 * - Capacitor: production app URL or emulator host.
 */

const getDefaultApiUrl = () => {
  if (typeof window !== 'undefined' && window.Capacitor) {
    return process.env.NODE_ENV === 'production'
      ? 'https://hr-njd.com'
      : 'http://10.0.2.2:5001';
  }
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return 'http://localhost:5001';
};

const API_URL = process.env.REACT_APP_API_URL || getDefaultApiUrl();

export default API_URL;
