/**
 * Clients API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// Clients API
const clientsAPI = {
  getAll: async (token) => {
    return apiRequest('/api/clients', {
      headers: getAuthHeaders(token)
    });
  },
  
  getById: async (token, id) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      headers: getAuthHeaders(token)
    });
  },
  
  create: async (token, clientData) => {
    return apiRequest('/api/clients', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(clientData)
    });
  },
  
  update: async (token, id, clientData) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      method: 'PUT', // Updated to use PUT instead of PATCH
      headers: getAuthHeaders(token),
      body: JSON.stringify(clientData)
    });
  },
  
  delete: async (token, id) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  },

  sendReminder: async (token, id, reminderType) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}/send-reminder`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ reminderType })
    });
  }
};

export default clientsAPI; 