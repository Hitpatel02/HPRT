/**
 * API Utilities for making HTTP requests with consistent error handling
 */

// Import necessary store for auth actions - we'll add dynamic imports to avoid circular imports
let store;
let logoutAction;

// Initialize store and actions dynamically
const initializeAuthStore = async () => {
  if (!store) {
    const storeModule = await import('../../redux/store');
    const authSliceModule = await import('../../redux/authSlice');
    store = storeModule.store;
    logoutAction = authSliceModule.logout;
  }
};

// Flag to prevent multiple redirects
let isRedirecting = false;

// Base URL from environment variable
const BASE_URL = '';

// Helper to add cache prevention
export const addCacheBuster = (url) => {
  const timestamp = new Date().getTime();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${timestamp}`;
};

// Helper to get authorization headers
export const getAuthHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store'
  };
};

// Helper to check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    // Extract payload from token
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if token has expiration
    if (!payload.exp) return false;

    // Compare expiration with current time
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// API request helper with error handling
export const apiRequest = async (endpoint, options = {}) => {
  try {
    // Initialize auth store on first use
    await initializeAuthStore();

    const url = addCacheBuster(`${BASE_URL}${endpoint}`);

    // Check if token is required for this endpoint
    const isAuthEndpoint = !endpoint.includes('/login');

    if (isAuthEndpoint) {
      // Get current token from localStorage
      const token = localStorage.getItem('token');

      // Check if token is expired
      if (isTokenExpired(token)) {
        console.warn('Token is expired, logging out user');
        if (store && logoutAction) {
          store.dispatch(logoutAction());
        }

        if (!isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            isRedirecting = false;
            window.location.href = '/login';
          }, 100);
        }

        throw new Error('Session expired. Please login again.');
      }

      // Add token to request headers
      if (token && !options.headers?.Authorization) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }

    // Handle request body properly
    if (options.body) {
      let processedBody;

      // If body is already a string, try to parse it to ensure it's valid JSON
      if (typeof options.body === 'string') {
        try {
          processedBody = JSON.parse(options.body);
        } catch {
          processedBody = options.body;
        }
      } else {
        // If body is already an object, use it directly
        processedBody = options.body;
      }

      // Clean the object to ensure only valid values are sent
      processedBody = JSON.parse(JSON.stringify(processedBody));

      // Now stringify the clean object
      options.body = JSON.stringify(processedBody);
    }



    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Handle non-2xx responses
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn(`Authentication error: ${response.status}`);

        // Dispatch logout action
        if (store && logoutAction) {
          store.dispatch(logoutAction());
        }

        // Redirect to login page
        if (!isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            isRedirecting = false;
            window.location.href = '/login';
          }, 100);
        }
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        // Try to parse error as JSON
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'An error occurred');
      } else {
        // Fallback to status text
        throw new Error(response.statusText || 'An error occurred');
      }
    }

    // For empty responses (like 204 No Content)
    if (response.status === 204) {
      return null;
    }

    // Parse JSON response
    return response.json();
  } catch (error) {
    throw error;
  }
};

export default apiRequest; 