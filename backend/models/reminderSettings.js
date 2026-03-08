/**
 * models/reminderSettings.js
 *
 * Schema: "user".reminder_settings
 *
 * One row per month. Stores all reminder dates, scheduler time, and channel toggles.
 */

const TABLE = '"user".reminder_settings';

const COLUMNS = {
    id: { type: 'SERIAL', primaryKey: true },
    current_month: { type: 'VARCHAR(30)', description: "e.g. 'March 2026'" },
    today_date: { type: 'DATE', nullable: true },

    // ── GST ──
    gst_due_date: { type: 'DATE', nullable: true },
    gst_reminder_1_date: { type: 'DATE', nullable: true, description: 'Date to fire the 1st GST reminder job' },
    gst_reminder_2_date: { type: 'DATE', nullable: true },

    // ── TDS ──
    tds_due_date: { type: 'DATE', nullable: true },
    tds_reminder_1_date: { type: 'DATE', nullable: true },
    tds_reminder_2_date: { type: 'DATE', nullable: true },

    // ── Scheduler time (IST) ──
    scheduler_hour: { type: 'INTEGER', default: 9, description: '12-hour clock (1–12)' },
    scheduler_minute: { type: 'INTEGER', default: 0, description: '0–59' },
    scheduler_am_pm: { type: 'VARCHAR(2)', default: "'AM'", description: "'AM' | 'PM'" },

    // ── Channel toggles ──
    enable_email_reminders: { type: 'BOOLEAN', default: true },
    enable_whatsapp_reminders: { type: 'BOOLEAN', default: true },

    // ── Optional password protection ──
    password: { type: 'VARCHAR(255)', nullable: true },

    created_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
    updated_at: { type: 'TIMESTAMPTZ', default: 'NOW()' },
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE} (
  id                        SERIAL        PRIMARY KEY,
  current_month             VARCHAR(30),
  today_date                DATE,
  gst_due_date              DATE,
  gst_reminder_1_date       DATE,
  gst_reminder_2_date       DATE,
  tds_due_date              DATE,
  tds_reminder_1_date       DATE,
  tds_reminder_2_date       DATE,
  scheduler_hour            INTEGER       NOT NULL DEFAULT 9,
  scheduler_minute          INTEGER       NOT NULL DEFAULT 0,
  scheduler_am_pm           VARCHAR(2)    NOT NULL DEFAULT 'AM',
  enable_email_reminders    BOOLEAN       NOT NULL DEFAULT TRUE,
  enable_whatsapp_reminders BOOLEAN       NOT NULL DEFAULT TRUE,
  password                  VARCHAR(255),
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
`;

module.exports = { TABLE, COLUMNS, CREATE_SQL };
