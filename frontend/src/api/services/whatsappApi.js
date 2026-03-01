/**
 * WhatsApp API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// Helper functions that don't require manual token passing
const getToken = () => localStorage.getItem('token');

// WhatsApp API functions that interact with the backend
const whatsApp = {
  getStatus: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/status', {
        headers: getAuthHeaders(token)
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get WhatsApp status'
      };
    }
  },

  startGroupIdRetrieval: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/group-id/start', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error starting WhatsApp group ID retrieval:', error);
      return {
        success: false,
        error: error.message || 'Failed to start WhatsApp group ID retrieval'
      };
    }
  },

  stopGroupIdRetrieval: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/group-id/stop', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error stopping WhatsApp group ID retrieval:', error);
      return {
        success: false,
        error: error.message || 'Failed to stop WhatsApp group ID retrieval'
      };
    }
  },

  sendTestMessage: async (token, groupId) => {
    try {
      const response = await apiRequest('/api/whatsapp/test', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ groupId })
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error sending WhatsApp test message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp test message'
      };
    }
  },

  forceReconnect: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error forcing WhatsApp reconnection:', error);
      return {
        success: false,
        error: error.message || 'Failed to force WhatsApp reconnection'
      };
    }
  }
};

// Helper functions with auto token retrieval
export const getWhatsAppStatus = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsApp.getStatus(token);
};

export const startWhatsAppGroupIdRetrieval = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsApp.startGroupIdRetrieval(token);
};

export const stopWhatsAppGroupIdRetrieval = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsApp.stopGroupIdRetrieval(token);
};

export const sendWhatsAppTestMessage = async (groupId) => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsApp.sendTestMessage(token, groupId);
};

export const forceWhatsAppReconnect = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsApp.forceReconnect(token);
};

// Export the WhatsApp API functions both individually and as an object
const whatsAppAPI = {
  // Main API functions that require token
  ...whatsApp,
  
  // Helper functions with auto token retrieval
  getWhatsAppStatus,
  startWhatsAppGroupIdRetrieval,
  stopWhatsAppGroupIdRetrieval,
  sendWhatsAppTestMessage,
  forceWhatsAppReconnect
};

export default whatsAppAPI; 