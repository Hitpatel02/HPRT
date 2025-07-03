// const { DateTime } = require("luxon");
// const db = require("../config/db");
// const { client, isWhatsAppReady, resetClientState, initializeWhatsApp } = require("../config/whatsapp");
// const { validateGroupId } = require('./whatsappGroupService');
// const { logger } = require('../utils/logger');

// /**
//  * Check if whatsapp_logs table exists
//  * @returns {Promise<boolean>}
//  */
// const checkWhatsappLogsTable = async () => {
//     try {
//         const result = await db.query(`
//             SELECT EXISTS (
//                 SELECT FROM information_schema.tables 
//                 WHERE table_schema = 'user' 
//                 AND table_name = 'whatsapp_logs'
//             );
//         `);
//         return result.rows[0].exists;
//     } catch (error) {
//         logger.error('Error checking whatsapp_logs table:', error);
//         return false;
//     }
// };

// /**
//  * Create whatsapp_logs table if it doesn't exist
//  * @returns {Promise<boolean>}
//  */
// const createWhatsappLogsTable = async () => {
//     try {
//         const tableExists = await checkWhatsappLogsTable();

//         if (!tableExists) {
//             logger.info('Creating whatsapp_logs table...');
//             await db.query(`
//                 CREATE TABLE IF NOT EXISTS "user".whatsapp_logs (
//                     id SERIAL PRIMARY KEY,
//                     group_id VARCHAR(255) NOT NULL,
//                     message TEXT NOT NULL,
//                     status VARCHAR(50) NOT NULL,
//                     sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
//                     error_message TEXT,
//                     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
//                 );
//             `);
//             logger.info('whatsapp_logs table created successfully');
//             return true;
//         }

//         return true;
//     } catch (error) {
//         logger.error('Error creating whatsapp_logs table:', error);
//         return false;
//     }
// };

// /**
//  * Safely log WhatsApp message to database
//  * @param {string} groupId - The WhatsApp group ID
//  * @param {string} message - The message that was sent
//  * @param {string} status - The status of the message (sent/failed)
//  * @param {string} errorMessage - Optional error message
//  * @param {number} clientId - Optional client ID (if known)
//  */
// const logWhatsAppMessage = async (groupId, message, status, errorMessage = null, clientId = null) => {
//     try {
//         // First ensure the table exists
//         await createWhatsappLogsTable();

//         // If client ID is not provided, try to look it up
//         if (!clientId) {
//             try {
//                 const clientResult = await db.query(
//                     `SELECT id as client_id FROM "user".clients WHERE whatsapp_group_id = $1`,
//                     [groupId]
//                 );

//                 if (clientResult.rows.length > 0) {
//                     clientId = clientResult.rows[0].client_id;
//                 }

//                 // If not found in clients table, try client_groups table
//                 if (!clientId) {
//                     const groupResult = await db.query(
//                         `SELECT client_id FROM "user".client_groups WHERE group_id = $1`,
//                         [groupId]
//                     );

//                     if (groupResult.rows.length > 0) {
//                         clientId = groupResult.rows[0].client_id;
//                     }
//                 }
//             } catch (clientError) {
//                 logger.warn(`Could not find client_id for group ${groupId}: ${clientError.message}`);
//             }
//         }

//         // Then log the message
//         await db.query(
//             `INSERT INTO "user".whatsapp_logs 
//              (client_id, group_id, message, status, sent_at, error_message) 
//              VALUES ($1, $2, $3, $4, $5, $6)`,
//             [clientId, groupId, message, status, new Date(), errorMessage]
//         );
//         return true;
//     } catch (error) {
//         // Just log error but don't throw - this is a non-critical operation
//         logger.warn(`Could not log to whatsapp_logs: ${error.message}`);
//         console.log(`⚠️ Note: Could not log to whatsapp_logs table: ${error.message}`);
//         return false;
//     }
// };

// /**
//  * Get the current reminder settings
//  * @returns {Promise<Object>} - The reminder settings
//  */
// const getReminderSettings = async () => {
//     try {
//         const settingsResult = await db.query(
//             `SELECT * FROM "user".reminder_settings ORDER BY updated_at DESC LIMIT 1`
//         );

//         if (settingsResult.rows.length === 0) {
//             throw new Error('No reminder settings found');
//         }

//         return settingsResult.rows[0];
//     } catch (error) {
//         logger.error('Error getting reminder settings:', error);
//         throw error;
//     }
// };

// /**
//  * Send a message to a WhatsApp group
//  * @param {string} groupId - The WhatsApp group ID
//  * @param {string} message - The message to send
//  * @returns {Promise<boolean>} - Whether the message was sent successfully
//  */
// const sendGroupMessage = async (groupId, message) => {
//     try {
//         if (!isWhatsAppReady()) {
//             logger.error('WhatsApp client is not ready');
//             return false;
//         }

//         logger.info(`Sending message to group: ${groupId}`);
//         await client.sendMessage(groupId, message);
//         logger.info('Message sent successfully');
//         return true;
//     } catch (error) {
//         logger.error(`Error sending WhatsApp message to group ${groupId}:`, error);
//         // Reset client state on error to ensure clean state
//         resetClientState();
//         return false;
//     }
// };

// /**
//  * Initialize WhatsApp client for sending reminders if enabled in settings
//  * @returns {Promise<boolean>} Success status
//  */
// const initWhatsAppForReminders = async () => {
//     try {
//         // Check if WhatsApp reminders are enabled
//         const settingsResult = await db.query(
//             `SELECT enable_whatsapp_reminders FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
//         );

//         if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enable_whatsapp_reminders) {
//             console.log('⚠️ WhatsApp reminders are disabled in settings. Skipping WhatsApp initialization.');
//             return false;
//         }

//         // If WhatsApp is already ready, no need to initialize
//         if (isWhatsAppReady()) {
//             console.log('✅ WhatsApp client is already initialized and ready.');
//             return true;
//         }

//         // Initialize WhatsApp client
//         console.log('🚀 Automatically initializing WhatsApp client for sending reminders...');
//         const success = await initializeWhatsApp();

//         // Wait for up to 30 seconds for the client to become ready
//         if (success) {
//             let attempts = 0;
//             const maxAttempts = 15; // 15 attempts, 2 seconds each = 30 seconds max wait

//             while (!isWhatsAppReady() && attempts < maxAttempts) {
//                 console.log(`⏳ Waiting for WhatsApp client to become ready (${attempts + 1}/${maxAttempts})...`);
//                 await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
//                 attempts++;
//             }

