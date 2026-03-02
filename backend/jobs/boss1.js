/**
 * pg-boss singleton
 *
 * Provides a single PgBoss instance shared across the process.
 * Both the API server (for sending jobs) and the worker (for processing jobs)
 * use this module — each in their own process, so they each get their own connection.
 */
require('dotenv').config();
// pg-boss v10+ exports { PgBoss, ... } — destructure to get the constructor
const { PgBoss } = require('pg-boss');
const { logger } = require('../utils/logger');

let boss = null;

/**
 * Build the connection string from env vars, preferring DATABASE_URL.
 */
function buildConnectionString() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    const {
        PGUSER = 'hprt_prod',
        PGPASSWORD = 'xTjYhrMMJo5X',
        PGHOST = 'localhost',
        PGPORT = 5432,
        PGDATABASE = 'hprt_test_db',
    } = process.env;
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

/**
 * Get (or create and start) the pg-boss singleton.
 * Safe to call multiple times — returns the same instance.
 *
 * @returns {Promise<PgBoss>}
 */
async function getBoss() {
    if (boss) return boss;

    boss = new PgBoss({
        connectionString: buildConnectionString(),
        // Schema where pg-boss stores its internal tables
        schema: 'pgboss',

        // Retention: keep completed jobs for 7 days, failed/expired for 14 days
        archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
        deleteAfterSeconds: 60 * 60 * 24 * 14,

        // Monitoring interval
        monitorStateIntervalSeconds: 30,

        // How often the worker polls for new jobs (ms)
        // Only relevant for workers; API server uses this for sending only
        noScheduling: false,
    });

    boss.on('error', (err) => {
        logger.error('[pg-boss] Internal error:', err);
    });

    await boss.start();
    logger.info('[pg-boss] Started successfully');
    return boss;
}

/**
 * Stop pg-boss gracefully (call during shutdown).
 */
async function stopBoss() {
    if (boss) {
        await boss.stop();
        boss = null;
        logger.info('[pg-boss] Stopped');
    }
}

module.exports = { getBoss, stopBoss };
