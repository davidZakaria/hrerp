import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './components/NotificationSystem';
import './index.css';
import reportWebVitals from './reportWebVitals';

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
  console.log('Web Vital:', metric);
  
  // You could send these metrics to an analytics service
  // Example: sendToAnalytics(metric);
});

// Performance observer for additional monitoring
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('Navigation timing:', {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            load: entry.loadEventEnd - entry.loadEventStart,
            totalTime: entry.loadEventEnd - entry.fetchStart
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  } catch (error) {
    console.warn('Performance observer not supported:', error);
  }
}

// Service Worker registration for better caching (if available)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Memory usage monitoring in development
if (process.env.NODE_ENV === 'development') {
  const logMemoryUsage = () => {
    if (performance.memory) {
      console.log('Memory usage:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  };

  // Log memory usage every 30 seconds in development
  setInterval(logMemoryUsage, 30000);
}