//             if (isWhatsAppReady()) {
//                 console.log('✅ WhatsApp client is now ready for sending reminders.');
//                 return true;
//             } else {
//                 console.log('⚠️ WhatsApp client did not become ready within the timeout period.');
//                 return false;
//             }
//         }

//         return false;
//     } catch (error) {
//         console.error('❌ Error initializing WhatsApp for reminders:', error);
//         return false;
//     }
// };

// /**
//  * Send reminders to all WhatsApp groups
//  * @returns {Promise<{success: number, failed: number}>} - Statistics about the sending operation
//  */
// const sendWhatsAppReminders = async () => {
//     try {
//         // Get reminder settings
//         const settings = await getReminderSettings();

//         // Check if email reminders are enabled
//         if (!settings.enable_whatsapp_reminders) {
//             console.log('⚠️ Whatsapp reminders are disabled in settings. Skipping Whatsapp reminders.');
//             return;
//         }
//         // Auto-initialize WhatsApp if reminders are enabled
//         const whatsAppReady = await initWhatsAppForReminders();

//         if (!whatsAppReady) {
//             console.log('⚠️ WhatsApp client is not ready. Skipping WhatsApp reminders.');
//             return { success: 0, failed: 0 };
//         }

//         logger.info('Starting WhatsApp reminder process');


//         // Check if today is a GST reminder date
//         // Get reminder dates and ensure proper formatting
//         let gstReminder1Date = null;
//         let gstReminder2Date = null;

//         try {
//             if (settings.gst_reminder_1_date) {
//                 gstReminder1Date = DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd');
//                 console.log('GST Reminder 1 Date:', gstReminder1Date);
//             }

//             if (settings.gst_reminder_2_date) {
//                 gstReminder2Date = DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd');
//                 console.log('GST Reminder 2 Date:', gstReminder2Date);
//             }
//         } catch (dateError) {
//             console.error('Error parsing GST reminder dates:', dateError);
//             // Continue with null values if parsing fails
//         }

//         const isGstFirstReminderDay = gstReminder1Date && DateTime.now().toFormat("yyyy-MM-dd") === gstReminder1Date;
//         const isGstSecondReminderDay = gstReminder2Date && DateTime.now().toFormat("yyyy-MM-dd") === gstReminder2Date;
//         const isGstReminderDay = isGstFirstReminderDay || isGstSecondReminderDay;

//         console.log(`Is GST Reminder 1 Day: ${isGstFirstReminderDay}, Is GST Reminder 2 Day: ${isGstSecondReminderDay}`);

//         // Check if today is a TDS reminder date
//         let tdsReminder1Date = null;
//         let tdsReminder2Date = null;

//         try {
//             if (settings.tds_reminder_1_date) {
//                 tdsReminder1Date = DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd');
//                 console.log('TDS Reminder 1 Date:', tdsReminder1Date);
//             }

//             if (settings.tds_reminder_2_date) {
//                 tdsReminder2Date = DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd');
//                 console.log('TDS Reminder 2 Date:', tdsReminder2Date);
//             }
//         } catch (dateError) {
//             console.error('Error parsing TDS reminder dates:', dateError);
//             // Continue with null values if parsing fails
//         }

//         const isTdsFirstReminderDay = tdsReminder1Date && DateTime.now().toFormat("yyyy-MM-dd") === tdsReminder1Date;
//         const isTdsSecondReminderDay = tdsReminder2Date && DateTime.now().toFormat("yyyy-MM-dd") === tdsReminder2Date;
//         const isTdsReminderDay = isTdsFirstReminderDay || isTdsSecondReminderDay;

//         console.log(`Is TDS Reminder 1 Day: ${isTdsFirstReminderDay}, Is TDS Reminder 2 Day: ${isTdsSecondReminderDay}`);

//         // Skip if today is not any reminder day
//         if (!isGstReminderDay && !isTdsReminderDay) {
//             console.log('⚠️ Today is not a reminder day for GST or TDS. Skipping WhatsApp reminders.');
//             return { success: 0, failed: 0 };
//         }

//         // Get clients with WhatsApp IDs and pending documents
//         const clientsResult = await db.query(`
//             SELECT 
//                 c.id, 
//                 c.name, 
//                 c.whatsapp_group_id,
//                 cd.document_month,
//                 cd.gst_1_received,
//                 cd.bank_statement_received,
//                 cd.tds_received,
//                 c.gst_1_enabled,
//                 c.bank_statement_enabled,
//                 c.tds_document_enabled
//             FROM 
//                 "user".clients c
//             JOIN 
//                 "user".client_documents cd 
//             ON 
//                 c.id = cd.client_id
//             WHERE 
//                 c.whatsapp_group_id IS NOT NULL 
//                 AND c.whatsapp_group_id != ''
//                 AND (NOT cd.gst_1_received OR NOT cd.bank_statement_received OR NOT cd.tds_received)
//                 AND cd.document_month = TRIM(TO_CHAR((CURRENT_DATE - INTERVAL '1 month'), 'Month')) || ' ' || EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))
//         `);

//         logger.info(`Found ${clientsResult.rows.length} clients with WhatsApp group IDs and pending documents`);

//         if (clientsResult.rows.length === 0) {
//             logger.info('No clients with WhatsApp groups found needing reminders');
//             return { success: 0, failed: 0 };
//         }

//         let successCount = 0;
//         let failedCount = 0;

//         // Determine which reminder number we're sending today
//         const gstReminderNumber = isGstFirstReminderDay ? 1 : (isGstSecondReminderDay ? 2 : 0);
//         const tdsReminderNumber = isTdsFirstReminderDay ? 1 : (isTdsSecondReminderDay ? 2 : 0);

//         // Check due dates for urgency
//         const gstDueDate = DateTime.fromJSDate(new Date(settings.gst_due_date));
//         const tdsDueDate = DateTime.fromJSDate(new Date(settings.tds_due_date));
//         const isGstPastDue = DateTime.now() > gstDueDate;
//         const isTdsPastDue = DateTime.now() > tdsDueDate;

//         // Send reminders to each group
//         for (const client of clientsResult.rows) {
//             try {
//                 // Organize pending documents
//                 const needsGst = !client.gst_1_received && client.gst_1_enabled;
//                 const needsBank = !client.bank_statement_received && client.bank_statement_enabled;
//                 const needsTds = !client.tds_received && client.tds_document_enabled;

