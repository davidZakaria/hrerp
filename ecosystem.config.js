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
      PORT: 5000
      // IMPORTANT: JWT_SECRET and MONGODB_URI must be set in .env file or system environment
      // Do NOT add fallback values here - the application will fail fast if they're missing
    }
  }]
}; 