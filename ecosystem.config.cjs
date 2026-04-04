/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 to manage both the Next.js app and the LiveKit Python agent.
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env
 *   pm2 stop all
 *   pm2 delete all
 */

module.exports = {
  apps: [
    {
      name: 'phe-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/home/azureuser/PHE',
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
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Logging
      error_file: '/home/azureuser/PHE/logs/nextjs-error.log',
      out_file: '/home/azureuser/PHE/logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 1000,
    },
    {
      name: 'phe-agent',
      script: 'python',
      args: 'lib/agent.py start',
      cwd: '/home/azureuser/PHE',
      interpreter: 'none',  // Don't use Node to interpret Python
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      // Graceful shutdown (longer for agent to disconnect from LiveKit)
      kill_timeout: 10000,
      // Logging
      error_file: '/home/azureuser/PHE/logs/agent-error.log',
      out_file: '/home/azureuser/PHE/logs/agent-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
