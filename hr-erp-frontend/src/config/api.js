/**
 * API Configuration
 * Centralizes the API URL configuration for the application.
 * Uses environment variables for flexibility across different environments.
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default API_URL;
