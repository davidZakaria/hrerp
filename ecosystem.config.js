module.exports = {
  apps: [{
    name: 'hr-erp-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Logging configuration
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Restart settings
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Environment variables for development
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    
    // Environment variables for production
    // IMPORTANT: Sensitive variables (JWT_SECRET, MONGODB_URI, etc.) must be set in:
    // - .env file in the project root, OR
    // - System environment variables, OR
    // - PM2 ecosystem file loaded with --env-file flag
    // Do NOT add secrets here - this file may be committed to version control
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
