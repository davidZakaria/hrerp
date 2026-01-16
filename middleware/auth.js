const jwt = require('jsonwebtoken');

// Validate JWT_SECRET is configured - fail fast in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is not set in production');
    process.exit(1);
}

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('Auth middleware: No token provided for', req.method, req.originalUrl);
        }
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token - require JWT_SECRET, no fallback in production
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ msg: 'Server configuration error' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;
        if (process.env.NODE_ENV !== 'production') {
            console.log('Auth middleware: Token valid for user', req.user?.id, 'role:', req.user?.role);
        }
        next();
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('Auth middleware: Invalid token -', err.message);
        }
        res.status(401).json({ msg: 'Token is not valid' });
    }
}; 