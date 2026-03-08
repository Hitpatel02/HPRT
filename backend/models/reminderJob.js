/**
 * models/reminderJob.js
 *
 * Schema: "user".reminder_jobs
 *
 * One row per (settings_id, reminder_type, channel) combination.
 * Tracks the pg-boss job ID and lifecycle status for each scheduled reminder.
 *
 * Migration: ensureTable() in queries/reminderJobQueries.js
 * automatically adds the `channel` column if it was missing from an older install.
 */

const TABLE = '"user".reminder_jobs';

const COLUMNS = {
    id: { type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    settings_id: { type: 'INTEGER', fk: '"user".reminder_settings(id) ON DELETE SET NULL' },
    reminder_type: { type: 'VARCHAR(20)', notNull: true, description: "'gst_1' | 'gst_2' | 'tds_1' | 'tds_2'" },
    channel: { type: 'VARCHAR(20)', notNull: true, default: "'email'", description: "'email' | 'whatsapp'" },
    scheduled_for: { type: 'TIMESTAMPTZ', notNull: true, description: 'UTC datetime the pg-boss job fires' },
    status: { type: 'VARCHAR(20)', notNull: true, default: "'pending'", description: "'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'" },
    attempts: { type: 'INTEGER', default: 0 },
    last_error: { type: 'TEXT', nullable: true },
    processed_at: { type: 'TIMESTAMPTZ', nullable: true },
    boss_job_id: { type: 'UUID', nullable: true, description: 'pg-boss internal job UUID' },
    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    updated_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const INDEXES = [
    'CREATE INDEX IF NOT EXISTS reminder_jobs_settings_type_idx ON "user".reminder_jobs (settings_id, reminder_type)',
    'CREATE INDEX IF NOT EXISTS reminder_jobs_status_idx ON "user".reminder_jobs (status)',
    // Unique: one active job per settings+type+channel
    `CREATE UNIQUE INDEX IF NOT EXISTS reminder_jobs_unique
       ON "user".reminder_jobs (settings_id, reminder_type, channel)
       WHERE settings_id IS NOT NULL`,
];

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id   INTEGER     REFERENCES "user".reminder_settings(id) ON DELETE SET NULL,
  reminder_type VARCHAR(20) NOT NULL,
  channel       VARCHAR(20) NOT NULL DEFAULT 'email',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts      INTEGER     NOT NULL DEFAULT 0,
  last_error    TEXT,
  processed_at  TIMESTAMPTZ,
  boss_job_id   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

/** Valid status values */
const STATUS = { PENDING: 'pending', PROCESSING: 'processing', SENT: 'sent', FAILED: 'failed', CANCELLED: 'cancelled' };

/** Valid reminder types */
const REMINDER_TYPES = ['gst_1', 'gst_2', 'tds_1', 'tds_2'];

/** Valid channels */
const CHANNELS = ['email', 'whatsapp'];

module.exports = { TABLE, COLUMNS, INDEXES, CREATE_SQL, STATUS, REMINDER_TYPES, CHANNELS };
