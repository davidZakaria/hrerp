import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ATSDashboard.css';
import EvaluationForm from './EvaluationForm';
import API_URL from '../../config/api';

const ATSDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showEvaluationForm, setShowEvaluationForm] = useState(false);
    const [managers, setManagers] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [evaluations, setEvaluations] = useState({});
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        fetchApplications();
        fetchManagers();
        fetchStatistics();
        const role = localStorage.getItem('userRole');
        setUserRole(role);
    }, []);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/job-applications`, {
                headers: { 'x-auth-token': token }
            });
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching applications:', error);
            setMessage('Error loading applications');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/users`, {
                headers: { 'x-auth-token': token }
            });
            const managersList = response.data.filter(user => user.role === 'manager');
            setManagers(managersList);
        } catch (error) {
            console.error('Error fetching managers:', error);
        }
    };

    const fetchStatistics = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/job-applications/stats/overview`, {
                headers: { 'x-auth-token': token }
            });
            setStatistics(response.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchEvaluations = async (applicationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/job-applications/${applicationId}/evaluations`, {
                headers: { 'x-auth-token': token }
            });
            setEvaluations(prev => ({
                ...prev,
                [applicationId]: response.data
            }));
        } catch (error) {
            console.error('Error fetching evaluations:', error);
        }
    };

    const handleAssignInterviewer = async (applicationId, interviewerId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_URL}/api/job-applications/${applicationId}/assign-interviewer`,
                { interviewerId },
                { headers: { 'x-auth-token': token } }
            );
            
            setMessage('Interviewer assigned successfully!');
            setMessageType('success');
            fetchApplications();
            
            setTimeout(() => {
                setMessage('');
            }, 3000);
        } catch (error) {
            console.error('Error assigning interviewer:', error);
            setMessage(error.response?.data?.msg || 'Error assigning interviewer');
            setMessageType('error');
        }
    };

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        fetchEvaluations(application._id);
    };

    const handleEvaluate = (application) => {
        setSelectedApplication(application);
        setShowEvaluationForm(true);
    };

    const handleEvaluationSubmitted = () => {
        setShowEvaluationForm(false);
        setSelectedApplication(null);
        fetchApplications();
        setMessage('Evaluation submitted successfully!');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            pending: 'status-pending',
            under_review: 'status-review',
            interview_scheduled: 'status-interview',
            evaluated: 'status-evaluated',
            accepted: 'status-accepted',
            rejected: 'status-rejected'
        };
        return statusClasses[status] || 'status-pending';
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            under_review: 'Under Review',
            interview_scheduled: 'Interview Scheduled',
            evaluated: 'Evaluated',
            accepted: 'Accepted',
            rejected: 'Rejected'
        };
        return labels[status] || status;
    };

    const filteredApplications = applications.filter(app => {
        const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
        const matchesSearch = 
            app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.positionAppliedFor.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const canEvaluate = (application) => {
        if (userRole === 'admin' || userRole === 'super_admin') {
            return !application.adminEvaluationCompleted;
        } else if (userRole === 'manager') {
            return !application.technicalEvaluationCompleted && 
                   application.assignedInterviewer?._id === localStorage.getItem('userId');
        }
        return false;
    };

    if (showEvaluationForm && selectedApplication) {
        return (
            <EvaluationForm
                application={selectedApplication}
                onSubmit={handleEvaluationSubmitted}
                onCancel={() => {
                    setShowEvaluationForm(false);
                    setSelectedApplication(null);
                }}
            />
        );
    }

    if (selectedApplication && !showEvaluationForm) {
        return (
            <div className="ats-container">
                <div className="ats-header">
                    <button onClick={() => setSelectedApplication(null)} className="back-btn">
                        ← Back to Applications
                    </button>
                    <h2>Application Details</h2>
                </div>

                <div className="application-details">
                    <div className="details-section">
                        <h3>👤 Personal Information</h3>
                        <div className="details-grid">
                            <div><strong>Full Name:</strong> {selectedApplication.fullName}</div>
                            <div><strong>Email:</strong> {selectedApplication.email}</div>
                            <div><strong>Phone:</strong> {selectedApplication.phoneNumber}</div>
                            <div><strong>Date of Birth:</strong> {new Date(selectedApplication.dateOfBirth).toLocaleDateString()}</div>
                            <div><strong>Address:</strong> {selectedApplication.address}</div>
                            {selectedApplication.linkedinProfile && (
                                <div>
                                    <strong>LinkedIn:</strong>{' '}
                                    <a href={selectedApplication.linkedinProfile} target="_blank" rel="noopener noreferrer">
                                        View Profile
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>💼 Position Information</h3>
                        <div className="details-grid">
                            <div><strong>Position:</strong> {selectedApplication.positionAppliedFor}</div>
                            <div><strong>Current Salary:</strong> {selectedApplication.currentSalary || 'N/A'}</div>
                            <div><strong>Expected Salary:</strong> {selectedApplication.expectedSalary}</div>
                            <div><strong>Available From:</strong> {new Date(selectedApplication.dateAvailableToStart).toLocaleDateString()}</div>
                            <div>
                                <strong>Status:</strong>{' '}
                                <span className={`status-badge ${getStatusBadgeClass(selectedApplication.status)}`}>
                                    {getStatusLabel(selectedApplication.status)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>🎓 Education Background</h3>
                        {selectedApplication.educationBackground.map((edu, index) => (
                            <div key={index} className="edu-item">
                                <div><strong>{edu.majorAndDegree}</strong></div>
                                <div>{edu.university}</div>
                                <div>Year: {edu.yearOfCompletion}</div>
                            </div>
                        ))}
                    </div>

                    <div className="details-section">
                        <h3>💼 Professional Background</h3>
                        {selectedApplication.professionalBackground.map((prof, index) => (
                            <div key={index} className="prof-item">
                                <div><strong>{prof.jobTitle}</strong> at {prof.companyName}</div>
                                <div>
                                    {new Date(prof.from).toLocaleDateString()} - {' '}
                                    {prof.to ? new Date(prof.to).toLocaleDateString() : 'Present'}
                                </div>
                                {prof.salary && <div>Salary: {prof.salary}</div>}
                            </div>
                        ))}
                    </div>

                    <div className="details-section">
                        <h3>📞 Reference</h3>
                        <div className="details-grid">
                            <div><strong>Name:</strong> {selectedApplication.reference.name}</div>
                            <div><strong>Position:</strong> {selectedApplication.reference.position}</div>
                            <div><strong>Phone:</strong> {selectedApplication.reference.phone}</div>
                        </div>
                    </div>

                    <div className="details-section">
                        <h3>📄 Resume</h3>
                        <a
                            href={`${API_URL}/${selectedApplication.resumeFilePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-link"
                        >
                            📎 View Resume ({selectedApplication.resumeFileName})
                        </a>
                    </div>

                    {/* Evaluations Section */}
                    <div className="details-section">
                        <h3>📊 Evaluations</h3>
                        {evaluations[selectedApplication._id] && evaluations[selectedApplication._id].length > 0 ? (
                            evaluations[selectedApplication._id].map((evaluation, index) => (
                                <div key={index} className="evaluation-summary">
                                    <h4>{evaluation.evaluatorRole === 'admin' ? '🔧 Admin' : '👨‍💼 Technical'} Evaluation</h4>
                                    <div><strong>Evaluator:</strong> {evaluation.evaluator.name}</div>
                                    <div><strong>Department:</strong> {evaluation.department}</div>
                                    <div><strong>Overall Impression:</strong> <span className={`impression-${evaluation.overallImpression.toLowerCase()}`}>{evaluation.overallImpression}</span></div>
                                    <div className="criteria-grid">
                                        <div>Experience: {evaluation.experience}</div>
                                        <div>Education: {evaluation.education}</div>
                                        <div>Communication: {evaluation.communication}</div>
                                        <div>Presentable: {evaluation.presentable}</div>
                                        <div>Culture Fit: {evaluation.fitTheCulture}</div>
                                    </div>
                                    {evaluation.comment && (
                                        <div className="eval-comment">
                                            <strong>Comment:</strong> {evaluation.comment}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p>No evaluations submitted yet.</p>
                        )}
                    </div>

                    {canEvaluate(selectedApplication) && (
                        <div className="action-buttons">
                            <button onClick={() => handleEvaluate(selectedApplication)} className="evaluate-btn">
                                ✍️ Submit Evaluation
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="ats-container">
            <div className="ats-header">
                <h1>🎯 Applicant Tracking System</h1>
                <p>Manage job applications and evaluations</p>
            </div>

            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}

            {/* Statistics Cards */}
            {statistics && (userRole === 'admin' || userRole === 'super_admin') && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{statistics.totalApplications}</div>
                        <div className="stat-label">Total Applications</div>
                    </div>
                    <div className="stat-card pending">
                        <div className="stat-value">{statistics.pendingApplications}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                    <div className="stat-card review">
                        <div className="stat-value">{statistics.underReview}</div>
                        <div className="stat-label">Under Review</div>
                    </div>
                    <div className="stat-card evaluated">
                        <div className="stat-value">{statistics.evaluated}</div>
                        <div className="stat-label">Evaluated</div>
                    </div>
                    <div className="stat-card accepted">
                        <div className="stat-value">{statistics.accepted}</div>
                        <div className="stat-label">Accepted</div>
                    </div>
                    <div className="stat-card rejected">
                        <div className="stat-value">{statistics.rejected}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="🔍 Search by name, email, or position..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-buttons">
                    <button
                        className={filterStatus === 'all' ? 'active' : ''}
                        onClick={() => setFilterStatus('all')}
                    >
                        All
                    </button>
                    <button
                        className={filterStatus === 'pending' ? 'active' : ''}
                        onClick={() => setFilterStatus('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={filterStatus === 'under_review' ? 'active' : ''}
                        onClick={() => setFilterStatus('under_review')}
                    >
                        Under Review
                    </button>
                    <button
                        className={filterStatus === 'evaluated' ? 'active' : ''}
                        onClick={() => setFilterStatus('evaluated')}
                    >
                        Evaluated
                    </button>
                </div>
            </div>

            {/* Applications Table */}
            {loading ? (
                <div className="loading">Loading applications...</div>
            ) : filteredApplications.length === 0 ? (
                <div className="no-data">No applications found</div>
            ) : (
                <div className="applications-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Position</th>
                                <th>Applied Date</th>
                                <th>Status</th>
                                <th>Evaluations</th>
                                <th>Assigned To</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApplications.map((app) => (
                                <tr key={app._id}>
                                    <td>
                                        <div><strong>{app.fullName}</strong></div>
                                        <div className="email-small">{app.email}</div>
                                    </td>
                                    <td>{app.positionAppliedFor}</td>
                                    <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                                            {getStatusLabel(app.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div>
                                            {app.adminEvaluationCompleted && '✅ Admin '}
                                            {app.technicalEvaluationCompleted && '✅ Technical'}
                                            {!app.adminEvaluationCompleted && !app.technicalEvaluationCompleted && '⏳ Pending'}
                                        </div>
                                    </td>
                                    <td>
                                        {(userRole === 'admin' || userRole === 'super_admin') ? (
                                            app.assignedInterviewer ? (
                                                <span>{app.assignedInterviewer.name}</span>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleAssignInterviewer(app._id, e.target.value)}
                                                    defaultValue=""
                                                    className="interviewer-select"
                                                >
                                                    <option value="" disabled>Assign Interviewer</option>
                                                    {managers.map(manager => (
                                                        <option key={manager._id} value={manager._id}>
                                                            {manager.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )
                                        ) : (
                                            app.assignedInterviewer?.name || 'Not Assigned'
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons-cell">
                                            <button
                                                onClick={() => handleViewDetails(app)}
                                                className="view-btn"
                                            >
                                                👁️ View
                                            </button>
                                            {canEvaluate(app) && (
                                                <button
                                                    onClick={() => handleEvaluate(app)}
                                                    className="evaluate-btn-small"
                                                >
                                                    ✍️ Evaluate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ATSDashboard;

