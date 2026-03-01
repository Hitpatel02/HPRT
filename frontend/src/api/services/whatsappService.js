/**
 * whatsappService.js — Frontend API service for WhatsApp management
 * Uses the project's custom fetch-based apiRequest utility.
 */
import { apiRequest } from './apiUtils';

const BASE = '/api/whatsapp';

/**
 * Connect (initialize) the WhatsApp client.
 * The server will emit Socket.io events for QR, ready, etc.
 */
export const connectWhatsApp = async () => {
    return apiRequest(`${BASE}/connect`, { method: 'POST' });
};

/**
 * Disconnect the WhatsApp client (keeps session files).
 */
export const disconnectWhatsApp = async () => {
    return apiRequest(`${BASE}/disconnect`, { method: 'POST' });
};

/**
 * Delete the WhatsApp session entirely (requires fresh QR scan next time).
 */
export const deleteWhatsAppSession = async () => {
    return apiRequest(`${BASE}/session`, { method: 'DELETE' });
};

/**
 * Get the current WhatsApp connection status from REST API.
 * Prefer socket events for real-time status updates.
 */
export const getWhatsAppStatus = async () => {
    return apiRequest(`${BASE}/status`, { method: 'GET' });
};
