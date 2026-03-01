/**
 * Documents API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// Documents API
const documentsAPI = {
  getAll: async (token) => {
    return apiRequest('/api/documents', {
      headers: getAuthHeaders(token)
    });
  },

  getPending: async (token) => {
    return apiRequest('/api/pending-documents', {
      headers: getAuthHeaders(token)
    });
  },
  
  getByClient: async (token, clientId) => {
    // Ensure clientId is treated as a number if it's a numeric string
    const numericId = !isNaN(clientId) ? Number(clientId) : clientId;
    return apiRequest(`/api/clients/${numericId}/documents`, {
      headers: getAuthHeaders(token)
    });
  },
  
  updateStatus: async (token, documentId, status) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status })
    });
  },
  
  update: async (token, documentId, updates) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(updates)
    });
  },
  
  delete: async (token, documentId) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  },
  
  createForAll: async (token, month = null) => {
    return apiRequest('/api/documents/create-for-all', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ month })
    });
  },
  
  createForClient: async (token, clientId, month = null) => {
    // Ensure clientId is treated as a number if it's a numeric string
    const numericId = !isNaN(clientId) ? Number(clientId) : clientId;
    return apiRequest(`/api/documents/create-for-client/${numericId}`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ month })
    });
  }
};

export default documentsAPI; 