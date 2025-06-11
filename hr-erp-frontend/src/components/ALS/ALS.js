import React, { useState } from 'react';
import RecruitmentForm from './RecruitmentForm';
import RecruitmentDashboard from './RecruitmentDashboard';

const ALS = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  const handleFormSubmitted = () => {
    setShowForm(false);
    setShowDashboard(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <button 
          className="njd-btn"
          onClick={() => { setShowForm(true); setShowDashboard(false); }}
          style={{ marginRight: 10 }}
        >
          Add New Recruit
        </button>
        <button 
          className="njd-btn"
          onClick={() => { setShowForm(false); setShowDashboard(true); }}
        >
          View Dashboard
        </button>
      </div>

      {showForm && <RecruitmentForm onFormSubmitted={handleFormSubmitted} />}
      {showDashboard && <RecruitmentDashboard />}
    </div>
  );
};

export default ALS; 