/**
 * API Configuration
 * Centralizes the API URL configuration for the application.
 * Uses environment variables for flexibility across different environments.
 * In Capacitor (mobile) builds, defaults to production API when REACT_APP_API_URL is not set.
 */

const getDefaultApiUrl = () => {
  if (typeof window !== 'undefined' && window.Capacitor) {
    return 'https://hr-njd.com';
  }
  return 'http://localhost:5000';
};

const API_URL = process.env.REACT_APP_API_URL || getDefaultApiUrl();

export default API_URL;
