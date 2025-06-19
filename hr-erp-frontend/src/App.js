import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import { preloadData } from './hooks/useApi';
import './App.css';

// Lazy load components for better performance
const Login = lazy(() => import('./components/Auth/Login'));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'));

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
      <Suspense fallback={<LoadingScreen message="Loading login..." />}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}

export default App;
