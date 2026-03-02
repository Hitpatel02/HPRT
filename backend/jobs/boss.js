require("dotenv").config();
const { logger } = require("../utils/logger");

let boss = null;

function buildConnectionString() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const {
        PGUSER = "hprt_prod",
        PGPASSWORD = "xTjYhrMMJo5X",
        PGHOST = "localhost",
        PGPORT = 5432,
        PGDATABASE = "hprt_test_db",
    } = process.env;
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

async function getBoss() {
    if (boss) return boss;
    const imported = await import("pg-boss");
    const PgBoss = imported.PgBoss;
    boss = new PgBoss({
        connectionString: buildConnectionString(),
        schema: "pgboss",
        archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
        deleteAfterSeconds: 60 * 60 * 24 * 14,
        monitorStateIntervalSeconds: 30,
        noScheduling: false,
    });
    boss.on("error", (err) => {
        logger.error("[pg-boss] Internal error:", err.message);
    });
    await boss.start();
    logger.info("[pg-boss] Started successfully");
    return boss;
}

async function stopBoss() {
    if (boss) {
        await boss.stop();
        boss = null;
        logger.info("[pg-boss] Stopped");
    }
}

module.exports = { getBoss, stopBoss };
