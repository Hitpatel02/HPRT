/**
 * whatsappSocket.js
 *
 * Socket.io configuration for WhatsApp events.
 * Sets up the Socket.io server, registers the io instance with whatsappClient,
 * and handles client-initiated socket events (status requests, connect triggers).
 *
 * Called once from server.js: setupWhatsAppSocket(io)
 */
const whatsappClient = require('../config/whatsappClient');
const { logger } = require('../utils/logger');

function setupWhatsAppSocket(io) {
    // Register io with whatsappClient so it can emit events
    whatsappClient.setSocketIo(io);

    io.on('connection', (socket) => {
        logger.debug(`[socket] Client connected: ${socket.id}`);

        // Send current status immediately on connect so frontend syncs UI
        socket.emit('whatsapp:status', whatsappClient.getStatus());

        // Frontend can request a status refresh at any time
        socket.on('whatsapp:get_status', () => {
            socket.emit('whatsapp:status', whatsappClient.getStatus());
        });

        socket.on('disconnect', () => {
            logger.debug(`[socket] Client disconnected: ${socket.id}`);
        });
    });

    logger.info('[socket] WhatsApp socket handler registered');
}

module.exports = { setupWhatsAppSocket };
