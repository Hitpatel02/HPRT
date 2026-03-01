const db = require('../config/db');

/**
 * Get latest reminder settings
 * @returns {Promise<Object>} - The reminder settings or null if not found
 */
async function getLatestReminderSettings() {
  const result = await db.query(
    `SELECT id, current_month, 
           today_date::DATE as today_date, 
           gst_due_date::DATE as gst_due_date, 
           gst_reminder_1_date::DATE as gst_reminder_1_date, 
           gst_reminder_2_date::DATE as gst_reminder_2_date,
           tds_due_date::DATE as tds_due_date,
           tds_reminder_1_date::DATE as tds_reminder_1_date,
           tds_reminder_2_date::DATE as tds_reminder_2_date,
           password, scheduler_hour, scheduler_minute, scheduler_am_pm,
           enable_whatsapp_reminders, enable_email_reminders,
           created_at, updated_at
     FROM "user".reminder_settings 
     ORDER BY updated_at DESC LIMIT 1`
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get reminder settings by ID
 * @param {number} id - Settings ID
 * @returns {Promise<Object>} - The reminder settings or null if not found
 */
async function getReminderSettingsById(id) {
  const result = await db.query(
    `SELECT id, current_month, 
           today_date::DATE as today_date, 
           gst_due_date::DATE as gst_due_date, 
           gst_reminder_1_date::DATE as gst_reminder_1_date, 
           gst_reminder_2_date::DATE as gst_reminder_2_date,
           tds_due_date::DATE as tds_due_date,
           tds_reminder_1_date::DATE as tds_reminder_1_date,
           tds_reminder_2_date::DATE as tds_reminder_2_date,
           password, scheduler_hour, scheduler_minute, scheduler_am_pm,
           enable_whatsapp_reminders, enable_email_reminders,
           created_at, updated_at
     FROM "user".reminder_settings 
     WHERE id = $1`,
    [id]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get available reminder months
 * @returns {Promise<Array>} - Array of available months with year and month
 */
async function getAvailableMonths() {
  const result = await db.query(
    `SELECT DISTINCT 
        EXTRACT(MONTH FROM today_date)::INTEGER as month,
        EXTRACT(YEAR FROM today_date)::INTEGER as year
     FROM "user".reminder_settings 
     WHERE today_date IS NOT NULL
     ORDER BY year DESC, month DESC`
  );
  
  return result.rows;
}

/**
 * Get settings for a specific month
 * @param {string} monthYearString - Month and year string (e.g., "January 2023")
 * @returns {Promise<Object>} - Settings for the month or null if not found
 */
async function getSettingsForMonth(monthYearString) {
  const result = await db.query(
    `SELECT id, current_month, 
            today_date::DATE as today_date, 
            gst_due_date::DATE as gst_due_date, 
            gst_reminder_1_date::DATE as gst_reminder_1_date, 
            gst_reminder_2_date::DATE as gst_reminder_2_date,
            tds_due_date::DATE as tds_due_date,
            tds_reminder_1_date::DATE as tds_reminder_1_date, 
            tds_reminder_2_date::DATE as tds_reminder_2_date,
            password, scheduler_hour, scheduler_minute, scheduler_am_pm,
            enable_whatsapp_reminders, enable_email_reminders,
            created_at, updated_at
     FROM "user".reminder_settings 
     WHERE current_month = $1
     ORDER BY id DESC LIMIT 1`,
    [monthYearString]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new reminder settings
 * @param {Object} settings - New settings to create
 * @returns {Promise<Object>} - The created settings
 */
async function createReminderSettings(settings) {
  const {
    current_month,
    today_date, 
    gst_due_date,
    gst_reminder_1_date,
    gst_reminder_2_date,
    tds_due_date,
    tds_reminder_1_date,
    tds_reminder_2_date,
    password,
    scheduler_hour,
    scheduler_minute,
    scheduler_am_pm,
    enable_whatsapp_reminders,
    enable_email_reminders
  } = settings;
  
  // Handle empty dates by converting them to null
  const handleEmptyDate = (date) => {
    return date === '' ? null : date;
  };
  
  const result = await db.query(
    `INSERT INTO "user".reminder_settings (
        current_month, 
        today_date, 
        gst_due_date, 
        gst_reminder_1_date, 
        gst_reminder_2_date,
        tds_due_date,
        tds_reminder_1_date,
        tds_reminder_2_date,
        password,
        scheduler_hour,
        scheduler_minute,
        scheduler_am_pm,
        enable_whatsapp_reminders,
        enable_email_reminders
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
    RETURNING id, created_at, updated_at`,
    [
      current_month,
      today_date,
      gst_due_date,
      handleEmptyDate(gst_reminder_1_date),
      handleEmptyDate(gst_reminder_2_date),
      handleEmptyDate(tds_due_date),
      handleEmptyDate(tds_reminder_1_date),
      handleEmptyDate(tds_reminder_2_date),
      password || null,
      scheduler_hour || 9,
      scheduler_minute || 0,
      scheduler_am_pm || 'AM',
      enable_whatsapp_reminders !== undefined ? enable_whatsapp_reminders : true,
      enable_email_reminders !== undefined ? enable_email_reminders : true
    ]
  );
  
  return result.rows[0];
}

/**
 * Update reminder settings
 * @param {number} id - Settings ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated settings
 */
async function updateReminderSettings(id, updates) {
  const validFields = [
    'current_month', 
    'today_date', 
    'gst_due_date', 
    'gst_reminder_1_date', 
    'gst_reminder_2_date',
    'tds_due_date',
    'tds_reminder_1_date',
    'tds_reminder_2_date',
    'password',
    'scheduler_hour',
    'scheduler_minute',
    'scheduler_am_pm',
    'enable_whatsapp_reminders',
    'enable_email_reminders'
  ];
  
  const updateFields = [];
  const values = [];
  
  let index = 1;
  
  // Handle empty dates by converting them to null
  const handleEmptyDate = (date) => {
    return date === '' ? null : date;
  };
  
  Object.keys(updates).forEach(key => {
    if (validFields.includes(key)) {
      updateFields.push(`${key} = $${index}`);
      
      // Handle date fields
      if (key.includes('date')) {
        values.push(handleEmptyDate(updates[key]));
      } else {
        values.push(updates[key]);
      }
      
      index++;
    }
  });
  
  if (updateFields.length === 0) {
    throw new Error('No valid updates provided');
  }
  
  values.push(id); // Add id as the last parameter
  
  const query = `UPDATE "user".reminder_settings 
                 SET ${updateFields.join(', ')}, updated_at = NOW() 
                 WHERE id = $${index}
                 RETURNING *`;
  
  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Delete reminder settings
 * @param {number} id - Settings ID
 * @returns {Promise<boolean>} - True if successful, false if not found
 */
async function deleteReminderSettings(id) {
  const result = await db.query(
    `DELETE FROM "user".reminder_settings 
     WHERE id = $1
     RETURNING id`,
    [id]
  );
  
  return result.rows.length > 0;
}

/**
 * Reset all reminder dates
 * @param {number} id - Settings ID
 * @returns {Promise<void>}
 */
async function resetReminderDates(id) {
  await db.query(
    `UPDATE "user".reminder_settings 
     SET gst_reminder_1_date = NULL, 
         gst_reminder_2_date = NULL, 
         tds_reminder_1_date = NULL, 
         tds_reminder_2_date = NULL
     WHERE id = $1`,
     [id]
  );
}

/**
 * Get clients who need a reminder
 * @param {Object} options - Options for finding clients
 * @returns {Promise<Array>} - Array of clients who need a reminder
 */
async function getClientsForReminder(options) {
  const { documentField, reminderField, documentMonth } = options;
  
  const result = await db.query(
    `SELECT c.id, c.name, c.email_id_1, c.email_id_2, c.email_id_3,
            cd.id as document_id
     FROM "user".clients c
     JOIN "user".client_documents cd ON c.id = cd.client_id
     WHERE cd.document_month = $1
     AND cd.${documentField} = false
     AND cd.${reminderField} = false`,
    [documentMonth]
  );
  
  return result.rows;
}

/**
 * Mark a document as having a reminder sent
 * @param {number} documentId - Document ID
 * @param {string} reminderField - Field to mark as sent
 * @param {string} reminderDateField - Field to store the sent date
 * @returns {Promise<void>}
 */
async function markReminderSent(documentId, reminderField, reminderDateField) {
  await db.query(
    `UPDATE "user".client_documents
     SET ${reminderField} = true, ${reminderDateField} = NOW()
     WHERE id = $1`,
    [documentId]
  );
}

module.exports = {
  getLatestReminderSettings,
  getReminderSettingsById,
  getAvailableMonths,
  getSettingsForMonth,
  createReminderSettings,
  updateReminderSettings,
  deleteReminderSettings,
  resetReminderDates,
  getClientsForReminder,
  markReminderSent
}; 