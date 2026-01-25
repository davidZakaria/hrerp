const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createAuditLog } = require('./audit');

// Allowed company email domains
const ALLOWED_EMAIL_DOMAINS = ['@newjerseyegypt.com', '@gycegypt.com'];

// Register User (Employee Registration)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, department, role, managedDepartments, employeeCode, workSchedule } = req.body;

        // Validate required fields
        if (!name || !email || !password || !department) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        // Validate company email domain
        const emailLower = email.toLowerCase();
        const isValidDomain = ALLOWED_EMAIL_DOMAINS.some(domain => emailLower.endsWith(domain));
        if (!isValidDomain) {
            return res.status(400).json({ msg: 'Registration is only allowed with company email addresses (@newjerseyegypt.com or @gycegypt.com)' });
        }

        // Validate employeeCode if provided
        if (employeeCode) {
            const existingUser = await User.findOne({ employeeCode });
            if (existingUser) {
                return res.status(400).json({ msg: 'Employee code already exists' });
            }
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists with this email address' });
        }

        // Create new user with pending status
        user = new User({
            name,
            email,
            password,
            department,
            role: role || 'employee', // Default to employee
            managedDepartments: role === 'manager' ? (managedDepartments || []) : [],
            status: 'pending', // New registrations are pending approval
            vacationDaysLeft: 21, // Default vacation days
            employeeCode: employeeCode || null,
            workSchedule: workSchedule || null
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        if (process.env.NODE_ENV !== 'production') {
            console.log('New user registered:', {
                id: user.id,
                name: user.name,
                role: user.role,
                status: user.status
            });
        }

        // Return success message (don't auto-login for pending users)
        res.json({ 
            msg: 'Registration successful! Your account is pending approval by an administrator.',
            userId: user.id,
            status: 'pending'
        });

    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if user is active
        if (user.status !== 'active') {
            if (user.status === 'pending') {
                return res.status(403).json({ msg: 'Your account is pending approval by an administrator. Please wait for activation.' });
            } else {
                return res.status(403).json({ msg: 'Account is not active. Please contact administrator.' });
            }
        }

        // Update last login (non-blocking - don't wait for it)
        User.updateOne({ _id: user._id }, { lastLogin: Date.now() }).exec();

        // Create audit log for login (non-blocking - fire and forget)
        createAuditLog({
            action: 'USER_LOGIN',
            performedBy: user._id,
            description: `User ${user.name} (${user.email}) logged in`,
            details: {
                email: user.email,
                role: user.role,
                loginTime: new Date()
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'LOW'
        }).catch(err => console.error('Audit log error:', err));

        if (process.env.NODE_ENV !== 'production') {
            console.log('User logged in:', {
                id: user.id,
                name: user.name,
                role: user.role
            });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email
            }
        };

        // Sign token - require JWT_SECRET, no fallback
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({ msg: 'Server configuration error' });
        }
        
        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                // Send response with user details
                const response = {
                    token,
                    role: user.role,
                    userId: user.id,
                    name: user.name,
                    email: user.email,
                    managedDepartments: user.managedDepartments || []
                };
                res.json(response);
            }
        );
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error');
    }
});

// Get logged in user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Request password reset
router.post('/reset-password-request', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ msg: 'Email is required.' });
    }
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // For security, we don't reveal if email exists or not
            return res.json({ msg: 'If an account with that email exists, a password reset link has been sent.' });
        }
        
        // Check if email configuration is available
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS environment variables.');
            return res.status(500).json({ 
                msg: 'Email service is not configured. Please contact your administrator.' 
            });
        }
        
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
            const mailOptions = {
                to: user.email,
                from: process.env.EMAIL_USER,
                subject: 'Password Reset Request - HR ERP System',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>You requested a password reset for your HR ERP account.</p>
                        <p>Click the button below to reset your password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #667eea; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                        <p><strong>This link is valid for 1 hour only.</strong></p>
                        <p>If you didn't request this password reset, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This is an automated email from the HR ERP System. Please do not reply to this email.
                        </p>
                    </div>
                `
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`Password reset email sent to: ${email}`);
            res.json({ msg: 'If an account with that email exists, a password reset link has been sent.' });
            
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            
            // Clear the reset token since email failed
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            return res.status(500).json({ 
                msg: 'Failed to send password reset email. Please try again later or contact support.' 
            });
        }
        
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ msg: 'Server error. Please try again later.' });
    }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ msg: 'Password has been reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router; 