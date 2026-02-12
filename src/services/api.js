import axios from 'axios';

// Create axios instance with base configuration
// Uses relative path '/api/v1' to leverage proxy (Vite dev server or Vercel rewrites)
// This avoids CORS issues by routing requests through the same origin
const API = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add token to headers
API.interceptors.request.use(
  (config) => {
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle network errors (including CORS)
    if (!error.response) {
      console.error('Network error or CORS issue:', error.message);
      // Don't redirect on network errors, just reject
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If 401 error and we haven't retried yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

        if (refreshToken) {
          const response = await axios.post(
            `${API.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          );

          const newAccessToken = response.data.data.accessToken;

          // Update stored token
          if (localStorage.getItem('authToken')) {
            localStorage.setItem('authToken', newAccessToken);
          } else {
            sessionStorage.setItem('authToken', newAccessToken);
          }

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');

        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;