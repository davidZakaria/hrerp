import React, { useState, useEffect } from 'react';
import RecruitmentForm from './RecruitmentForm';
import RecruitmentDashboard from './RecruitmentDashboard';
import LogoutButton from '../LogoutButton';

const ALS = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  useEffect(() => {
    console.log('ALS Component State:', { showForm, showDashboard });
  }, [showForm, showDashboard]);

  const handleFormSubmitted = () => {
    console.log('Form submitted, switching to dashboard');
    setShowForm(false);
    setShowDashboard(true);
  };

  const handleShowForm = () => {
    console.log('Switching to form view');
    setShowForm(true);
    setShowDashboard(false);
  };

  const handleShowDashboard = () => {
    console.log('Switching to dashboard view');
    setShowForm(false);
    setShowDashboard(true);
  };

  return (
    <div className="ats-container">
      <style>{`
        .ats-container {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          padding: 0;
          min-height: 100vh;
          background: transparent;
          color: #ffffff;
        }
        
        .ats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem 2rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .ats-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin: 0;
        }
        
        .ats-nav {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .ats-nav-button {
          min-width: 200px;
          padding: 15px 30px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .ats-nav-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .ats-nav-button:hover::before {
          left: 100%;
        }
        
        .ats-nav-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          border-color: rgba(255, 255, 255, 0.4);
        }
        
        .ats-nav-button.active {
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          box-shadow: 0 6px 20px rgba(0, 210, 255, 0.4);
          border-color: rgba(0, 210, 255, 0.5);
          transform: translateY(-2px);
        }
        
        .ats-nav-button:active {
          transform: translateY(-1px);
        }
        
        .ats-content {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          min-height: 500px;
        }
        

        
        @media (max-width: 768px) {
          .ats-container {
            padding: 0;
          }
          
          .ats-header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
            margin-bottom: 1rem;
          }
          
          .ats-title {
            font-size: 1.5rem;
          }
          
          .ats-nav {
            padding: 1rem;
            flex-direction: column;
            margin-bottom: 1rem;
          }
          
          .ats-nav-button {
            width: 100%;
            min-width: auto;
            padding: 12px 20px;
          }
        }
      `}</style>



      <div className="ats-header">
        <h1 className="ats-title">🎯 ATS System</h1>
        <LogoutButton />
      </div>

      <div className="ats-nav">
        <button 
          className={`ats-nav-button ${showForm ? 'active' : ''}`}
          onClick={handleShowForm}
          type="button"
        >
          👤 Add New Recruit
        </button>
        <button 
          className={`ats-nav-button ${showDashboard ? 'active' : ''}`}
          onClick={handleShowDashboard}
          type="button"
        >
          📊 View Dashboard
        </button>
      </div>

      <div className="ats-content">
        {showForm && (
          <div>
            <RecruitmentForm onFormSubmitted={handleFormSubmitted} />
          </div>
        )}
        {showDashboard && (
          <div>
            <RecruitmentDashboard />
          </div>
        )}
        {!showForm && !showDashboard && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ffffff' }}>
            <h3>No content selected</h3>
            <p>Please select either "Add New Recruit" or "View Dashboard"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ALS; 
