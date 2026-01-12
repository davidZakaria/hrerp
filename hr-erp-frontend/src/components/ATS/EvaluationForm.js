import React, { useState } from 'react';
import axios from 'axios';
import './EvaluationForm.css';
import API_URL from '../../config/api';

const EvaluationForm = ({ application, onSubmit, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    
    const [formData, setFormData] = useState({
        department: '',
        experience: '',
        education: '',
        communication: '',
        presentable: '',
        fitTheCulture: '',
        overallImpression: '',
        comment: ''
    });

    const ratingOptions = ['Good fit', 'Fit', 'Not fit'];
    const impressionOptions = ['Accepted', 'Pending', 'Rejected'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Validate all fields are filled
            if (!formData.department || !formData.experience || !formData.education || 
                !formData.communication || !formData.presentable || !formData.fitTheCulture || 
                !formData.overallImpression) {
                setMessage('Please fill in all required fields');
                setMessageType('error');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/job-applications/${application._id}/evaluate`,
                formData,
                { headers: { 'x-auth-token': token } }
            );

            setMessage('Evaluation submitted successfully!');
            setMessageType('success');
            
            setTimeout(() => {
                onSubmit();
            }, 1500);

        } catch (error) {
            console.error('Evaluation submission error:', error);
            setMessage(error.response?.data?.msg || 'Error submitting evaluation');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="evaluation-container">
            <div className="evaluation-header">
                <button onClick={onCancel} className="back-btn">
                    ← Cancel
                </button>
                <h2>📊 Evaluation Form</h2>
                <p>Evaluating: <strong>{application.fullName}</strong> for <strong>{application.positionAppliedFor}</strong></p>
            </div>

            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="evaluation-form">
                {/* Candidate Information */}
                <div className="form-section">
                    <h3>Candidate Information</h3>
                    
                    <div className="form-group">
                        <label>Candidate Name</label>
                        <input
                            type="text"
                            value={application.fullName}
                            disabled
                            className="disabled-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Department *</label>
                        <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            placeholder="e.g., Engineering, Marketing, Sales"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Position</label>
                        <input
                            type="text"
                            value={application.positionAppliedFor}
                            disabled
                            className="disabled-input"
                        />
                    </div>
                </div>

                {/* Rating Criteria */}
                <div className="form-section">
                    <h3>📈 Rating Criteria</h3>
                    <p className="section-subtitle">Rate each criterion based on your assessment</p>

                    <div className="rating-grid">
                        {/* Experience */}
                        <div className="rating-item">
                            <label>Experience *</label>
                            <div className="radio-group">
                                {ratingOptions.map(option => (
                                    <label key={option} className="radio-label">
                                        <input
                                            type="radio"
                                            name="experience"
                                            value={option}
                                            checked={formData.experience === option}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className={`radio-custom ${option.toLowerCase().replace(' ', '-')}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="rating-item">
                            <label>Education *</label>
                            <div className="radio-group">
                                {ratingOptions.map(option => (
                                    <label key={option} className="radio-label">
                                        <input
                                            type="radio"
                                            name="education"
                                            value={option}
                                            checked={formData.education === option}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className={`radio-custom ${option.toLowerCase().replace(' ', '-')}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Communication */}
                        <div className="rating-item">
                            <label>Communication *</label>
                            <div className="radio-group">
                                {ratingOptions.map(option => (
                                    <label key={option} className="radio-label">
                                        <input
                                            type="radio"
                                            name="communication"
                                            value={option}
                                            checked={formData.communication === option}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className={`radio-custom ${option.toLowerCase().replace(' ', '-')}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Presentable */}
                        <div className="rating-item">
                            <label>Presentable *</label>
                            <div className="radio-group">
                                {ratingOptions.map(option => (
                                    <label key={option} className="radio-label">
                                        <input
                                            type="radio"
                                            name="presentable"
                                            value={option}
                                            checked={formData.presentable === option}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className={`radio-custom ${option.toLowerCase().replace(' ', '-')}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Fit The Culture */}
                        <div className="rating-item">
                            <label>Fit The Culture *</label>
                            <div className="radio-group">
                                {ratingOptions.map(option => (
                                    <label key={option} className="radio-label">
                                        <input
                                            type="radio"
                                            name="fitTheCulture"
                                            value={option}
                                            checked={formData.fitTheCulture === option}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className={`radio-custom ${option.toLowerCase().replace(' ', '-')}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overall Impression */}
                <div className="form-section">
                    <h3>🎯 Overall Impression</h3>
                    
                    <div className="overall-impression">
                        {impressionOptions.map(option => (
                            <label key={option} className="impression-label">
                                <input
                                    type="radio"
                                    name="overallImpression"
                                    value={option}
                                    checked={formData.overallImpression === option}
                                    onChange={handleInputChange}
                                    required
                                />
                                <span className={`impression-card ${option.toLowerCase()}`}>
                                    <span className="impression-icon">
                                        {option === 'Accepted' && '✅'}
                                        {option === 'Pending' && '⏳'}
                                        {option === 'Rejected' && '❌'}
                                    </span>
                                    <span className="impression-text">{option}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Comments */}
                <div className="form-section">
                    <h3>💬 Additional Comments</h3>
                    
                    <div className="form-group">
                        <label>Comments (Optional)</label>
                        <textarea
                            name="comment"
                            value={formData.comment}
                            onChange={handleInputChange}
                            rows="5"
                            placeholder="Add any additional comments or observations about the candidate..."
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="cancel-btn">
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? '⏳ Submitting...' : '✅ Submit Evaluation'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EvaluationForm;