//                 // Skip if all documents are submitted or not applicable
//                 if (!needsGst && !needsBank && !needsTds) {
//                     console.log(`⏭️ Skipping WhatsApp message for ${client.name}, all applicable documents are received.`);
//                     continue;
//                 }

//                 console.log(`Processing ${client.name} - GST: ${needsGst ? 'Pending' : (client.gst_1_enabled ? 'Received' : 'Not applicable')}, Bank: ${needsBank ? 'Pending' : (client.bank_statement_enabled ? 'Received' : 'Not applicable')}, TDS: ${needsTds ? 'Pending' : (client.tds_document_enabled ? 'Received' : 'Not applicable')}`);

//                 // Now implement document grouping logic similar to emailService
//                 // Scenario 1: All 3 documents applicable
//                 if (needsGst && needsTds && needsBank) {
//                     // For TDS and Bank Statement, use TDS reminder dates
//                     if (isTdsReminderDay) {
//                         const tdsBankDocs = [];
//                         if (needsTds) tdsBankDocs.push("TDS data");
//                         if (needsBank) tdsBankDocs.push("Bank statement");

//                         if (tdsBankDocs.length > 0) {
//                             console.log(`Sending ${tdsBankDocs.join(' and ')} reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, tdsBankDocs, tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update reminder status for each document type
//                                 if (tdsReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

//                                         if (tdsBankDocs.includes("TDS data")) {
//                                             await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
//                                         }
//                                         if (tdsBankDocs.includes("Bank statement")) {
//                                             await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "bank");
//                                         }
//                                     } catch (updateError) {
//                                         console.error(`Error updating reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }
//                     }

//                     // For GST, use GST reminder dates (always separate)
//                     if (isGstReminderDay) {
//                         console.log(`Sending GSTR 1 data reminder to ${client.name}`);
//                         const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

//                         if (success) {
//                             successCount++;

//                             // Update GST reminder status
//                             if (gstReminderNumber > 0) {
//                                 try {
//                                     const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                         (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                     await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
//                                 } catch (updateError) {
//                                     console.error(`Error updating GST reminder status: ${updateError.message}`);
//                                 }
//                             }
//                         } else {
//                             failedCount++;
//                         }

//                         // Random delay between messages (2-10 seconds)
//                         const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                         console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                         await new Promise(resolve => setTimeout(resolve, randomDelay));
//                     }
//                 }
//                 // Scenario 2: 2 documents applicable
//                 else if (
//                     (needsGst && needsTds && !needsBank) ||
//                     (needsGst && !needsTds && needsBank) ||
//                     (!needsGst && needsTds && needsBank)
//                 ) {
//                     // Case 1: GST and TDS - Send separate reminders
//                     if (needsGst && needsTds) {
//                         if (isGstReminderDay) {
//                             console.log(`Sending GSTR 1 data reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update GST reminder status
//                                 if (gstReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                         await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
//                                     } catch (updateError) {
//                                         console.error(`Error updating GST reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }

//                         if (isTdsReminderDay) {
//                             console.log(`Sending TDS data reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, ["TDS data"], tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update TDS reminder status
//                                 if (tdsReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                         await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
//                                     } catch (updateError) {
//                                         console.error(`Error updating TDS reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }
//                     }
//                     // Case 2: GST and Bank Statement - Group together with GST dates
//                     else if (needsGst && needsBank) {
//                         if (isGstReminderDay) {
//                             const gstBankDocs = [];
//                             if (needsGst) gstBankDocs.push("GSTR 1 data");
//                             if (needsBank) gstBankDocs.push("Bank statement");

//                             if (gstBankDocs.length > 0) {
//                                 console.log(`Sending ${gstBankDocs.join(' and ')} reminder to ${client.name}`);
//                                 const success = await sendReminderMessage(client, gstBankDocs, gstReminderNumber, settings.gst_due_date, isGstPastDue);

//                                 if (success) {
//                                     successCount++;

//                                     // Update reminder status for each document type
//                                     if (gstReminderNumber > 0) {
//                                         try {
//                                             const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                                 (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

//                                             if (gstBankDocs.includes("GSTR 1 data")) {
//                                                 await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
//                                             }
//                                             if (gstBankDocs.includes("Bank statement")) {
//                                                 await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "bank");
//                                             }
//                                         } catch (updateError) {
//                                             console.error(`Error updating reminder status: ${updateError.message}`);
//                                         }
//                                     }
//                                 } else {
//                                     failedCount++;
//                                 }

//                                 // Random delay between messages (2-10 seconds)
//                                 const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                                 console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                                 await new Promise(resolve => setTimeout(resolve, randomDelay));
//                             }
//                         }
//                     }
//                     // Case 3: TDS and Bank Statement - Group together with TDS dates
//                     else if (needsTds && needsBank) {
//                         if (isTdsReminderDay) {
//                             const tdsBankDocs = [];
//                             if (needsTds) tdsBankDocs.push("TDS data");
//                             if (needsBank) tdsBankDocs.push("Bank statement");

//                             if (tdsBankDocs.length > 0) {
//                                 console.log(`Sending ${tdsBankDocs.join(' and ')} reminder to ${client.name}`);
//                                 const success = await sendReminderMessage(client, tdsBankDocs, tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

//                                 if (success) {
//                                     successCount++;

//                                     // Update reminder status for each document type
//                                     if (tdsReminderNumber > 0) {
//                                         try {
//                                             const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                                 (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

//                                             if (tdsBankDocs.includes("TDS data")) {
//                                                 await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
//                                             }
//                                             if (tdsBankDocs.includes("Bank statement")) {
//                                                 await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "bank");
//                                             }
//                                         } catch (updateError) {
//                                             console.error(`Error updating reminder status: ${updateError.message}`);
//                                         }
//                                     }
//                                 } else {
//                                     failedCount++;
//                                 }

//                                 // Random delay between messages (2-10 seconds)
//                                 const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                                 console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                                 await new Promise(resolve => setTimeout(resolve, randomDelay));
//                             }
//                         }
//                     }
//                 }
//                 // Scenario 3: Only 1 document applicable
//                 else {
//                     // Only GST applicable
//                     if (needsGst && !needsTds && !needsBank) {
//                         if (isGstReminderDay) {
//                             console.log(`Sending GSTR 1 data reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update GST reminder status
//                                 if (gstReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                         await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
//                                     } catch (updateError) {
//                                         console.error(`Error updating GST reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }
//                     }
//                     // Only TDS applicable
//                     else if (!needsGst && needsTds && !needsBank) {
//                         if (isTdsReminderDay) {
//                             console.log(`Sending TDS data reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, ["TDS data"], tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update TDS reminder status
//                                 if (tdsReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                         await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
//                                     } catch (updateError) {
//                                         console.error(`Error updating TDS reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }
//                     }
//                     // Only Bank Statement applicable
//                     else if (!needsGst && !needsTds && needsBank) {
//                         // For Bank statement alone, use any reminder day (prioritize GST if both are available)

