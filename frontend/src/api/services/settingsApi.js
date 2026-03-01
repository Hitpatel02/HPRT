/**
 * Settings API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// Settings API
const settingsAPI = {
  // Get reminder settings
  getSettings: async (token) => {
    return apiRequest('/api/settings', {
      headers: getAuthHeaders(token)
    });
  },
  
  // Get reminders from reminders endpoint
  getReminders: async (token) => {
    return apiRequest('/api/reminders', {
      headers: getAuthHeaders(token)
    });
  },
  
  // Get all available months with reminder settings
  getAvailableMonths: async (token) => {
    return apiRequest('/api/settings/months/available', {
      headers: getAuthHeaders(token)
    });
  },
  
  // Get settings for a specific month and year
  getSettingsForMonth: async (token, year, month) => {
    return apiRequest(`/api/settings/${year}/${month}`, {
      headers: getAuthHeaders(token)
    });
  },
  
  // Save settings for a specific month and year
  saveSettingsForMonth: async (token, year, month, settings) => {
    return apiRequest(`/api/settings/${year}/${month}`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  // Create new reminder settings
  createSettings: async (token, settings) => {
    return apiRequest('/api/settings', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  // Update reminder settings
  updateSettings: async (token, id, settings) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/settings/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  // Update reminder dates
  updateReminders: async (token, reminderDates) => {
    return apiRequest('/api/reminders', {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(reminderDates)
    });
  },
  
  // Reset all reminder dates
  resetReminders: async (token) => {
    return apiRequest('/api/reminders', {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  },
  
  // Update notification settings
  updateNotificationSettings: async (token, settings) => {
    return apiRequest('/api/settings/notifications', {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  // Reload scheduler
  reloadScheduler: async (token) => {
    return apiRequest('/api/settings/scheduler/reload', {
      headers: getAuthHeaders(token)
    });
  }
};

export default settingsAPI; 