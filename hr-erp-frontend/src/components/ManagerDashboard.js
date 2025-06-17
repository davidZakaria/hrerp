import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManagerDashboard = ({ user, onLogout }) => {
  const [pendingForms, setPendingForms] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [actionType, setActionType] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingForms();
    fetchTeamMembers();
  }, []);

  const fetchPendingForms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/forms/manager/pending', {
        headers: { 'x-auth-token': token }
      });
      setPendingForms(response.data);
    } catch (error) {
      console.error('Error fetching pending forms:', error);
      setMessage('Error loading pending requests');
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/team-members', {
        headers: { 'x-auth-token': token }
      });
      setTeamMembers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setLoading(false);
    }
  };

  const openCommentModal = (form, action) => {
    setSelectedForm(form);
    setActionType(action);
    setComment('');
    setShowCommentModal(true);
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setSelectedForm(null);
    setActionType('');
    setComment('');
    setSubmitting(false);
  };

  const handleFormAction = async () => {
    if (!selectedForm || !actionType) return;
    
    // For rejection, require a comment
    if (actionType === 'reject' && !comment.trim()) {
      setMessage('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/forms/manager/${selectedForm._id}`, {
        action: actionType,
        managerComment: comment.trim()
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setMessage(`Request ${actionType}d successfully`);
      fetchPendingForms();
      closeCommentModal();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating form:', error);
      setMessage('Error updating request');
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Manager Dashboard...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-info">
          <h1>Manager Dashboard</h1>
          <p>Welcome, {user.name}</p>
          <p className="departments">Managing: {user.managedDepartments?.join(', ') || 'No departments'}</p>
          <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
            You can only see and manage requests from your assigned departments
          </small>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-card">
          <h3>{teamMembers.length}</h3>
          <p>My Team Members</p>
          <small>Active employees in managed departments</small>
        </div>
        <div className="stat-card">
          <h3>{pendingForms.length}</h3>
          <p>Pending Team Requests</p>
          <small>Awaiting your approval</small>
        </div>
        <div className="stat-card">
          <h3>{user.managedDepartments?.length || 0}</h3>
          <p>Managed Departments</p>
          <small>Under your supervision</small>
        </div>
      </div>

      {/* Team Members */}
      <div className="section">
        <h2>My Team Members</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontStyle: 'italic' }}>
          Showing only employees from your managed departments: {user.managedDepartments?.join(', ') || 'None'}
        </p>
        {teamMembers.length > 0 ? (
          <div className="team-grid">
            {teamMembers.map(member => (
              <div key={member._id} className="team-card">
                <h4>{member.name}</h4>
                <p>{member.department}</p>
                <span className="vacation-days">{member.vacationDaysLeft} days left</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-requests">No team members found in your managed departments</p>
        )}
      </div>

      {/* Pending Requests */}
      <div className="section">
        <h2>Pending Team Requests</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontStyle: 'italic' }}>
          Showing only requests from employees in your managed departments
        </p>
        {pendingForms.length > 0 ? (
          <div className="requests-list">
            {pendingForms.map(form => (
              <div key={form._id} className="request-card">
                <div className="request-info">
                  <h4>{form.user.name} - {form.type.toUpperCase()}</h4>
                  <p><strong>Department:</strong> {form.user.department}</p>
                  <p><strong>Dates:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                  <p><strong>Duration:</strong> {calculateDays(form.startDate, form.endDate)} days</p>
                  <p><strong>Reason:</strong> {form.reason}</p>
                  {form.vacationType && <p><strong>Type:</strong> {form.vacationType}</p>}
                  <p><strong>Submitted:</strong> {formatDate(form.createdAt)}</p>
                </div>
                <div className="request-actions">
                  <button 
                    onClick={() => openCommentModal(form, 'approve')}
                    className="approve-btn"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => openCommentModal(form, 'reject')}
                    className="reject-btn"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-requests">No pending requests from your team</p>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="modal-overlay" onClick={closeCommentModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h3>
              <button className="close-btn" onClick={closeCommentModal}>×</button>
            </div>
            
            {selectedForm && (
              <div className="modal-body">
                <div className="request-summary">
                  <h4>{selectedForm.user.name} - {selectedForm.type.toUpperCase()}</h4>
                  <p><strong>Department:</strong> {selectedForm.user.department}</p>
                  <p><strong>Dates:</strong> {formatDate(selectedForm.startDate)} - {formatDate(selectedForm.endDate)}</p>
                  <p><strong>Duration:</strong> {calculateDays(selectedForm.startDate, selectedForm.endDate)} days</p>
                  <p><strong>Reason:</strong> {selectedForm.reason}</p>
                </div>
                
                <div className="comment-section">
                  <label htmlFor="managerComment">
                    {actionType === 'approve' ? 'Comment (Optional):' : 'Reason for Rejection (Required):'}
                  </label>
                  <textarea
                    id="managerComment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      actionType === 'approve' 
                        ? "Add any comments about this approval..." 
                        : "Please provide a clear reason for rejection..."
                    }
                    rows={4}
                    className={actionType === 'reject' && !comment.trim() ? 'required-field' : ''}
                  />
                  {actionType === 'reject' && !comment.trim() && (
                    <small className="error-text">A reason for rejection is required</small>
                  )}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={closeCommentModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className={actionType === 'approve' ? 'approve-btn' : 'reject-btn'}
                onClick={handleFormAction}
                disabled={submitting || (actionType === 'reject' && !comment.trim())}
              >
                {submitting ? 'Processing...' : 
                 actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .manager-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .dashboard-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-info h1 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 2rem;
        }

        .user-info p {
          color: rgba(255, 255, 255, 0.8);
          margin: 5px 0;
        }

        .departments {
          font-style: italic;
          font-size: 0.9rem;
        }

        .logout-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.1);
          color: #2E7D32;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .message.error {
          background: rgba(244, 67, 54, 0.1);
          color: #C62828;
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.9);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .stat-card h3 {
          font-size: 2.5rem;
          margin: 0 0 10px 0;
          color: #667eea;
          font-weight: bold;
        }

        .stat-card p {
          color: #666;
          margin: 0;
          font-size: 1.1rem;
        }

        .section {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .section h2 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 1.5rem;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }

        .team-card {
          background: rgba(102, 126, 234, 0.1);
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #667eea;
        }

        .team-card h4 {
          margin: 0 0 5px 0;
          color: #333;
        }

        .team-card p {
          margin: 0 0 10px 0;
          color: #666;
        }

        .vacation-days {
          background: rgba(76, 175, 80, 0.2);
          color: #2E7D32;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .requests-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .request-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          margin-bottom: 15px;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 10px;
          border-left: 4px solid #667eea;
        }

        .request-info {
          flex: 1;
        }

        .request-info h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .request-info p {
          margin: 5px 0;
          color: #666;
          font-size: 0.9rem;
        }

        .request-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-left: 20px;
        }

        .approve-btn, .reject-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          min-width: 80px;
        }

        .approve-btn {
          background: #4CAF50;
          color: white;
        }

        .approve-btn:hover {
          background: #45a049;
        }

        .approve-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .reject-btn {
          background: #f44336;
          color: white;
        }

        .reject-btn:hover {
          background: #da190b;
        }

        .reject-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .no-requests {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 15px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.4rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-body {
          padding: 25px;
        }

        .request-summary {
          background: rgba(102, 126, 234, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .request-summary h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .request-summary p {
          margin: 5px 0;
          color: #666;
          font-size: 0.9rem;
        }

        .comment-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .comment-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.3s ease;
        }

        .comment-section textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .comment-section textarea.required-field {
          border-color: #f44336;
        }

        .error-text {
          color: #f44336;
          font-size: 0.8rem;
          margin-top: 5px;
          display: block;
        }

        .modal-actions {
          padding: 20px 25px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .cancel-btn {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          color: #666;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .cancel-btn:hover {
          background: #f5f5f5;
        }

        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ManagerDashboard; 