//                         if (isGstReminderDay) {
//                             console.log(`Sending Bank statement reminder to ${client.name}`);
//                             const success = await sendReminderMessage(client, ["Bank statement"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

//                             if (success) {
//                                 successCount++;

//                                 // Update Bank reminder status
//                                 if (gstReminderNumber > 0) {
//                                     try {
//                                         const documentMonth = typeof client.document_month === 'string' ? client.document_month :
//                                             (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
//                                         await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "bank");
//                                     } catch (updateError) {
//                                         console.error(`Error updating Bank reminder status: ${updateError.message}`);
//                                     }
//                                 }
//                             } else {
//                                 failedCount++;
//                             }

//                             // Random delay between messages (2-10 seconds)
//                             const randomDelay = Math.floor(Math.random() * 8000) + 2000;
//                             console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
//                             await new Promise(resolve => setTimeout(resolve, randomDelay));
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error(`Error processing client ${client.name}:`, error);
//                 failedCount++;
//             }
//         }

//         logger.info(`WhatsApp reminders sent: ${successCount} successful, ${failedCount} failed`);
//         return { success: successCount, failed: failedCount };
//     } catch (error) {
//         logger.error('Error sending WhatsApp reminders:', error);
//         return { success: 0, failed: 0 };
//     } finally {
//         // Clean up resources after sending all reminders
//         logger.info('WhatsApp reminder process completed');
//     }
// };

// /**
//  * Send a reminder message for a specific document type
//  * @param {Object} client - Client data object 
//  * @param {Array} pendingDocs - Array of document types to include in the message
//  * @param {Number} reminderNumber - Which reminder number (1 or 2)
//  * @param {Date} dueDate - Due date for the document
//  * @param {Boolean} isPastDue - Whether the document is past due
//  * @returns {Promise<boolean>} Whether the message was sent successfully
//  */
// async function sendReminderMessage(client, pendingDocs, reminderNumber, dueDate, isPastDue) {
//     // Prepare message
//     let messageIntro;
//     const isUrgent = reminderNumber === 2 || isPastDue;

//     if (isUrgent) {
//         messageIntro = `*⚠️ URGENT REMINDER*\n\nDear sir,\n\nThis is an urgent reminder to submit your pending ${pendingDocs.join(", ")} for ${client.document_month} immediately.`;
//     } else {
//         messageIntro = `*📢 Gentle Reminder*\n\nDear sir,\n\nThis is a gentle reminder to submit your pending ${pendingDocs.join(", ")} for ${client.document_month}.`;
//     }

//     const dueDateInfo = `\n\n*Due Date:* ${DateTime.fromJSDate(new Date(dueDate)).toFormat('dd MMMM yyyy')}`;
//     const urgencyNote = isPastDue ? "\n\n*Note:* This submission is now OVERDUE." : "";
//     const callToAction = "\n\nAct now to avoid late fees. Please ignore if documents have already been provided.";

//     const message = `${messageIntro}${dueDateInfo}${urgencyNote}${callToAction}\n\nNeed assistance? Contact us ASAP.\n\nThank you for your prompt attention 🤝\n\nBest regards,\nTeam HPRT\nM. No. 966 468 7247`;

//     logger.info(`Sending message to group: ${client.whatsapp_group_id}`);
//     const success = await sendGroupMessage(client.whatsapp_group_id, message);

//     if (success) {
//         await logWhatsAppMessage(client.whatsapp_group_id, message, 'sent', null, client.id);
//         console.log(`✅ Message successfully sent to ${client.name}`);
//         return true;
//     } else {
//         await logWhatsAppMessage(client.whatsapp_group_id, message, 'failed', 'Failed to send message', client.id);
//         console.log(`❌ Failed to send message to ${client.name}`);
//         return false;
//     }
// }


// /**
//  * Update reminder status in the database
//  */
// async function updateReminderStatus(clientId, documentMonth, reminderNumber, documentType) {
//     try {
//         let columnPrefix = '';

//         switch (documentType) {
//             case 'gst':
//                 columnPrefix = 'gst_1_reminder_';
//                 break;
//             case 'tds':
//                 columnPrefix = 'tds_reminder_';
//                 break;
//             case 'bank':
//                 columnPrefix = 'bank_reminder_';
//                 break;
//             default:
//                 columnPrefix = 'reminder_';
//         }

//         // Format date as ISO string for compatibility
//         const currentTimestamp = new Date().toISOString();

//         console.log(`Updating reminder status with the following details:`);
//         console.log(`- Client ID: ${clientId}`);
//         console.log(`- Document Month: ${documentMonth}`);
//         console.log(`- Reminder Number: ${reminderNumber}`);
//         console.log(`- Document Type: ${documentType}`);
//         console.log(`- Column Prefix: ${columnPrefix}`);
//         console.log(`- Current Timestamp: ${currentTimestamp}`);

//         // Construct query
//         const query = `
//             UPDATE "user".client_documents 
//             SET ${columnPrefix}${reminderNumber}_sent = TRUE, 
//                 ${columnPrefix}${reminderNumber}_sent_date = $3
//             WHERE client_id = $1 AND document_month = $2
//             RETURNING id, ${columnPrefix}${reminderNumber}_sent, ${columnPrefix}${reminderNumber}_sent_date
//         `;

//         console.log(`Executing query: ${query.replace(/\s+/g, ' ')}`);

//         // Execute query with return values for confirmation
//         const result = await db.query(query, [clientId, documentMonth, currentTimestamp]);

//         if (result.rows && result.rows.length > 0) {
//             console.log(`✅ Successfully updated ${documentType} reminder ${reminderNumber} status for client ID ${clientId}`);
//             console.log(`Updated record:`, result.rows[0]);
//         } else {
//             console.warn(`⚠️ No records were updated for client ID ${clientId}. Document may not exist for month ${documentMonth}`);
//         }

