/**
 * API Configuration
 * Centralizes the API URL configuration for the application.
 * Uses runtime detection: browser -> localhost:5001, Capacitor (emulator) -> 10.0.2.2:5001.
 * Set REACT_APP_API_URL for production builds (e.g. https://hr-njd.com).
 */

const getDefaultApiUrl = () => {
  if (typeof window !== 'undefined' && window.Capacitor) {
    return process.env.NODE_ENV === 'production'
      ? 'https://hr-njd.com'
      : 'http://10.0.2.2:5001';
  }
  return 'http://localhost:5001';
};

const API_URL = process.env.REACT_APP_API_URL || getDefaultApiUrl();

export default API_URL;
