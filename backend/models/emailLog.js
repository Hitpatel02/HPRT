/**
 * models/emailLog.js
 *
 * Schema: "user".email_logs
 *
 * Records every email sent via Microsoft Graph API.
 */

const TABLE = '"user".email_logs';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    client_id: { type: 'INTEGER', nullable: true, fk: '"user".clients(id)' },
    email_to: { type: 'TEXT', notNull: true },
    email_subject: { type: 'TEXT', nullable: true },
    email_body: { type: 'TEXT', nullable: true },
    sent_at: { type: 'TIMESTAMPTZ', notNull: true },
    status: { type: 'VARCHAR(50)', notNull: true, description: "'sent' | 'failed'" },
    error_message: { type: 'TEXT', nullable: true },
    document_month: { type: 'VARCHAR(20)', nullable: true },
    reminder_number: { type: 'INTEGER', nullable: true, description: '1 or 2' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id              SERIAL       PRIMARY KEY,
  client_id       INTEGER,
  email_to        TEXT         NOT NULL,
  email_subject   TEXT,
  email_body      TEXT,
  sent_at         TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(50)  NOT NULL,
  error_message   TEXT,
  document_month  VARCHAR(20),
  reminder_number INTEGER
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