//         return result.rows && result.rows.length > 0;
//     } catch (error) {
//         console.error(`❌ Error updating ${documentType} reminder ${reminderNumber} status for client ID ${clientId}:`, error);
//         logger.error(`Error updating reminder status: ${error.message}`, {
//             clientId, documentMonth, reminderNumber, documentType, error: error.stack
//         });
//         return false;
//     }
// }

// module.exports = {
//     sendWhatsAppReminders,
//     initWhatsAppForReminders,
//     sendGroupMessage,
//     validateGroupId,
//     checkWhatsappLogsTable,
//     logWhatsAppMessage
// };

const { DateTime } = require("luxon");
const db = require("../config/db");
const { client, isWhatsAppReady, resetClientState, initializeWhatsApp } = require("../config/whatsapp");
const { validateGroupId } = require('./whatsappGroupService');
const { logger } = require('../utils/logger');

/**
 * Check if whatsapp_logs table exists
 * @returns {Promise<boolean>}
 */
const checkWhatsappLogsTable = async () => {
    try {
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'user' 
                AND table_name = 'whatsapp_logs'
            );
        `);
        return result.rows[0].exists;
    } catch (error) {
        logger.error('Error checking whatsapp_logs table:', error);
        return false;
    }
};

/**
 * Create whatsapp_logs table if it doesn't exist
 * @returns {Promise<boolean>}
 */
const createWhatsappLogsTable = async () => {
    try {
        const tableExists = await checkWhatsappLogsTable();

        if (!tableExists) {
            logger.info('Creating whatsapp_logs table...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS "user".whatsapp_logs (
                    id SERIAL PRIMARY KEY,
                    group_id VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            logger.info('whatsapp_logs table created successfully');
            return true;
        }

        return true;
    } catch (error) {
        logger.error('Error creating whatsapp_logs table:', error);
        return false;
    }
};

/**
 * Safely log WhatsApp message to database
 * @param {string} groupId - The WhatsApp group ID
 * @param {string} message - The message that was sent
 * @param {string} status - The status of the message (sent/failed)
 * @param {string} errorMessage - Optional error message
 * @param {number} clientId - Optional client ID (if known)
 */
const logWhatsAppMessage = async (groupId, message, status, errorMessage = null, clientId = null) => {
    try {
        // First ensure the table exists
        await createWhatsappLogsTable();

        // If client ID is not provided, try to look it up
        if (!clientId) {
            try {
                const clientResult = await db.query(
                    `SELECT id as client_id FROM "user".clients WHERE whatsapp_group_id = $1`,
                    [groupId]
                );

                if (clientResult.rows.length > 0) {
                    clientId = clientResult.rows[0].client_id;
                }

                // If not found in clients table, try client_groups table
                if (!clientId) {
                    const groupResult = await db.query(
                        `SELECT client_id FROM "user".client_groups WHERE group_id = $1`,
                        [groupId]
                    );

                    if (groupResult.rows.length > 0) {
                        clientId = groupResult.rows[0].client_id;
                    }
                }
            } catch (clientError) {
                logger.warn(`Could not find client_id for group ${groupId}: ${clientError.message}`);
            }
        }

        // Then log the message
        await db.query(
            `INSERT INTO "user".whatsapp_logs 
             (client_id, group_id, message, status, sent_at, error_message) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [clientId, groupId, message, status, new Date(), errorMessage]
        );
        return true;
    } catch (error) {
        // Just log error but don't throw - this is a non-critical operation
        logger.warn(`Could not log to whatsapp_logs: ${error.message}`);
        console.log(`⚠️ Note: Could not log to whatsapp_logs table: ${error.message}`);
        return false;
    }
};

/**
 * Get the current reminder settings
 * @returns {Promise<Object>} - The reminder settings
 */
const getReminderSettings = async () => {
    try {
        const settingsResult = await db.query(
            `SELECT * FROM "user".reminder_settings ORDER BY updated_at DESC LIMIT 1`
        );

        if (settingsResult.rows.length === 0) {
            throw new Error('No reminder settings found');
        }

        return settingsResult.rows[0];
    } catch (error) {
        logger.error('Error getting reminder settings:', error);
        throw error;
    }
};

/**
 * Send a message to a WhatsApp group
 * @param {string} groupId - The WhatsApp group ID
 * @param {string} message - The message to send
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
const sendGroupMessage = async (groupId, message) => {
    try {
        if (!isWhatsAppReady()) {
            logger.error('WhatsApp client is not ready');
            return false;
        }

        logger.info(`Sending message to group: ${groupId}`);
        await client.sendMessage(groupId, message);
        logger.info('Message sent successfully');
        return true;
    } catch (error) {
        logger.error(`Error sending WhatsApp message to group ${groupId}:`, error);
        // Reset client state on error to ensure clean state
        resetClientState();
        return false;
    }
};

/**
 * Initialize WhatsApp client for sending reminders with infinite wait
 * @returns {Promise<boolean>} Success status
 */
