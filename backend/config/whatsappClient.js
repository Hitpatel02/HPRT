/**
 * whatsappClient.js — Singleton WhatsApp client manager
 *
 * Single source of truth for the WhatsApp client. Emits status events via
 * Socket.io. No terminal spinners, no polling, no console QR output.
 *
 * States:
 *   DISCONNECTED  — no client running
 *   INITIALIZING  — client.initialize() called, waiting for QR/auth
 *   CONNECTED     — client.on('ready') fired
 */
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { logger } = require('../utils/logger');
const { validateGroupId } = require('../utils/whatsappUtils');
const loggingService = require('../services/loggingService');

// ── Session path (inside backend, controlled) ─────────────────────────
const SESSION_PATH = path.resolve(__dirname, '../whatsapp-session');

// ── Client state ──────────────────────────────────────────────────────
const STATE = {
    DISCONNECTED: 'DISCONNECTED',
    INITIALIZING: 'INITIALIZING',
    CONNECTED: 'CONNECTED',
};

let currentState = STATE.DISCONNECTED;
let clientInstance = null;
let ioInstance = null;
let clientInfo = null;

// ── Socket emit helper ────────────────────────────────────────────────
function emit(event, data) {
    if (ioInstance) {
        ioInstance.emit(event, data);
    }
}

// ── Register Socket.io instance ───────────────────────────────────────
function setSocketIo(io) {
    ioInstance = io;
}

// ── Create a fresh Client instance ───────────────────────────────────
function createClient() {
    return new Client({
        authStrategy: new LocalAuth({
            dataPath: SESSION_PATH,
            clientId: 'hprt-client',
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--mute-audio',
                '--hide-scrollbars',
                '--disable-features=site-per-process',
                '--ignore-certificate-errors',
            ],
            timeout: 60000,
        },
        restartOnAuthFail: false,
        qrMaxRetries: 5,
    });
}

// ── Attach event listeners to a client ───────────────────────────────
function attachListeners(client) {
    client.removeAllListeners(); // Prevent accumulation on re-init

    client.on('qr', (qr) => {
        logger.info('[whatsappClient] QR code generated — emitting to frontend');
        currentState = STATE.INITIALIZING;
        emit('whatsapp:qr', { qr });
        emit('whatsapp:status', { state: STATE.INITIALIZING, message: 'Scan QR code to connect' });
    });

    client.on('authenticated', () => {
        logger.info('[whatsappClient] Authenticated');
        emit('whatsapp:status', { state: STATE.INITIALIZING, message: 'Authenticated — loading session...' });
    });

    client.on('ready', () => {
        currentState = STATE.CONNECTED;
        clientInfo = client.info;
        logger.info('[whatsappClient] Client is ready');
        emit('whatsapp:ready', {
            state: STATE.CONNECTED,
            message: 'Connected',
            info: {
                wid: client.info?.wid?.user,
                platform: client.info?.platform,
                pushname: client.info?.pushname,
            },
        });
        emit('whatsapp:status', { state: STATE.CONNECTED, message: 'Connected' });
    });

    client.on('auth_failure', (err) => {
        currentState = STATE.DISCONNECTED;
        clientInfo = null;
        logger.error('[whatsappClient] Authentication failed:', err);
        emit('whatsapp:error', { message: 'Authentication failed. Please delete session and try again.' });
        emit('whatsapp:status', { state: STATE.DISCONNECTED, message: 'Authentication failed' });
    });

    client.on('disconnected', (reason) => {
        currentState = STATE.DISCONNECTED;
        clientInfo = null;
        logger.info(`[whatsappClient] Disconnected: ${reason}`);
        emit('whatsapp:disconnected', { state: STATE.DISCONNECTED, reason });
        emit('whatsapp:status', { state: STATE.DISCONNECTED, message: `Disconnected: ${reason}` });
    });

    client.on('change_state', (state) => {
        logger.debug(`[whatsappClient] State changed: ${state}`);
    });

    // ── Group ID Retrieval Listener ───────────────────────────────────────
    client.on('message', async (message) => {
        // Prevent importing whatsappGroupService immediately to avoid circular dependencies
        const { isGroupIdRetrievalActive, handleGroupIdMessage } = require('../services/whatsappGroupService');

        if (message.body === '!groupid' && isGroupIdRetrievalActive()) {
            await handleGroupIdMessage(client, message);
        }
    });
}

// ── PUBLIC API ────────────────────────────────────────────────────────

/**
 * Initialize the WhatsApp client.
 * Guard: won't start if already INITIALIZING or CONNECTED.
 */
