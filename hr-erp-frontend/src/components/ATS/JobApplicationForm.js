import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './JobApplicationForm.css';
import API_URL from '../../config/api';
import logger from '../../utils/logger';

const JobApplicationForm = () => {
    useTranslation(); // Initialize i18n
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [resumeFileName, setResumeFileName] = useState('');
    const [parsingResume, setParsingResume] = useState(false);
    
    const [formData, setFormData] = useState({
        // Personal Information
        fullName: '',
        dateOfBirth: '',
        address: '',
        email: '',
        phoneNumber: '',
        linkedinProfile: '',
        
        // Position Information
        positionAppliedFor: '',
        currentSalary: '',
        expectedSalary: '',
        dateAvailableToStart: '',
        
        // Education Background
        educationBackground: [{
            university: '',
            majorAndDegree: '',
            yearOfCompletion: ''
        }],
        
        // Professional Background
        professionalBackground: [{
            companyName: '',
            jobTitle: '',
            from: '',
            to: '',
            salary: ''
        }],
        
        // Reference
        reference: {
            name: '',
            position: '',
            phone: ''
        },
        
        // Resume tracking
        resumeFilePath: '',
        resumeFileName: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name.startsWith('reference.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                reference: {
                    ...prev.reference,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleEducationChange = (index, field, value) => {
        const newEducation = [...formData.educationBackground];
        newEducation[index][field] = value;
        setFormData(prev => ({ ...prev, educationBackground: newEducation }));
    };

    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            educationBackground: [...prev.educationBackground, {
                university: '',
                majorAndDegree: '',
                yearOfCompletion: ''
            }]
        }));
    };

    const removeEducation = (index) => {
        if (formData.educationBackground.length > 1) {
            const newEducation = formData.educationBackground.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, educationBackground: newEducation }));
        }
    };

    const handleProfessionalChange = (index, field, value) => {
        const newProfessional = [...formData.professionalBackground];
        newProfessional[index][field] = value;
        setFormData(prev => ({ ...prev, professionalBackground: newProfessional }));
    };

    const addProfessionalBackground = () => {
        setFormData(prev => ({
            ...prev,
            professionalBackground: [...prev.professionalBackground, {
                companyName: '',
                jobTitle: '',
                from: '',
                to: '',
                salary: ''
            }]
        }));
    };

    const removeProfessionalBackground = (index) => {
        if (formData.professionalBackground.length > 1) {
            const newProfessional = formData.professionalBackground.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, professionalBackground: newProfessional }));
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setMessage('Resume file size must be less than 5MB');
            setMessageType('error');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            setMessage('Only PDF, DOC, and DOCX files are allowed');
            setMessageType('error');
            return;
        }

        setResumeFile(file);
        setResumeFileName(file.name);
        setParsingResume(true);
        setMessage('Parsing resume... Please wait');
        setMessageType('success');

        try {
            const formDataUpload = new FormData();
            formDataUpload.append('resume', file);

            const response = await axios.post(`${API_URL}/api/job-applications/parse-resume`, formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { parsedData, fileName, filePath } = response.data;

            // Auto-fill form with parsed data
            logger.log('🔍 Parsed Data from Backend:', parsedData);
            
            setFormData(prev => ({
                ...prev,
                fullName: parsedData.fullName || prev.fullName,
                email: parsedData.email || prev.email,
                phoneNumber: parsedData.phoneNumber || prev.phoneNumber,
                linkedinProfile: parsedData.linkedinProfile || prev.linkedinProfile,
                address: parsedData.address || prev.address,
                dateOfBirth: parsedData.dateOfBirth ? parsedData.dateOfBirth.split('/').reverse().join('-') : prev.dateOfBirth,
                educationBackground: parsedData.educationBackground && parsedData.educationBackground.length > 0 
                    ? parsedData.educationBackground.map(edu => ({
                        university: edu.university || '',
                        majorAndDegree: edu.majorAndDegree || '',
                        yearOfCompletion: edu.yearOfCompletion || ''
                    }))
                    : prev.educationBackground,
                professionalBackground: parsedData.professionalBackground && parsedData.professionalBackground.length > 0 
                    ? parsedData.professionalBackground.map(exp => ({
                        companyName: exp.companyName || '',
                        jobTitle: exp.jobTitle || '',
                        from: exp.from ? new Date(exp.from).toISOString().split('T')[0] : '',
                        to: exp.to ? new Date(exp.to).toISOString().split('T')[0] : '',
                        salary: exp.salary || ''
                    }))
                    : prev.professionalBackground,
                resumeFileName: fileName,
                resumeFilePath: filePath
            }));

            // Count filled fields
            const eduCount = parsedData.educationBackground?.length || 0;
            const expCount = parsedData.professionalBackground?.length || 0;
            
            setMessage(`Resume uploaded successfully! Auto-filled: ${eduCount} education entries, ${expCount} work experiences. Please review and complete any missing fields.`);
            setMessageType('success');

        } catch (error) {
            console.error('Resume upload error:', error);
            setMessage(error.response?.data?.msg || 'Error uploading resume. Please try again.');
            setMessageType('error');
        } finally {
            setParsingResume(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Validate required fields
            if (!formData.fullName || !formData.email || !formData.phoneNumber || 
                !formData.positionAppliedFor || !formData.resumeFilePath) {
                setMessage('Please fill in all required fields and upload your resume');
                setMessageType('error');
                setLoading(false);
                return;
            }

            const response = await axios.post(`${API_URL}/api/job-applications`, formData);

            setMessage(response.data.msg);
            setMessageType('success');

            // Reset form after successful submission
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (error) {
            console.error('Application submission error:', error);
            setMessage(error.response?.data?.msg || 'Error submitting application. Please try again.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="job-application-container">
            <div className="job-application-header">
                <h1>Job Application Form</h1>
                <p>Join our team! Please fill out the form below to apply for a position.</p>
            </div>

            {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="job-application-form">
                {/* Resume Upload Section - At the top */}
                <div className="form-section resume-section">
                    <h2>📄 Upload Resume/CV</h2>
                    <p className="section-subtitle">Upload your resume to auto-fill the form (PDF, DOC, DOCX)</p>
                    
                    <div className="file-upload-wrapper">
                        <label htmlFor="resume-upload" className="file-upload-label">
                            {resumeFileName ? (
                                <span>✅ {resumeFileName}</span>
                            ) : (
                                <span>📎 Choose Resume/CV File</span>
                            )}
                        </label>
                        <input
                            type="file"
                            id="resume-upload"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeUpload}
                            disabled={parsingResume}
                            required
                        />
                        {parsingResume && <div className="spinner">⏳ Parsing...</div>}
                    </div>
                </div>

                {/* Personal Information */}
                <div className="form-section">
                    <h2>👤 Personal Information</h2>
                    
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Date of Birth *</label>
                        <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Address *</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            rows="3"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>LinkedIn Profile</label>
                        <input
                            type="url"
                            name="linkedinProfile"
                            value={formData.linkedinProfile}
                            onChange={handleInputChange}
                            placeholder="https://linkedin.com/in/your-profile"
                        />
                    </div>
                </div>

                {/* Position Information */}
                <div className="form-section">
                    <h2>💼 Position Information</h2>

                    <div className="form-group">
                        <label>Position Applied For *</label>
                        <input
                            type="text"
                            name="positionAppliedFor"
                            value={formData.positionAppliedFor}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Current Salary</label>
                            <input
                                type="number"
                                name="currentSalary"
                                value={formData.currentSalary}
                                onChange={handleInputChange}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="form-group">
                            <label>Expected Salary *</label>
                            <input
                                type="number"
                                name="expectedSalary"
                                value={formData.expectedSalary}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Date Available to Start *</label>
                        <input
                            type="date"
                            name="dateAvailableToStart"
                            value={formData.dateAvailableToStart}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>

                {/* Education Background */}
                <div className="form-section">
                    <h2>🎓 Education Background</h2>
                    
                    {formData.educationBackground.map((edu, index) => (
                        <div key={index} className="repeatable-section">
                            <h3>Education #{index + 1}</h3>
                            
                            <div className="form-group">
                                <label>University *</label>
                                <input
                                    type="text"
                                    value={edu.university}
                                    onChange={(e) => handleEducationChange(index, 'university', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Major & Degree *</label>
                                <input
                                    type="text"
                                    value={edu.majorAndDegree}
                                    onChange={(e) => handleEducationChange(index, 'majorAndDegree', e.target.value)}
                                    placeholder="e.g., Bachelor of Science in Computer Science"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Year of Completion *</label>
                                <input
                                    type="number"
                                    value={edu.yearOfCompletion}
                                    onChange={(e) => handleEducationChange(index, 'yearOfCompletion', e.target.value)}
                                    min="1950"
                                    max="2030"
                                    required
                                />
                            </div>

                            {formData.educationBackground.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeEducation(index)}
                                    className="remove-btn"
                                >
                                    ❌ Remove
                                </button>
                            )}
                        </div>
                    ))}

                    <button type="button" onClick={addEducation} className="add-btn">
                        ➕ Add Another Education
                    </button>
                </div>

                {/* Professional Background */}
                <div className="form-section">
                    <h2>💼 Professional Background</h2>
                    
                    {formData.professionalBackground.map((prof, index) => (
                        <div key={index} className="repeatable-section">
                            <h3>Experience #{index + 1}</h3>
                            
                            <div className="form-group">
                                <label>Company Name *</label>
                                <input
                                    type="text"
                                    value={prof.companyName}
                                    onChange={(e) => handleProfessionalChange(index, 'companyName', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Job Title *</label>
                                <input
                                    type="text"
                                    value={prof.jobTitle}
                                    onChange={(e) => handleProfessionalChange(index, 'jobTitle', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>From *</label>
                                    <input
                                        type="date"
                                        value={prof.from}
                                        onChange={(e) => handleProfessionalChange(index, 'from', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>To (Leave blank if current)</label>
                                    <input
                                        type="date"
                                        value={prof.to}
                                        onChange={(e) => handleProfessionalChange(index, 'to', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Salary</label>
                                <input
                                    type="number"
                                    value={prof.salary}
                                    onChange={(e) => handleProfessionalChange(index, 'salary', e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>

                            {formData.professionalBackground.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeProfessionalBackground(index)}
                                    className="remove-btn"
                                >
                                    ❌ Remove
                                </button>
                            )}
                        </div>
                    ))}

                    <button type="button" onClick={addProfessionalBackground} className="add-btn">
                        ➕ Add Another Experience
                    </button>
                </div>

                {/* Reference */}
                <div className="form-section">
                    <h2>📞 Reference</h2>
                    
                    <div className="form-group">
                        <label>Name *</label>
                        <input
                            type="text"
                            name="reference.name"
                            value={formData.reference.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Position *</label>
                        <input
                            type="text"
                            name="reference.position"
                            value={formData.reference.position}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone *</label>
                        <input
                            type="tel"
                            name="reference.phone"
                            value={formData.reference.phone}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading || parsingResume || !formData.resumeFilePath}
                    >
                        {loading ? '⏳ Submitting...' : '📤 Submit Application'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default JobApplicationForm;

