const db = require('../config/db');

/**
 * Create a new reminder job tracking record.
 * @param {Object} data
 * @param {number}  data.settings_id   - FK to reminder_settings.id
 * @param {string}  data.reminder_type - 'gst_1' | 'gst_2' | 'tds_1' | 'tds_2'
 * @param {Date}    data.scheduled_for - Exact datetime the job will fire
 * @param {string}  [data.boss_job_id] - pg-boss internal job UUID
 * @returns {Promise<Object>} Created row
 */
async function createJob(data) {
    const { settings_id, reminder_type, scheduled_for, boss_job_id } = data;
    const result = await db.query(
        `INSERT INTO "user".reminder_jobs
       (settings_id, reminder_type, scheduled_for, boss_job_id, status, attempts)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING *`,
        [settings_id, reminder_type, scheduled_for, boss_job_id || null]
    );
    return result.rows[0];
}

/**
 * Update the status and related fields of a reminder job.
 * @param {string} id         - UUID of the reminder_jobs row
 * @param {Object} updates    - Fields to update (status, attempts, last_error, processed_at, boss_job_id)
 * @returns {Promise<Object>} Updated row
 */
async function updateJobStatus(id, updates) {
    const validFields = ['status', 'attempts', 'last_error', 'processed_at', 'boss_job_id'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (validFields.includes(key)) {
            setClauses.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
        }
    }

    if (setClauses.length === 0) throw new Error('No valid fields to update');

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
        `UPDATE "user".reminder_jobs
     SET ${setClauses.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
        values
    );
    return result.rows[0];
}

/**
 * Get a single reminder job by its UUID primary key.
 * @param {string} id - UUID
 * @returns {Promise<Object|null>}
 */
async function getJobById(id) {
    const result = await db.query(
        `SELECT * FROM "user".reminder_jobs WHERE id = $1`,
        [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all reminder jobs for a settings record.
 * @param {number} settingsId
 * @returns {Promise<Array>}
 */
async function getJobsBySettingsId(settingsId) {
    const result = await db.query(
        `SELECT * FROM "user".reminder_jobs
     WHERE settings_id = $1
     ORDER BY scheduled_for ASC`,
        [settingsId]
    );
    return result.rows;
}

/**
 * Check whether a job already exists for a given settings+type combination.
 * Used to prevent duplicate scheduling.
 * @param {number} settingsId
 * @param {string} reminderType
 * @returns {Promise<boolean>}
 */
async function jobExistsForType(settingsId, reminderType) {
    const result = await db.query(
        `SELECT id FROM "user".reminder_jobs
     WHERE settings_id = $1 AND reminder_type = $2
       AND status NOT IN ('failed', 'cancelled')`,
        [settingsId, reminderType]
    );
    return result.rows.length > 0;
}

/**
 * Mark all pending/processing jobs for a settings record as cancelled.
 * Called when settings are deleted.
 * @param {number} settingsId
 * @returns {Promise<number>} Number of cancelled rows
 */
async function cancelJobsBySettingsId(settingsId) {
    const result = await db.query(
        `UPDATE "user".reminder_jobs
     SET status = 'cancelled', updated_at = NOW()
     WHERE settings_id = $1
       AND status IN ('pending', 'processing')
     RETURNING id`,
        [settingsId]
    );
    return result.rowCount;
}

/**
 * Ensure the reminder_jobs table exists.
 * Called once at startup by the worker.
 */
async function ensureTable() {
    await db.query(`
    CREATE TABLE IF NOT EXISTS "user".reminder_jobs (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      settings_id   INTEGER     REFERENCES "user".reminder_settings(id) ON DELETE SET NULL,
      reminder_type VARCHAR(20) NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status        VARCHAR(20) NOT NULL DEFAULT 'pending',
      attempts      INTEGER     NOT NULL DEFAULT 0,
      last_error    TEXT,
      processed_at  TIMESTAMPTZ,
      boss_job_id   UUID,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS reminder_jobs_settings_type_idx
      ON "user".reminder_jobs (settings_id, reminder_type);
    CREATE INDEX IF NOT EXISTS reminder_jobs_status_idx
      ON "user".reminder_jobs (status);
  `);
}

module.exports = {
    createJob,
    updateJobStatus,
    getJobById,
    getJobsBySettingsId,
    jobExistsForType,
    cancelJobsBySettingsId,
    ensureTable,
};