const initWhatsAppForReminders = async () => {
    try {
        // Check if WhatsApp reminders are enabled
        const settingsResult = await db.query(
            `SELECT enable_whatsapp_reminders FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
        );

        if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enable_whatsapp_reminders) {
            console.log('⚠️ WhatsApp reminders are disabled in settings. Skipping WhatsApp initialization.');
            return false;
        }

        // If WhatsApp is already ready, no need to initialize
        if (isWhatsAppReady()) {
            console.log('✅ WhatsApp client is already initialized and ready.');
            return true;
        }

        // Initialize WhatsApp client
        console.log('🚀 Initializing WhatsApp client for sending reminders...');
        const success = await initializeWhatsApp();

        if (success) {
            // Wait indefinitely for the client to become ready with loading indicator
            console.log('⏳ Waiting for WhatsApp client to connect...');
            console.log('📱 Please scan the QR code in WhatsApp Web if required');

            // Show loading animation
            const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let loadingIndex = 0;
            let waitTime = 0;

            const loadingInterval = setInterval(() => {
                const minutes = Math.floor(waitTime / 60000);
                const seconds = Math.floor((waitTime % 60000) / 1000);
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                process.stdout.write(`\r${loadingChars[loadingIndex]} Waiting for WhatsApp connection... (${timeStr})`);
                loadingIndex = (loadingIndex + 1) % loadingChars.length;
                waitTime += 100;
            }, 100);

            // Wait for client to be ready (infinite wait)
            return new Promise((resolve) => {
                const checkReady = () => {
                    if (isWhatsAppReady()) {
                        clearInterval(loadingInterval);
                        process.stdout.write('\n'); // New line after loading
                        console.log('✅ WhatsApp client is now ready for sending reminders.');
                        resolve(true);
                        return;
                    }

                    // Continue checking every 2 seconds
                    setTimeout(checkReady, 2000);
                };

                // Start checking immediately
                checkReady();
            });
        }

        return false;
    } catch (error) {
        console.error('❌ Error initializing WhatsApp for reminders:', error);
        return false;
    }
};

/**
 * Send reminders to all WhatsApp groups
 * @returns {Promise<{success: number, failed: number}>} - Statistics about the sending operation
 */
const sendWhatsAppReminders = async () => {
    try {
        // Get reminder settings
        const settings = await getReminderSettings();

        // Check if whatsapp reminders are enabled
        if (!settings.enable_whatsapp_reminders) {
            console.log('⚠️ WhatsApp reminders are disabled in settings. Skipping WhatsApp reminders.');
            return { success: 0, failed: 0 };
        }

        // Auto-initialize WhatsApp if reminders are enabled
        const whatsAppReady = await initWhatsAppForReminders();

        if (!whatsAppReady) {
            console.log('⚠️ WhatsApp client is not ready. Skipping WhatsApp reminders.');
            return { success: 0, failed: 0 };
        }

        logger.info('Starting WhatsApp reminder process');


        // Check if today is a GST reminder date
        // Get reminder dates and ensure proper formatting
        let gstReminder1Date = null;
        let gstReminder2Date = null;

        try {
            if (settings.gst_reminder_1_date) {
                gstReminder1Date = DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd');
                console.log('GST Reminder 1 Date:', gstReminder1Date);
            }

            if (settings.gst_reminder_2_date) {
                gstReminder2Date = DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd');
                console.log('GST Reminder 2 Date:', gstReminder2Date);
            }
        } catch (dateError) {
            console.error('Error parsing GST reminder dates:', dateError);
            // Continue with null values if parsing fails
        }

        const isGstFirstReminderDay = gstReminder1Date && DateTime.now().toFormat("yyyy-MM-dd") === gstReminder1Date;
        const isGstSecondReminderDay = gstReminder2Date && DateTime.now().toFormat("yyyy-MM-dd") === gstReminder2Date;
        const isGstReminderDay = isGstFirstReminderDay || isGstSecondReminderDay;

        console.log(`Is GST Reminder 1 Day: ${isGstFirstReminderDay}, Is GST Reminder 2 Day: ${isGstSecondReminderDay}`);

        // Check if today is a TDS reminder date
        let tdsReminder1Date = null;
        let tdsReminder2Date = null;

        try {
            if (settings.tds_reminder_1_date) {
                tdsReminder1Date = DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd');
                console.log('TDS Reminder 1 Date:', tdsReminder1Date);
            }

            if (settings.tds_reminder_2_date) {
                tdsReminder2Date = DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd');
                console.log('TDS Reminder 2 Date:', tdsReminder2Date);
            }
        } catch (dateError) {
            console.error('Error parsing TDS reminder dates:', dateError);
            // Continue with null values if parsing fails
        }

        const isTdsFirstReminderDay = tdsReminder1Date && DateTime.now().toFormat("yyyy-MM-dd") === tdsReminder1Date;
        const isTdsSecondReminderDay = tdsReminder2Date && DateTime.now().toFormat("yyyy-MM-dd") === tdsReminder2Date;
        const isTdsReminderDay = isTdsFirstReminderDay || isTdsSecondReminderDay;

        console.log(`Is TDS Reminder 1 Day: ${isTdsFirstReminderDay}, Is TDS Reminder 2 Day: ${isTdsSecondReminderDay}`);

        // Skip if today is not any reminder day
        if (!isGstReminderDay && !isTdsReminderDay) {
            console.log('⚠️ Today is not a reminder day for GST or TDS. Skipping WhatsApp reminders.');
            return { success: 0, failed: 0 };
        }

        // Get clients with WhatsApp IDs and pending documents
        const clientsResult = await db.query(`
            SELECT 
                c.id, 
                c.name, 
                c.whatsapp_group_id,
                cd.document_month,
                cd.gst_1_received,
                cd.bank_statement_received,
                cd.tds_received,
                c.gst_1_enabled,
                c.bank_statement_enabled,
                c.tds_document_enabled
            FROM 
                "user".clients c
            JOIN 
                "user".client_documents cd 
            ON 
                c.id = cd.client_id
            WHERE 
                c.whatsapp_group_id IS NOT NULL 
                AND c.whatsapp_group_id != ''
                AND (NOT cd.gst_1_received OR NOT cd.bank_statement_received OR NOT cd.tds_received)
                AND cd.document_month = TRIM(TO_CHAR((CURRENT_DATE - INTERVAL '1 month'), 'Month')) || ' ' || EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))
        `);

        logger.info(`Found ${clientsResult.rows.length} clients with WhatsApp group IDs and pending documents`);

        if (clientsResult.rows.length === 0) {
            logger.info('No clients with WhatsApp groups found needing reminders');
            return { success: 0, failed: 0 };
        }

        let successCount = 0;
        let failedCount = 0;

        // Determine which reminder number we're sending today
        const gstReminderNumber = isGstFirstReminderDay ? 1 : (isGstSecondReminderDay ? 2 : 0);
        const tdsReminderNumber = isTdsFirstReminderDay ? 1 : (isTdsSecondReminderDay ? 2 : 0);

        // Check due dates for urgency
        const gstDueDate = DateTime.fromJSDate(new Date(settings.gst_due_date));
        const tdsDueDate = DateTime.fromJSDate(new Date(settings.tds_due_date));
        const isGstPastDue = DateTime.now() > gstDueDate;
        const isTdsPastDue = DateTime.now() > tdsDueDate;

        // Send reminders to each group
        for (const client of clientsResult.rows) {
            try {
                // Organize pending documents
                const needsGst = !client.gst_1_received && client.gst_1_enabled;
                const needsBank = !client.bank_statement_received && client.bank_statement_enabled;
                const needsTds = !client.tds_received && client.tds_document_enabled;

                // Skip if all documents are submitted or not applicable
                if (!needsGst && !needsBank && !needsTds) {
                    console.log(`⏭️ Skipping WhatsApp message for ${client.name}, all applicable documents are received.`);
                    continue;
                }

                console.log(`Processing ${client.name} - GST: ${needsGst ? 'Pending' : (client.gst_1_enabled ? 'Received' : 'Not applicable')}, Bank: ${needsBank ? 'Pending' : (client.bank_statement_enabled ? 'Received' : 'Not applicable')}, TDS: ${needsTds ? 'Pending' : (client.tds_document_enabled ? 'Received' : 'Not applicable')}`);

                // Now implement document grouping logic similar to emailService
                // Scenario 1: All 3 documents applicable
                if (needsGst && needsTds && needsBank) {
                    // For TDS and Bank Statement, use TDS reminder dates
                    if (isTdsReminderDay) {
                        const tdsBankDocs = [];
                        if (needsTds) tdsBankDocs.push("TDS data");
                        if (needsBank) tdsBankDocs.push("Bank statement");

                        if (tdsBankDocs.length > 0) {
                            console.log(`Sending ${tdsBankDocs.join(' and ')} reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, tdsBankDocs, tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

                            if (success) {
                                successCount++;

                                // Update reminder status for each document type
                                if (tdsReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

                                        if (tdsBankDocs.includes("TDS data")) {
                                            await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
                                        }
                                        if (tdsBankDocs.includes("Bank statement")) {
                                            await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "bank");
                                        }
                                    } catch (updateError) {
                                        console.error(`Error updating reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }
                    }

                    // For GST, use GST reminder dates (always separate)
                    if (isGstReminderDay) {
                        console.log(`Sending GSTR 1 data reminder to ${client.name}`);
                        const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

                        if (success) {
                            successCount++;

                            // Update GST reminder status
                            if (gstReminderNumber > 0) {
                                try {
                                    const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                        (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                    await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
                                } catch (updateError) {
                                    console.error(`Error updating GST reminder status: ${updateError.message}`);
                                }
                            }
                        } else {
                            failedCount++;
                        }

                        // Random delay between messages (2-10 seconds)
                        const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                        console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                        await new Promise(resolve => setTimeout(resolve, randomDelay));
                    }
                }
                // Scenario 2: 2 documents applicable
                else if (
                    (needsGst && needsTds && !needsBank) ||
                    (needsGst && !needsTds && needsBank) ||
                    (!needsGst && needsTds && needsBank)
                ) {
                    // Case 1: GST and TDS - Send separate reminders
                    if (needsGst && needsTds) {
                        if (isGstReminderDay) {
                            console.log(`Sending GSTR 1 data reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

                            if (success) {
                                successCount++;

                                // Update GST reminder status
                                if (gstReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                        await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
                                    } catch (updateError) {
                                        console.error(`Error updating GST reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }

                        if (isTdsReminderDay) {
                            console.log(`Sending TDS data reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, ["TDS data"], tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

                            if (success) {
                                successCount++;

                                // Update TDS reminder status
                                if (tdsReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                        await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
                                    } catch (updateError) {
                                        console.error(`Error updating TDS reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }
                    }
                    // Case 2: GST and Bank Statement - Group together with GST dates
                    else if (needsGst && needsBank) {
                        if (isGstReminderDay) {
                            const gstBankDocs = [];
                            if (needsGst) gstBankDocs.push("GSTR 1 data");
                            if (needsBank) gstBankDocs.push("Bank statement");

                            if (gstBankDocs.length > 0) {
                                console.log(`Sending ${gstBankDocs.join(' and ')} reminder to ${client.name}`);
                                const success = await sendReminderMessage(client, gstBankDocs, gstReminderNumber, settings.gst_due_date, isGstPastDue);

                                if (success) {
                                    successCount++;

                                    // Update reminder status for each document type
                                    if (gstReminderNumber > 0) {
                                        try {
                                            const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                                (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

                                            if (gstBankDocs.includes("GSTR 1 data")) {
                                                await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
                                            }
                                            if (gstBankDocs.includes("Bank statement")) {
                                                await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "bank");
                                            }
                                        } catch (updateError) {
                                            console.error(`Error updating reminder status: ${updateError.message}`);
                                        }
                                    }
                                } else {
                                    failedCount++;
                                }

                                // Random delay between messages (2-10 seconds)
                                const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                                console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                                await new Promise(resolve => setTimeout(resolve, randomDelay));
                            }
                        }
                    }
                    // Case 3: TDS and Bank Statement - Group together with TDS dates
                    else if (needsTds && needsBank) {
                        if (isTdsReminderDay) {
                            const tdsBankDocs = [];
                            if (needsTds) tdsBankDocs.push("TDS data");
                            if (needsBank) tdsBankDocs.push("Bank statement");

                            if (tdsBankDocs.length > 0) {
                                console.log(`Sending ${tdsBankDocs.join(' and ')} reminder to ${client.name}`);
                                const success = await sendReminderMessage(client, tdsBankDocs, tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

                                if (success) {
                                    successCount++;

                                    // Update reminder status for each document type
                                    if (tdsReminderNumber > 0) {
                                        try {
                                            const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                                (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));

                                            if (tdsBankDocs.includes("TDS data")) {
                                                await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
                                            }
                                            if (tdsBankDocs.includes("Bank statement")) {
                                                await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "bank");
                                            }
                                        } catch (updateError) {
                                            console.error(`Error updating reminder status: ${updateError.message}`);
                                        }
                                    }
                                } else {
                                    failedCount++;
                                }

                                // Random delay between messages (2-10 seconds)
                                const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                                console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                                await new Promise(resolve => setTimeout(resolve, randomDelay));
                            }
                        }
                    }
                }
                // Scenario 3: Only 1 document applicable
                else {
                    // Only GST applicable
                    if (needsGst && !needsTds && !needsBank) {
                        if (isGstReminderDay) {
                            console.log(`Sending GSTR 1 data reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, ["GSTR 1 data"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

                            if (success) {
                                successCount++;

                                // Update GST reminder status
                                if (gstReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                        await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "gst");
                                    } catch (updateError) {
                                        console.error(`Error updating GST reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }
                    }
                    // Only TDS applicable
                    else if (!needsGst && needsTds && !needsBank) {
                        if (isTdsReminderDay) {
                            console.log(`Sending TDS data reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, ["TDS data"], tdsReminderNumber, settings.tds_due_date, isTdsPastDue);

                            if (success) {
                                successCount++;

                                // Update TDS reminder status
                                if (tdsReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                        await updateReminderStatus(client.id, documentMonth, tdsReminderNumber, "tds");
                                    } catch (updateError) {
                                        console.error(`Error updating TDS reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }
                    }
                    // Only Bank Statement applicable
                    else if (!needsGst && !needsTds && needsBank) {
                        // For Bank statement alone, use any reminder day (prioritize GST if both are available)

                        if (isGstReminderDay) {
                            console.log(`Sending Bank statement reminder to ${client.name}`);
                            const success = await sendReminderMessage(client, ["Bank statement"], gstReminderNumber, settings.gst_due_date, isGstPastDue);

                            if (success) {
                                successCount++;

                                // Update Bank reminder status
                                if (gstReminderNumber > 0) {
                                    try {
                                        const documentMonth = typeof client.document_month === 'string' ? client.document_month :
                                            (client.document_month instanceof Date ? client.document_month.toISOString() : String(client.document_month));
                                        await updateReminderStatus(client.id, documentMonth, gstReminderNumber, "bank");
                                    } catch (updateError) {
                                        console.error(`Error updating Bank reminder status: ${updateError.message}`);
                                    }
                                }
                            } else {
                                failedCount++;
                            }

                            // Random delay between messages (2-10 seconds)
                            const randomDelay = Math.floor(Math.random() * 8000) + 2000;
                            console.log(`Adding random delay of ${randomDelay / 1000} seconds to avoid WhatsApp rate limiting`);
                            await new Promise(resolve => setTimeout(resolve, randomDelay));
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing client ${client.name}:`, error);
                failedCount++;
            }
        }

        logger.info(`WhatsApp reminders sent: ${successCount} successful, ${failedCount} failed`);
        return { success: successCount, failed: failedCount };
    } catch (error) {
        logger.error('Error sending WhatsApp reminders:', error);
        return { success: 0, failed: 0 };
    } finally {
        // Clean up resources after sending all reminders
        logger.info('WhatsApp reminder process completed');
    }
};

/**
* Send a reminder message for a specific document type
* @param {Object} client - Client data object 
* @param {Array} pendingDocs - Array of document types to include in the message
* @param {Number} reminderNumber - Which reminder number (1 or 2)
* @param {Date} dueDate - Due date for the document
* @param {Boolean} isPastDue - Whether the document is past due
* @returns {Promise<boolean>} Whether the message was sent successfully
*/
async function sendReminderMessage(client, pendingDocs, reminderNumber, dueDate, isPastDue) {
    // Prepare message
    let messageIntro;
    const isUrgent = reminderNumber === 2 || isPastDue;

    if (isUrgent) {
        messageIntro = `*⚠️ URGENT REMINDER*\n\nDear sir,\n\nThis is an urgent reminder to submit your pending ${pendingDocs.join(", ")} for ${client.document_month} immediately.`;
    } else {
        messageIntro = `*📢 Gentle Reminder*\n\nDear sir,\n\nThis is a gentle reminder to submit your pending ${pendingDocs.join(", ")} for ${client.document_month}.`;
    }

    const dueDateInfo = `\n\n*Due Date:* ${DateTime.fromJSDate(new Date(dueDate)).toFormat('dd MMMM yyyy')}`;
    const urgencyNote = isPastDue ? "\n\n*Note:* This submission is now OVERDUE." : "";
    const callToAction = "\n\nAct now to avoid late fees. Please ignore if documents have already been provided.";

    const message = `${messageIntro}${dueDateInfo}${urgencyNote}${callToAction}\n\nNeed assistance? Contact us ASAP.\n\nThank you for your prompt attention 🤝\n\nBest regards,\nTeam HPRT\nM. No. 966 468 7247`;

    logger.info(`Sending message to group: ${client.whatsapp_group_id}`);
    const success = await sendGroupMessage(client.whatsapp_group_id, message);

    if (success) {
        await logWhatsAppMessage(client.whatsapp_group_id, message, 'sent', null, client.id);
        console.log(`✅ Message successfully sent to ${client.name}`);
        return true;
    } else {
        await logWhatsAppMessage(client.whatsapp_group_id, message, 'failed', 'Failed to send message', client.id);
        console.log(`❌ Failed to send message to ${client.name}`);
        return false;
    }
}


/**
* Update reminder status in the database
*/
async function updateReminderStatus(clientId, documentMonth, reminderNumber, documentType) {
    try {
        let columnPrefix = '';

        switch (documentType) {
            case 'gst':
                columnPrefix = 'gst_1_reminder_';
                break;
            case 'tds':
                columnPrefix = 'tds_reminder_';
                break;
            case 'bank':
                columnPrefix = 'bank_reminder_';
                break;
            default:
                columnPrefix = 'reminder_';
        }

        // Format date as ISO string for compatibility
        const currentTimestamp = new Date().toISOString();

        console.log(`Updating reminder status with the following details:`);
        console.log(`- Client ID: ${clientId}`);
        console.log(`- Document Month: ${documentMonth}`);
        console.log(`- Reminder Number: ${reminderNumber}`);
        console.log(`- Document Type: ${documentType}`);
        console.log(`- Column Prefix: ${columnPrefix}`);
        console.log(`- Current Timestamp: ${currentTimestamp}`);

        // Construct query
        const query = `
UPDATE "user".client_documents 
SET ${columnPrefix}${reminderNumber}_sent = TRUE, 
${columnPrefix}${reminderNumber}_sent_date = $3
WHERE client_id = $1 AND document_month = $2
RETURNING id, ${columnPrefix}${reminderNumber}_sent, ${columnPrefix}${reminderNumber}_sent_date
`;

        console.log(`Executing query: ${query.replace(/\s+/g, ' ')}`);

        // Execute query with return values for confirmation
        const result = await db.query(query, [clientId, documentMonth, currentTimestamp]);

        if (result.rows && result.rows.length > 0) {
            console.log(`✅ Successfully updated ${documentType} reminder ${reminderNumber} status for client ID ${clientId}`);
            console.log(`Updated record:`, result.rows[0]);
        } else {
            console.warn(`⚠️ No records were updated for client ID ${clientId}. Document may not exist for month ${documentMonth}`);
        }

        return result.rows && result.rows.length > 0;
    } catch (error) {
        console.error(`❌ Error updating ${documentType} reminder ${reminderNumber} status for client ID ${clientId}:`, error);
        logger.error(`Error updating reminder status: ${error.message}`, {
            clientId, documentMonth, reminderNumber, documentType, error: error.stack
        });
        return false;
    }
}

module.exports = {
    sendWhatsAppReminders,
    initWhatsAppForReminders,
    sendGroupMessage,
    validateGroupId,
    checkWhatsappLogsTable,
    logWhatsAppMessage
};