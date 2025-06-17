# Email Configuration for Password Reset

## Quick Setup Guide

The password reset functionality requires email configuration. Here's how to set it up:

### 1. Create Environment Variables

Create a `.env` file in the root directory with these settings:

```env
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/hr-erp

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Required for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Application Configuration
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000/api

# Security
CORS_ORIGIN=http://localhost:3000
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS` (not your regular Gmail password)

### 3. Alternative Email Providers

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### 4. Testing

1. Restart the server after adding environment variables
2. Try the "Forgot Password" feature
3. Check your email for the reset link

### 5. Troubleshooting

**"Email service is not configured"**
- Make sure `.env` file exists with EMAIL_USER and EMAIL_PASS
- Restart the server after adding environment variables

**"Failed to send password reset email"**
- Check your email credentials
- Ensure 2FA is enabled and you're using an app password (for Gmail)
- Check if your email provider allows SMTP access

**"Unable to connect to server"**
- Make sure the backend server is running on port 5000
- Check if MongoDB is running

### 6. Security Notes

- Never commit `.env` file to version control
- Use app passwords, not regular passwords
- Consider using environment-specific configurations
- In production, use secure email services like SendGrid or AWS SES

## Current Status

The system will now show appropriate error messages:
- ✅ Better error handling for missing email configuration
- ✅ Network connection error detection
- ✅ Professional email templates
- ✅ Security-focused user feedback (doesn't reveal if email exists)

For immediate testing without email setup, users can contact administrators directly for password resets. 