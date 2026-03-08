/**
 * models/index.js
 *
 * Database schema documentation for the HPRT application.
 * All tables live in the "user" schema in PostgreSQL.
 *
 * This file does NOT create/alter tables — it documents the schema
 * and exports SQL snippets for reference and tooling purposes.
 * Actual migrations are handled by the ensureTable() calls in queries/.
 */

module.exports = {
    schema: 'user',

    tables: {
        clients: require('./client'),
        client_documents: require('./clientDocument'),
        reminder_settings: require('./reminderSettings'),
        reminder_jobs: require('./reminderJob'),
        whatsapp_logs: require('./whatsappLog'),
        email_logs: require('./emailLog'),
        activity_logs: require('./activityLog'),
        users: require('./user'),
        whatsapp_groups: require('./whatsappGroup'),
    },
};
