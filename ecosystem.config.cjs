/**
 * PM2 Ecosystem Configuration
 * 
 * Runs 2 Node.js instances (cluster mode) + 1 Python agent
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
    // ─────────────────────────────────────────────────────────────────
    // Next.js App (2 instances with load balancing)
    // ─────────────────────────────────────────────────────────────────
    {
      name: 'phe-nextjs',
      script: 'npm',
      args: 'start',
      cwd: APP_DIR,
      instances: 2,  // 2 instances for load balancing
      exec_mode: 'cluster',  // Cluster mode for automatic load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 3000,  // PM2 will auto-increment: 3000, 3001
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Logging
      error_file: path.join(LOG_DIR, 'nextjs-error.log'),
      out_file: path.join(LOG_DIR, 'nextjs-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
    },
    
    // ─────────────────────────────────────────────────────────────────
    // Python LiveKit Agent (single instance)
    // ─────────────────────────────────────────────────────────────────
    {
      name: 'phe-agent',
      script: path.join(APP_DIR, 'lib', 'agent.py'),
      args: 'start',
      cwd: APP_DIR,
      interpreter: path.join(APP_DIR, 'venv', 'bin', 'python'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      // Graceful shutdown (longer for agent to disconnect from LiveKit)
      kill_timeout: 10000,
      
      // Logging
      error_file: path.join(LOG_DIR, 'agent-error.log'),
      out_file: path.join(LOG_DIR, 'agent-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
