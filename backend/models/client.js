/**
 * models/client.js
 *
 * Schema: "user".clients
 *
 * Stores client company information and document capability flags.
 */

const TABLE = '"user".clients';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    name: { type: 'VARCHAR(255)', notNull: true },
    email_id_1: { type: 'VARCHAR(255)', nullable: true },
    email_id_2: { type: 'VARCHAR(255)', nullable: true },
    email_id_3: { type: 'VARCHAR(255)', nullable: true },
    whatsapp_group_id: { type: 'VARCHAR(255)', nullable: true, description: 'WhatsApp group chat ID (e.g. 1234567890-1234567890@g.us)' },
    gst_filing_type: { type: 'VARCHAR(50)', nullable: true, description: "e.g. 'Monthly', 'Quarterly'" },
    gst_1_enabled: { type: 'BOOLEAN', default: true, description: 'Whether GST 1 document collection is active for this client' },
    bank_statement_enabled: { type: 'BOOLEAN', default: true },
    tds_document_enabled: { type: 'BOOLEAN', default: true },
    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    updated_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id                     SERIAL        PRIMARY KEY,
  name                   VARCHAR(255)  NOT NULL,
  email_id_1             VARCHAR(255),
  email_id_2             VARCHAR(255),
  email_id_3             VARCHAR(255),
  whatsapp_group_id      VARCHAR(255),
  gst_filing_type        VARCHAR(50),
  gst_1_enabled          BOOLEAN       NOT NULL DEFAULT TRUE,
  bank_statement_enabled BOOLEAN       NOT NULL DEFAULT TRUE,
  tds_document_enabled   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
