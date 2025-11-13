import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import LanguageSwitcher from './components/LanguageSwitcher';
import { preloadData } from './hooks/useApi';
import './App.css';
import './i18n';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Auth/Login'));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'));
const JobApplicationForm = lazy(() => import('./components/ATS/JobApplicationForm'));

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is trying to access a route they shouldn't
  const path = location.pathname;
  if (userRole === 'employee' && path !== '/employee') {
    return <Navigate to="/employee" replace />;
  }
  if (userRole === 'manager' && path !== '/manager') {
    return <Navigate to="/manager" replace />;
  }
  if (userRole === 'admin' && path !== '/admin') {
    return <Navigate to="/admin" replace />;
  }
  if (userRole === 'super_admin' && path !== '/super-admin') {
    return <Navigate to="/super-admin" replace />;
  }

  return children;
};

const AuthenticatedApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preloadComplete, setPreloadComplete] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole');
      
      if (token && role) {
        setIsAuthenticated(true);
        setUserRole(role);
        
        // Preload common data based on user role
        try {
          const preloadPromises = [
            preloadData('/api/forms/vacation-days'),
            preloadData('/api/forms/excuse-hours')
          ];

          if (role === 'admin' || role === 'super_admin') {
            preloadPromises.push(
              preloadData('/api/forms/admin'),
              preloadData('/api/users')
            );
          } else if (role === 'manager') {
            preloadPromises.push(
              preloadData('/api/forms/manager/pending'),
              preloadData('/api/users/team-members')
            );
          }

          await Promise.allSettled(preloadPromises);
        } catch (error) {
          console.warn('Preload failed:', error);
        }
      }
      
      setPreloadComplete(true);
      setLoading(false);
    };

    initializeApp();
  }, []);

  const handleLogin = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (loading || !preloadComplete) {
    return <LoadingScreen message="Initializing application..." />;
  }

  if (isAuthenticated) {
    const getDefaultRoute = () => {
      switch (userRole) {
        case 'super_admin': return '/super-admin';
        case 'admin': return '/admin';
        case 'manager': return '/manager';
        default: return '/employee';
      }
    };

    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <Routes>
            <Route path="/login" element={<Navigate to={getDefaultRoute()} replace />} />
            <Route 
              path="/employee" 
              element={
                <ProtectedRoute>
                  <EmployeeDashboard onLogout={handleLogout} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager" 
              element={
                <ProtectedRoute>
                  <ManagerDashboard onLogout={handleLogout} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard onLogout={handleLogout} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute>
                  <SuperAdminDashboard onLogout={handleLogout} />
                </ProtectedRoute>
              } 
            />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
            <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/apply" element={<JobApplicationForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const AppContent = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set initial document direction based on language
    const currentLang = i18n.language || 'en';
    if (currentLang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  }, [i18n.language]);

  return (
    <div className="App">
      {/* Language Switcher - Fixed Position */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999
      }}>
        <LanguageSwitcher />
      </div>
      
      <ErrorBoundary>
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
};

function App() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <AppContent />
    </Suspense>
  );
}

export default App;
