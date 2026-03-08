/**
 * models/whatsappGroup.js
 *
 * Schema: "user".whatsapp_groups  (if used)
 *
 * NOTE: WhatsApp group IDs are primarily stored on the clients table
 * (clients.whatsapp_group_id). This model represents the optional
 * separate whatsapp_groups table used by groupQueries.js.
 */

const TABLE = '"user".whatsapp_groups';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    group_id: { type: 'VARCHAR(255)', notNull: true, unique: true, description: 'WhatsApp group chat ID (e.g. 1234@g.us)' },
    group_name: { type: 'VARCHAR(255)', nullable: true },
    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    updated_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id         SERIAL        PRIMARY KEY,
  group_id   VARCHAR(255)  NOT NULL UNIQUE,
  group_name VARCHAR(255),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
