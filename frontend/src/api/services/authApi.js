/**
 * Authentication API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// Authentication API
const authAPI = {
  login: async (credentials) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  },
  
  verifyAuth: async (token) => {
    return apiRequest('/api/auth/verify', {
      headers: getAuthHeaders(token)
    });
  },
  
  getUsers: async (token) => {
    return apiRequest('/api/auth/users', {
      headers: getAuthHeaders(token)
    });
  },
  
  createUser: async (token, userData) => {
    return apiRequest('/api/auth/users', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData)
    });
  },
  
  updateUser: async (token, userId, userData) => {
    return apiRequest(`/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData)
    });
  },
  
  deleteUser: async (token, userId) => {
    return apiRequest(`/api/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  }
};

export default authAPI; 