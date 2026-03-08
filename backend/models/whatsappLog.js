/**
 * models/whatsappLog.js
 *
 * Schema: "user".whatsapp_logs
 *
 * Records every WhatsApp message send attempt (success or failure).
 * Auto-created by whatsappService.js if missing.
 */

const TABLE = '"user".whatsapp_logs';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    client_id: { type: 'INTEGER', nullable: true, fk: '"user".clients(id)' },
    group_id: { type: 'VARCHAR(255)', notNull: true, description: 'WhatsApp group chat ID' },
    message: { type: 'TEXT', notNull: true },
    status: { type: 'VARCHAR(50)', notNull: true, description: "'sent' | 'failed'" },
    sent_at: { type: 'TIMESTAMPTZ', notNull: true },
    error_message: { type: 'TEXT', nullable: true },
    created_at: { type: 'TIMESTAMPTZ', default: 'CURRENT_TIMESTAMP' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id            SERIAL        PRIMARY KEY,
  client_id     INTEGER,
  group_id      VARCHAR(255)  NOT NULL,
  message       TEXT          NOT NULL,
  status        VARCHAR(50)   NOT NULL,
  sent_at       TIMESTAMPTZ   NOT NULL,
  error_message TEXT,
  created_at    TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
