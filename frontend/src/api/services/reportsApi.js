/**
 * Reports API Service
 */

import axios from 'axios';
import apiRequest, { getAuthHeaders } from './apiUtils';

// Base URL for API requests
const BASE_URL = '';

// Reports API
const reportsAPI = {
  generateReport: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/generate${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest(url, {
      headers: getAuthHeaders(token)
    });
  },
  
  getReportData: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/data${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest(url, {
      headers: getAuthHeaders(token)
    });
  },
  
  downloadReport: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/download${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Special handling for download - use fetch directly
    const response = await fetch(url, {
      headers: getAuthHeaders(token)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    return response.blob();
  },
  
  downloadReportCSV: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/download-csv${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Special handling for CSV download - use axios for consistent text response
    try {
      const response = await axios.get(`${BASE_URL}${url}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/csv' 
        },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading report as CSV:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to download CSV report');
    }
  }
};

export default reportsAPI; 