/**
 * PM2 Ecosystem Config — HPRT Backend
 *
 * Two processes:
 *   1. hprt-api    — Express API server
 *   2. hprt-worker — pg-boss reminder worker (separate process)
 *
 * Usage:
 *   npm run pm2:start    — Start both processes
 *   npm run pm2:stop     — Stop both processes
 *   npm run pm2:logs     — Show logs for all processes
 *
 *   Or directly:
 *   pm2 start ecosystem.config.js
 *   pm2 stop  ecosystem.config.js
 *   pm2 logs
 */

module.exports = {
    apps: [
        {
            name: 'hprt-api',
            script: 'server.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
            env_development: {
                NODE_ENV: 'development',
            },
            // Restart on crash, up to 10 times within 15 minutes
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 1000,
            // Graceful shutdown timeout
            kill_timeout: 10000,
            // Log files
            out_file: 'logs/pm2-api-out.log',
            error_file: 'logs/pm2-api-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
        {
            name: 'hprt-worker',
            script: 'workers/reminderWorker.js',
            cwd: __dirname,
            instances: 1,        // Only ONE worker — prevents duplicate job processing
            exec_mode: 'fork',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
            env_development: {
                NODE_ENV: 'development',
            },
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 2000,
            kill_timeout: 15000, // Give worker extra time to finish in-progress jobs
            out_file: 'logs/pm2-worker-out.log',
            error_file: 'logs/pm2-worker-error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
