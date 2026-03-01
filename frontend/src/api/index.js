/**
 * API Services Index
 * Exports all API services from a single entry point
 */

import authAPI from './services/authApi';
import clientsAPI from './services/clientsApi';
import documentsAPI from './services/documentsApi';
import settingsAPI from './services/settingsApi';
import reportsAPI from './services/reportsApi';
import logsAPI from './services/logsApi';
import whatsAppAPI from './services/whatsappApi';
import apiUtils from './services/apiUtils';

// Export all API services
export {
  apiUtils,
  authAPI,
  clientsAPI,
  documentsAPI,
  settingsAPI,
  reportsAPI,
  logsAPI,
  whatsAppAPI
}; 