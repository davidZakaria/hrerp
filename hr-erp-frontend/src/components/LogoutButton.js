import React from 'react';

const LogoutButton = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn-elegant"
      style={{
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '8px 16px',
        fontSize: '0.9rem',
        fontWeight: '500',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease'
      }}
      onMouseOver={(e) => {
        e.target.style.background = 'rgba(255, 255, 255, 0.3)';
        e.target.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        e.target.style.transform = 'translateY(0)';
      }}
    >
      Logout
    </button>
  );
};

export default LogoutButton; 