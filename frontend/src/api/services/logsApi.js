/**
 * Communication Logs API Service
 * Handles API calls related to WhatsApp and email logs
 */

import apiRequest from './apiUtils';

/**
 * Get WhatsApp communication logs for a date range
 * @param {string} token - Authentication token
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} List of WhatsApp logs
 */
export const getWhatsappLogs = async (token, startDate, endDate) => {
  return apiRequest(`/api/logs/whatsapp?startDate=${startDate}&endDate=${endDate}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

/**
 * Get email communication logs for a date range
 * @param {string} token - Authentication token
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} List of email logs
 */
export const getEmailLogs = async (token, startDate, endDate) => {
  return apiRequest(`/api/logs/email?startDate=${startDate}&endDate=${endDate}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

/**
 * Clear WhatsApp logs for a date range or all logs
 * @param {string} token - Authentication token
 * @param {string} startDate - Start date in YYYY-MM-DD format (optional)
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} Result of the operation
 */
export const clearWhatsappLogs = async (token, startDate = null, endDate = null) => {
  let endpoint = '/api/logs/whatsapp';
  if (startDate && endDate) {
    endpoint += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  return apiRequest(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

/**
 * Clear email logs for a date range or all logs
 * @param {string} token - Authentication token
 * @param {string} startDate - Start date in YYYY-MM-DD format (optional)
 * @param {string} endDate - End date in YYYY-MM-DD format (optional)
 * @returns {Promise<Object>} Result of the operation
 */
export const clearEmailLogs = async (token, startDate = null, endDate = null) => {
  let endpoint = '/api/logs/email';
  if (startDate && endDate) {
    endpoint += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  return apiRequest(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Export as default object for consistency with other API services
const logsAPI = {
  getWhatsappLogs,
  getEmailLogs,
  clearWhatsappLogs,
  clearEmailLogs
};

export default logsAPI; 