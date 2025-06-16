import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Clear any existing auth data on component mount
        localStorage.clear();
    }, []);

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        
        try {
            console.log('Attempting login...');
            const response = await axios.post('http://localhost:5000/api/auth/login', formData);
            const data = response.data;
            
            console.log('Login response:', data);
            setMessage('Login successful!');

            // Store user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userName', data.name);

            console.log('User role:', data.role);

            // Determine redirect path based on role
            let redirectPath;
            if (data.role.includes('super_admin')) {
                redirectPath = '/super-admin';
            } else if (data.role.includes('admin')) {
                redirectPath = '/admin';
            } else {
                redirectPath = '/employee';
            }

            // Use the stored location if available, otherwise use determined path
            const from = location.state?.from?.pathname || redirectPath;
            console.log('Redirecting to:', from);

            // Delay navigation slightly to show success message
            setTimeout(() => {
                navigate(from, { replace: true });
            }, 1000);

        } catch (err) {
            console.error('Login error:', err);
            setMessage(err.response?.data?.msg || 'Error connecting to server');
            setLoading(false);
        }
    };

    return (
        <div className="njd-card">
            <div className="njd-title">NEW JERSEY DEVELOPMENTS</div>
            <div className="njd-subtitle">It's all about The Experience</div>
            <form className="njd-form" onSubmit={handleSubmit}>
                <label>Email</label>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <div className="forgot-password">
                    <a href="/forgot-password">Forgot Password?</a>
                </div>
            </form>
            {message && (
                <div 
                    className="njd-message" 
                    style={{ 
                        color: message.includes('successful') ? 'green' : 'red',
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: '4px',
                        backgroundColor: message.includes('successful') ? '#e8f5e9' : '#ffebee'
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
};

export default Login; 