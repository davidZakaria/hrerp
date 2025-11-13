const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./models/User');
const Audit = require('./models/Audit');

// Load environment variables
dotenv.config();

const app = express();

// Initialize server after database connection
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the server only after database connection is established
    const PORT = process.env.PORT || 5001;
    const server = app.listen(PORT, () => {
      console.log(`
🚀 HR-ERP Server running on port ${PORT}
📅 Environment: ${process.env.NODE_ENV || 'development'}
🔒 Security: Helmet enabled
⚡ Performance: Compression enabled
🔄 Rate limiting: Active
💾 Database: ${require('mongoose').connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}
    `);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Close server
        server.close(async () => {
          console.log('HTTP server closed.');
          
          try {
            // Close database connection using modern syntax
            await require('mongoose').connection.close();
            console.log('Database connection closed.');
            process.exit(0);
          } catch (dbError) {
            console.error('Error closing database connection:', dbError);
            process.exit(1);
          }
        });
      } catch (serverError) {
        console.error('Error closing server:', serverError);
        process.exit(1);
      }
      
      // Force close after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// CORS configuration - MUST BE FIRST to handle preflight requests
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins in development
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With', 
        'Content-Type', 
        'Accept',
        'Authorization',
        'x-auth-token',
        'Access-Control-Allow-Headers',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
};

// Enable CORS before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5000", "ws://localhost:3000"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Compression middleware for better performance
app.use(compression());

// Rate limiting - placed after CORS to avoid interfering with preflight requests
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 500 : 1000, // More generous limits for development
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for preflight requests
        if (req.method === 'OPTIONS') return true;
        
        // Skip rate limiting for health check and metrics endpoints
        if (req.path === '/api/health' || req.path === '/api/metrics') return true;
        
        // Skip rate limiting for static files and assets
        if (req.path.startsWith('/static/') || req.path.startsWith('/assets/')) return true;
        
        // In development, be more lenient with rate limiting
        if (process.env.NODE_ENV !== 'production' && req.ip === '::1' || req.ip === '127.0.0.1') {
            return true; // Skip rate limiting for localhost in development
        }
        
        return false;
    }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 50, // More generous for development
    message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
    skip: (req) => {
        // Skip rate limiting for preflight requests
        if (req.method === 'OPTIONS') return true;
        
        // In development, be more lenient with auth rate limiting
        if (process.env.NODE_ENV !== 'production' && (req.ip === '::1' || req.ip === '127.0.0.1')) {
            return true; // Skip auth rate limiting for localhost in development
        }
        
        return false;
    }
});
app.use('/api/auth/login', authLimiter);

// Body parsing middleware with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb'
}));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        // Log slow requests
        if (duration > 1000) {
            console.warn('Slow request detected:', logData);
        }
        
        // Log errors
        if (res.statusCode >= 400) {
            console.error('Request error:', logData);
        }
    });
    
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    };
    
    res.json(healthcheck);
});

// Performance monitoring endpoint (admin only)
app.get('/api/metrics', async (req, res) => {
    try {
        // Basic auth check (you might want to use proper auth middleware)
        const token = req.header('x-auth-token');
        if (!token) {
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id);
        
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const metrics = {
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                nodeVersion: process.version
            },
            database: {
                // Add database connection status
                connected: require('mongoose').connection.readyState === 1
            },
            cache: {
                // If you implement Redis or other caching
                status: 'not implemented'
            }
        };

        res.json(metrics);
    } catch (error) {
        console.error('Metrics endpoint error:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/recruitment', require('./routes/recruitment'));
app.use('/api/job-applications', require('./routes/jobApplications'));
app.use('/api/audit', require('./routes/audit').router);
app.use('/api/excuse-hours', require('./routes/excuse-hours'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'hr-erp-frontend/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'hr-erp-frontend', 'build', 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let error = {
        message: err.message || 'Internal server error',
        status: err.status || 500
    };
    
    if (isDevelopment) {
        error.stack = err.stack;
        error.details = err;
    }
    
    // Log critical errors
    if (error.status >= 500) {
        console.error('Critical server error:', {
            error: err,
            request: {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    
    res.status(error.status).json({
        success: false,
        error: error.message,
        ...(isDevelopment && { details: error })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Optimized monthly excuse hours reset with better error handling
cron.schedule('0 0 1 * *', async () => {
    console.log('Starting monthly excuse hours reset...');
    const startTime = Date.now();
    
    try {
        const result = await User.updateMany(
            { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
            { $set: { excuseHoursLeft: 2 } }
        );

        const duration = Date.now() - startTime;
        console.log(`Monthly excuse hours reset completed in ${duration}ms. Updated ${result.modifiedCount} users.`);

        // Create audit log
        await Audit.create({
            action: 'MONTHLY_EXCUSE_HOURS_RESET',
            performedBy: 'SYSTEM',
            targetResource: 'user',
            description: `Automated monthly reset of excuse hours for all users`,
            details: {
                usersUpdated: result.modifiedCount,
                resetValue: 2,
                resetDate: new Date(),
                duration: duration,
                triggerType: 'cron_job'
            },
            severity: 'LOW'
        });

    } catch (error) {
        console.error('Monthly excuse hours reset failed:', error);
        
        // Create error audit log
        await Audit.create({
            action: 'MONTHLY_EXCUSE_HOURS_RESET',
            performedBy: 'SYSTEM',
            targetResource: 'user',
            description: `Failed automated monthly reset of excuse hours`,
            details: {
                error: error.message,
                resetDate: new Date(),
                triggerType: 'cron_job'
            },
            severity: 'HIGH'
        }).catch(auditError => {
            console.error('Failed to create audit log for failed reset:', auditError);
        });
    }
});

// Start the server
startServer().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

module.exports = app; 