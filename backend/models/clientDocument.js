/**
 * models/clientDocument.js
 *
 * Schema: "user".client_documents
 *
 * Tracks document receipt and reminder-sent status for each client per month.
 * One row per (client_id, document_month) combination.
 */

const TABLE = '"user".client_documents';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    client_id: { type: 'INTEGER', fk: '"user".clients(id)' },
    document_month: { type: 'VARCHAR(20)', description: "e.g. 'February 2026'" },

    // ── Document received flags ──
    gst_1_received: { type: 'BOOLEAN', default: false },
    gst_1_received_date: { type: 'TIMESTAMPTZ', nullable: true },
    bank_statement_received: { type: 'BOOLEAN', default: false },
    bank_statement_received_date: { type: 'TIMESTAMPTZ', nullable: true },
    tds_received: { type: 'BOOLEAN', default: false },
    tds_received_date: { type: 'TIMESTAMPTZ', nullable: true },

    // ── GST reminder flags ──
    gst_1_reminder_1_sent: { type: 'BOOLEAN', default: false },
    gst_1_reminder_1_sent_date: { type: 'TIMESTAMPTZ', nullable: true },
    gst_1_reminder_2_sent: { type: 'BOOLEAN', default: false },
    gst_1_reminder_2_sent_date: { type: 'TIMESTAMPTZ', nullable: true },

    // ── TDS reminder flags ──
    tds_reminder_1_sent: { type: 'BOOLEAN', default: false },
    tds_reminder_1_sent_date: { type: 'TIMESTAMPTZ', nullable: true },
    tds_reminder_2_sent: { type: 'BOOLEAN', default: false },
    tds_reminder_2_sent_date: { type: 'TIMESTAMPTZ', nullable: true },

    // ── Bank reminder flags ──
    bank_reminder_1_sent: { type: 'BOOLEAN', default: false },
    bank_reminder_1_sent_date: { type: 'TIMESTAMPTZ', nullable: true },
    bank_reminder_2_sent: { type: 'BOOLEAN', default: false },
    bank_reminder_2_sent_date: { type: 'TIMESTAMPTZ', nullable: true },

    notes: { type: 'TEXT', nullable: true },
    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    updated_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id                           SERIAL        PRIMARY KEY,
  client_id                    INTEGER       REFERENCES "user".clients(id) ON DELETE CASCADE,
  document_month               VARCHAR(20)   NOT NULL,

  gst_1_received               BOOLEAN       NOT NULL DEFAULT FALSE,
  gst_1_received_date          TIMESTAMPTZ,
  bank_statement_received      BOOLEAN       NOT NULL DEFAULT FALSE,
  bank_statement_received_date TIMESTAMPTZ,
  tds_received                 BOOLEAN       NOT NULL DEFAULT FALSE,
  tds_received_date            TIMESTAMPTZ,

  gst_1_reminder_1_sent        BOOLEAN       NOT NULL DEFAULT FALSE,
  gst_1_reminder_1_sent_date   TIMESTAMPTZ,
  gst_1_reminder_2_sent        BOOLEAN       NOT NULL DEFAULT FALSE,
  gst_1_reminder_2_sent_date   TIMESTAMPTZ,

  tds_reminder_1_sent          BOOLEAN       NOT NULL DEFAULT FALSE,
  tds_reminder_1_sent_date     TIMESTAMPTZ,
  tds_reminder_2_sent          BOOLEAN       NOT NULL DEFAULT FALSE,
  tds_reminder_2_sent_date     TIMESTAMPTZ,

  bank_reminder_1_sent         BOOLEAN       NOT NULL DEFAULT FALSE,
  bank_reminder_1_sent_date    TIMESTAMPTZ,
  bank_reminder_2_sent         BOOLEAN       NOT NULL DEFAULT FALSE,
  bank_reminder_2_sent_date    TIMESTAMPTZ,

  notes                        TEXT,
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (client_id, document_month)
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
