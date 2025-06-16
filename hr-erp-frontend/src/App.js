import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Auth/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ResetPassword from './components/Auth/ResetPassword';
import './App.css';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
    setLoading(false);
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="spinner-elegant"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      <Route
        path="/employee"
        element={
          <ProtectedRoute>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirect root to appropriate dashboard or login */}
      <Route
        path="/"
        element={
          isAuthenticated && userRole ? (
            <Navigate
              to={`/${userRole === 'super_admin' 
                ? 'super-admin' 
                : userRole === 'admin'
                ? 'admin'
                : 'employee'}`}
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch all route for undefined paths */}
      <Route
        path="*"
        element={
          <Navigate to="/" replace />
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <AuthenticatedApp />
      </div>
    </BrowserRouter>
  );
};

export default App;
