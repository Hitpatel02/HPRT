const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    connect,
    disconnect,
    deleteSession,
    getStatus,
    sendTest,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
    getClientGroups,
    getClientsWithGroups,
} = require('../controllers/whatsappController');

// ── Phase 3: Connection Management ──────────────────────────────────────────
/** @route POST /api/whatsapp/connect       Initialize / connect WhatsApp */
router.post('/connect', authenticateToken, connect);

/** @route POST /api/whatsapp/disconnect    Disconnect (keep session) */
router.post('/disconnect', authenticateToken, disconnect);

/** @route DELETE /api/whatsapp/session     Delete session + wipe auth data */
router.delete('/session', authenticateToken, deleteSession);

// ── Status ──────────────────────────────────────────────────────────────────
/** @route GET /api/whatsapp/status         Get current connection state */
router.get('/status', authenticateToken, getStatus);

// ── Testing & Group ID Retrieval ────────────────────────────────────────────
/** @route POST /api/whatsapp/test          Send a test message */
router.post('/test', authenticateToken, sendTest);

/** @route POST /api/whatsapp/group-id/start   Start group ID retrieval mode */
router.post('/group-id/start', authenticateToken, startGroupIdRetrieval);

/** @route POST /api/whatsapp/group-id/stop    Stop group ID retrieval mode */
router.post('/group-id/stop', authenticateToken, stopGroupIdRetrieval);

// ── Client / Group Queries ──────────────────────────────────────────────────
/** @route GET /api/whatsapp/client/:clientId/groups */
router.get('/client/:clientId/groups', authenticateToken, getClientGroups);

/** @route GET /api/whatsapp/clients-with-groups */
router.get('/clients-with-groups', authenticateToken, getClientsWithGroups);

module.exports = router;