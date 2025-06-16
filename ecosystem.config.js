module.exports = {
  apps: [{
    name: 'hr-erp-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp',
      JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
    }
  }]
}; 