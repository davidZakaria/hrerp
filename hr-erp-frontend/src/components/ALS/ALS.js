import React, { useState } from 'react';
import RecruitmentForm from './RecruitmentForm';
import RecruitmentDashboard from './RecruitmentDashboard';
import LogoutButton from '../LogoutButton';

const ALS = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  const handleFormSubmitted = () => {
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
          padding: 2rem;
          min-height: 100vh;
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          color: #ffffff;
        }
        
        .ats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
        }
        
        .ats-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin: 0;
        }
        
        .ats-nav {
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.8), rgba(26, 26, 26, 0.9));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .ats-nav button {
          min-width: 160px;
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          overflow: hidden;
        }
        
        .ats-nav button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .ats-nav button:hover::before {
          left: 100%;
        }
        
        .ats-nav button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        
        .ats-nav button.active {
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
        }
        
        @media (max-width: 768px) {
          .ats-container {
            padding: 1rem;
          }
          
          .ats-header {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          
          .ats-title {
            font-size: 1.5rem;
          }
          
          .ats-nav {
            padding: 1rem;
            flex-direction: column;
          }
          
          .ats-nav button {
            width: 100%;
            min-width: auto;
          }
        }
      `}</style>

      <div className="ats-header">
        <h1 className="ats-title">🎯 ATS System</h1>
        <LogoutButton />
      </div>

      <div className="ats-nav">
        <button 
          onClick={() => { setShowForm(true); setShowDashboard(false); }}
          className={showForm ? 'active' : ''}
        >
          👤 Add New Recruit
        </button>
        <button 
          onClick={() => { setShowForm(false); setShowDashboard(true); }}
          className={showDashboard ? 'active' : ''}
        >
          📊 View Dashboard
        </button>
      </div>

      {showForm && <RecruitmentForm onFormSubmitted={handleFormSubmitted} />}
      {showDashboard && <RecruitmentDashboard />}
    </div>
  );
};

export default ALS; 