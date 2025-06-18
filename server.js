const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const User = require('./models/User');
const Audit = require('./models/Audit');

dotenv.config();

const app = express();

// Connect Database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Schedule monthly excuse hours reset on the 26th of each month at 00:00
cron.schedule('0 0 26 * *', async () => {
  try {
    console.log('Running monthly excuse hours reset...');
    const result = await User.updateMany(
      { role: { $in: ['employee', 'manager', 'admin', 'super_admin'] } },
      { $set: { excuseHoursLeft: 2 } }
    );
    console.log(`Monthly excuse hours reset completed. Updated ${result.modifiedCount} users.`);
    
    // Create audit log in database
    await Audit.create({
      action: 'MONTHLY_EXCUSE_HOURS_RESET',
      performedBy: 'SYSTEM',
      targetResource: 'user',
      description: `Monthly automatic reset of excuse hours for all users`,
      details: {
        usersUpdated: result.modifiedCount,
        resetValue: 2,
        resetDate: new Date()
      },
      severity: 'MEDIUM'
    });
    
    console.log(`Audit log created for monthly excuse hours reset affecting ${result.modifiedCount} users.`);
    
  } catch (error) {
    console.error('Error during monthly excuse hours reset:', error);
    
    // Log the error in audit as well
    try {
      await Audit.create({
        action: 'MONTHLY_EXCUSE_HOURS_RESET',
        performedBy: 'SYSTEM',
        targetResource: 'user',
        description: `Failed monthly excuse hours reset`,
        details: {
          error: error.message,
          failureDate: new Date()
        },
        severity: 'HIGH'
      });
    } catch (auditError) {
      console.error('Failed to create audit log for reset error:', auditError);
    }
  }
}, {
  scheduled: true,
  timezone: "Asia/Jerusalem" // Adjust timezone as needed
});

console.log('Monthly excuse hours reset scheduler initialized - runs on 26th of each month at 00:00');

// Routes will be added here
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/recruitment', require('./routes/recruitment'));
app.use('/api/audit', require('./routes/audit').router);
app.use('/api/excuse-hours', require('./routes/excuse-hours'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ msg: 'Internal server error', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- POST /api/auth/register');
  console.log('- POST /api/auth/login');
  console.log('- GET /api/users');
  console.log('- POST /api/excuse-hours/reset (Manual excuse hours reset)');
  console.log('- GET /api/excuse-hours/status (Excuse hours status)');
}); 