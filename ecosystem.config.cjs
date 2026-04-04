/**
 * PM2 Ecosystem Configuration
 * 
 * Single process running both Next.js and Python agent via concurrently.
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env
 *   pm2 stop all
 *   pm2 delete all
 */

const os = require('os');
const path = require('path');

// Dynamic paths - works for any user
const HOME_DIR = os.homedir();
const APP_DIR = path.join(HOME_DIR, 'PHE');
const LOG_DIR = path.join(APP_DIR, 'logs');

module.exports = {
  apps: [
    {
      name: 'phe-app',
      script: 'npm',
      args: 'run start:all',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Graceful shutdown
      kill_timeout: 10000,
      // Logging
      error_file: path.join(LOG_DIR, 'app-error.log'),
      out_file: path.join(LOG_DIR, 'app-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
