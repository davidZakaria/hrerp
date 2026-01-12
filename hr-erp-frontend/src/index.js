import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './components/NotificationSystem';
import './index.css';
import './i18n'; // Initialize i18n configuration
import reportWebVitals from './reportWebVitals';
import logger from './utils/logger';

// Performance optimizations
const root = ReactDOM.createRoot(document.getElementById('root'));

// Strict mode helps identify potential problems
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);

// Web Vitals reporting for performance monitoring
reportWebVitals((metric) => {
  // Log performance metrics
  logger.log('Web Vital:', metric);
  
  // You could send these metrics to an analytics service
  // Example: sendToAnalytics(metric);
});

// Performance observer for additional monitoring
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          logger.log('Navigation timing:', {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            load: entry.loadEventEnd - entry.loadEventStart,
            totalTime: entry.loadEventEnd - entry.fetchStart
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  } catch (error) {
    logger.warn('Performance observer not supported:', error);
  }
}

// Service Worker registration for better caching (if available)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        logger.log('SW registration failed: ', registrationError);
      });
  });
}

// Memory usage monitoring in development
if (process.env.NODE_ENV === 'development') {
  const logMemoryUsage = () => {
    if (performance.memory) {
      logger.log('Memory usage:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  };

  // Log memory usage every 30 seconds in development
  setInterval(logMemoryUsage, 30000);
}
