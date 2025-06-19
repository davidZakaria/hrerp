const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('🔍 Connection details:', {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp',
      error: err.code || 'Unknown error code'
    });
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🚨 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected');
});

module.exports = connectDB; 