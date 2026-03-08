/**
 * models/activityLog.js
 *
 * Covers three audit/log tables used by the application:
 *
 *   "user".system_logs          — general system events
 *   "user".document_update_logs — tracks when a document field is changed
 */

// ── system_logs ──────────────────────────────────────────────────────────────

const SYSTEM_LOG_TABLE = '"user".system_logs';

const SYSTEM_LOG_COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    event_type: { type: 'VARCHAR(50)', notNull: true, description: "e.g. 'login', 'logout', 'error'" },
    user_id: { type: 'INTEGER', nullable: true, fk: '"user".admin_users(id)' },
    message: { type: 'TEXT', notNull: true },
    details: { type: 'JSONB', nullable: true },
    timestamp: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const SYSTEM_LOG_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${SYSTEM_LOG_TABLE} (
  id         SERIAL       PRIMARY KEY,
  event_type VARCHAR(50)  NOT NULL,
  user_id    INTEGER,
  message    TEXT         NOT NULL,
  details    JSONB,
  timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

// ── document_update_logs ─────────────────────────────────────────────────────

const DOC_UPDATE_LOG_TABLE = '"user".document_update_logs';

const DOC_UPDATE_LOG_COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    client_id: { type: 'INTEGER', notNull: true, fk: '"user".clients(id)' },
    document_id: { type: 'INTEGER', nullable: true, fk: '"user".client_documents(id)' },
    document_type: { type: 'VARCHAR(50)', nullable: true, description: "'gst', 'tds', 'bank'" },
    update_type: { type: 'VARCHAR(50)', nullable: true, description: "'received', 'reminder_sent', etc." },
    user_id: { type: 'INTEGER', nullable: true, fk: '"user".admin_users(id)' },
    details: { type: 'JSONB', nullable: true },
    timestamp: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const DOC_UPDATE_LOG_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${DOC_UPDATE_LOG_TABLE} (
  id            SERIAL       PRIMARY KEY,
  client_id     INTEGER      NOT NULL,
  document_id   INTEGER,
  document_type VARCHAR(50),
  update_type   VARCHAR(50),
  user_id       INTEGER,
  details       JSONB,
  timestamp     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
`;

module.exports = {
    SYSTEM_LOG_TABLE, SYSTEM_LOG_COLUMNS, SYSTEM_LOG_CREATE_SQL,
    DOC_UPDATE_LOG_TABLE, DOC_UPDATE_LOG_COLUMNS, DOC_UPDATE_LOG_CREATE_SQL,
};
