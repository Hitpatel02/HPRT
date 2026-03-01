import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../api';

// Get initial values from localStorage if available
const initialState = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  lastPath: localStorage.getItem('lastPath') || '/',
  initialDataLoaded: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      
      // Check if token is valid
      const token = response.token;
      if (!token) {
        return rejectWithValue({ message: "Invalid authentication response" });
      }
      
      // Store user data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return response;
    } catch (error) {
      return rejectWithValue({ 
        message: error.message || "Authentication failed" 
      });
    }
  }
);

// Async thunk for verifying auth
export const verifyAuth = createAsyncThunk(
  'auth/verify',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      
      if (!token) {
        return rejectWithValue({ message: "No authentication token" });
      }
      
      const response = await authAPI.verifyAuth(token);
      
      if (!response.success || !response.user) {
        return rejectWithValue({ message: "Invalid verification response" });
      }
      
      // Update user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return response.user;
    } catch (error) {
      return rejectWithValue({ 
        message: error.message || "Verification failed"
      });
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set the authentication token
    setToken: (state, action) => {
      state.token = action.payload;
      state.error = null;
      
      // Update localStorage when token changes
      if (action.payload) {
        localStorage.setItem('token', action.payload);
        // Reset initialDataLoaded when token is set (on login)
        state.initialDataLoaded = false;
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastPath');
        state.initialDataLoaded = false;
        state.user = null;
      }
    },
    
    // Set the user data
    setUser: (state, action) => {
      state.user = action.payload;
      
      if (action.payload) {
        localStorage.setItem('user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('user');
      }
    },
    
    // Track the last path visited for redirecting after login
    setLastPath: (state, action) => {
      state.lastPath = action.payload;
      
      // Update localStorage when path changes
      if (state.token && action.payload) {
        localStorage.setItem('lastPath', action.payload);
      }
    },
    
    // Signal that initial data has been loaded
    setInitialDataLoaded: (state, action) => {
      state.initialDataLoaded = action.payload;
    },
    
    // Set loading state
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    // Set error message
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    // Action for logging out
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.lastPath = '/';
      state.initialDataLoaded = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastPath');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login states
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isLoading = false;
        state.error = null;
        state.initialDataLoaded = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.error = action.payload?.message || "Login failed";
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      // Verify auth states
      .addCase(verifyAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
        state.initialDataLoaded = true;
      })
      .addCase(verifyAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.error = action.payload?.message || "Verification failed";
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  }
});

// Export actions
export const { 
  setToken, 
  setUser,
  setLastPath, 
  setInitialDataLoaded, 
  setLoading, 
  setError, 
  logout 
} = authSlice.actions;

// Selectors
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectLastPath = (state) => state.auth.lastPath;
export const selectInitialDataLoaded = (state) => state.auth.initialDataLoaded;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectError = (state) => state.auth.error;

// Export the reducer
export default authSlice.reducer; 