import React, { useState } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import ResetPassword from './components/Auth/ResetPassword';
import './App.css';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

function AppContent() {
  const [showLogin, setShowLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setIsLoggedIn(false);
  };

  // For demo: store email in localStorage on login (update Login.js to do this)
  const userEmail = localStorage.getItem('email');
  const isAdmin = userEmail === 'admin@company.com';

  const location = useLocation();
  // If the path is /reset-password/:token, show the reset password page
  if (location.pathname.startsWith('/reset-password/')) {
    return (
      <div className="njd-page">
        <ResetPassword />
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="njd-page">
        <button className="njd-btn" onClick={handleLogout}>Logout</button>
        {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
      </div>
    );
  }

  return (
    <div className="njd-page">
      <button className="njd-btn" onClick={() => setShowLogin(true)}>Login</button>
      <button className="njd-btn" onClick={() => setShowLogin(false)}>Register</button>
      {showLogin ? <Login onLogin={handleLogin} /> : <Register />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
