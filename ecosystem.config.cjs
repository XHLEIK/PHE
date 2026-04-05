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
    // Next.js App - Instance 1 (Port 3000)
    // ─────────────────────────────────────────────────────────────────
    {
      name: 'phe-nextjs-3000',
      script: 'npm',
      args: 'start',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Logging
      error_file: path.join(LOG_DIR, 'nextjs-3000-error.log'),
      out_file: path.join(LOG_DIR, 'nextjs-3000-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
    },
    
    // ─────────────────────────────────────────────────────────────────
    // Next.js App - Instance 2 (Port 3001)
    // ─────────────────────────────────────────────────────────────────
    {
      name: 'phe-nextjs-3001',
      script: 'npm',
      args: 'start',
      cwd: APP_DIR,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Logging
      error_file: path.join(LOG_DIR, 'nextjs-3001-error.log'),
      out_file: path.join(LOG_DIR, 'nextjs-3001-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
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
        AGENT_HTTP_PORT: '8082',  // Health check server port (avoid conflicts)
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      // Graceful shutdown (longer for agent to disconnect from LiveKit)
      kill_timeout: 15000,           // Give 15s to cleanup before SIGKILL
      shutdown_with_message: true,   // Send SIGTERM first
      treekill: true,                // Kill entire process tree
      
      // Logging
      error_file: path.join(LOG_DIR, 'agent-error.log'),
      out_file: path.join(LOG_DIR, 'agent-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policy - longer delays to allow port release
      exp_backoff_restart_delay: 1000,  // Start with 1s, exponentially increase
      max_restarts: 10,
      restart_delay: 5000,              // Wait 5s before restart
      min_uptime: 10000,                // Must stay up 10s to be considered "started"
    },
  ],
};