async function initialize() {
    if (currentState === STATE.INITIALIZING) {
        logger.warn('[whatsappClient] Already initializing — ignoring duplicate init call');
        return { success: false, message: 'Already initializing' };
    }
    if (currentState === STATE.CONNECTED) {
        logger.info('[whatsappClient] Already connected');
        return { success: true, message: 'Already connected' };
    }

    // Ensure session directory exists
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
        logger.info(`[whatsappClient] Created session directory: ${SESSION_PATH}`);
    }

    logger.info('[whatsappClient] Initializing client...');
    currentState = STATE.INITIALIZING;
    emit('whatsapp:status', { state: STATE.INITIALIZING, message: 'Initializing...' });

    clientInstance = createClient();
    attachListeners(clientInstance);

    // Non-blocking: initialize() is fire-and-forget; events handle the rest
    clientInstance.initialize().catch((err) => {
        logger.error('[whatsappClient] Fatal init error:', err);
        currentState = STATE.DISCONNECTED;
        emit('whatsapp:error', { message: `Init failed: ${err.message}` });
        emit('whatsapp:status', { state: STATE.DISCONNECTED, message: 'Initialization failed' });
    });

    return { success: true, message: 'Initialization started' };
}

/**
 * Disconnect the WhatsApp client (keep session files).
 */
async function disconnect() {
    if (currentState === STATE.DISCONNECTED || !clientInstance) {
        return { success: true, message: 'Already disconnected' };
    }

    logger.info('[whatsappClient] Disconnecting...');
    try {
        await clientInstance.destroy();
    } catch (err) {
        logger.warn('[whatsappClient] Error during destroy (may be harmless):', err.message);
    }

    currentState = STATE.DISCONNECTED;
    clientInfo = null;
    clientInstance = null;

    emit('whatsapp:status', { state: STATE.DISCONNECTED, message: 'Disconnected' });
    emit('whatsapp:disconnected', { state: STATE.DISCONNECTED, reason: 'User requested disconnect' });
    logger.info('[whatsappClient] Disconnected and client cleared');
    return { success: true, message: 'Disconnected' };
}

/**
 * Delete session: disconnect + wipe the session directory.
 * Refuses to delete if in INITIALIZING state (race condition risk).
 */
async function deleteSession() {
    if (currentState === STATE.INITIALIZING) {
        return { success: false, message: 'Cannot delete session while initializing — disconnect first' };
    }

    logger.info('[whatsappClient] Deleting session...');

    // Destroy client first if running
    if (clientInstance) {
        try {
            await clientInstance.destroy();
        } catch (err) {
            logger.warn('[whatsappClient] Error destroying client during deleteSession:', err.message);
        }
        clientInstance = null;
    }

    currentState = STATE.DISCONNECTED;
    clientInfo = null;

    // Small delay to allow Puppeteer to release file locks
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Delete session directory
    try {
        await fs.promises.rm(SESSION_PATH, { recursive: true, force: true });
        logger.info(`[whatsappClient] Session directory deleted: ${SESSION_PATH}`);
    } catch (err) {
        logger.error('[whatsappClient] Failed to delete session directory:', err);
        return { success: false, message: `Failed to delete session: ${err.message}` };
    }

    emit('whatsapp:status', { state: STATE.DISCONNECTED, message: 'Session deleted — fresh QR required' });
    emit('whatsapp:disconnected', { state: STATE.DISCONNECTED, reason: 'Session deleted' });

    return { success: true, message: 'Session deleted successfully' };
}

/**
 * Check if client is connected and ready to send messages.
 */
function isReady() {
    return currentState === STATE.CONNECTED && clientInstance !== null;
}

/**
 * Get the raw whatsapp-web.js client instance (for whatsappService).
 */
function getClient() {
    return clientInstance;
}

/**
 * Get current connection status info.
 */
function getStatus() {
    return {
        state: currentState,
        info: clientInfo
            ? {
                wid: clientInfo?.wid?.user,
                platform: clientInfo?.platform,
                pushname: clientInfo?.pushname,
            }
            : null,
        sessionPath: SESSION_PATH,
        sessionExists: fs.existsSync(SESSION_PATH),
    };
}

/**
 * Graceful shutdown — called by server.js on SIGTERM.
 */
async function shutdown() {
    logger.info('[whatsappClient] Shutting down...');
    if (clientInstance) {
        try {
            await clientInstance.destroy();
        } catch (err) {
            // Ignore errors during shutdown
        }
        clientInstance = null;
    }
    currentState = STATE.DISCONNECTED;
}

module.exports = {
    setSocketIo,
    initialize,
    disconnect,
    deleteSession,
    isReady,
    getClient,
    getStatus,
    shutdown,
    STATE,
};
