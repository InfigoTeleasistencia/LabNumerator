/**
 * PM2 Ecosystem Configuration
 * Process manager configuration for production deployment
 */

module.exports = {
  apps: [{
    name: 'lab-numerator',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: './',
    instances: 1, // Change to 2 or 'max' for cluster mode
    exec_mode: 'fork', // Change to 'cluster' for multiple instances
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000,
    wait_ready: true,
    // Node.js options
    node_args: '--max-old-space-size=2048',
    // Environment-specific settings
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    // Logging options
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Advanced features
    instance_var: 'INSTANCE_ID',
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'YOUR_REPO_URL',
      path: '/var/www/LabNumerator',
      'post-deploy': 'yarn install && yarn build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

