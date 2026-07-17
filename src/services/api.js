import axios from 'axios';

// Create axios instance with base configuration
// Uses relative path '/api/v1' to leverage proxy (Vite dev server or Vercel rewrites)
// This avoids CORS issues by routing requests through the same origin
const API = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

// --- Token storage helpers -------------------------------------------------
// Tokens live in localStorage when the user chose "remember me" (persistent),
// otherwise in sessionStorage. We keep the access + refresh tokens together in
// whichever store already holds them.
const getAccessToken = () =>
  localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

const getRefreshToken = () =>
  localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

// Pick the store the session is already using so a refresh doesn't silently
// migrate a "remember me" login into sessionStorage (or vice-versa).
const resolveStore = () => {
  if (localStorage.getItem('authToken') || localStorage.getItem('refreshToken')) {
    return localStorage;
  }
  if (sessionStorage.getItem('authToken') || sessionStorage.getItem('refreshToken')) {
    return sessionStorage;
  }
  return localStorage;
};

const persistTokens = (accessToken, refreshToken) => {
  const store = resolveStore();
  if (accessToken) store.setItem('authToken', accessToken);
  // The backend rotates refresh tokens: each /auth/refresh returns a fresh one
  // and invalidates the old. Persisting it is required for the next refresh.
  if (refreshToken) store.setItem('refreshToken', refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('refreshToken');
};

// Request interceptor to add token to headers
API.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Single-flight token refresh -------------------------------------------
// When the access token expires, many in-flight requests can 401 at once. If
// each one calls /auth/refresh independently, only the first succeeds (the
// backend rotates + invalidates the refresh token) and the rest log the user
// out. We funnel every concurrent refresh through one shared promise so exactly
// one network call happens and everyone waits on its result.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token available'));
  }

  refreshPromise = axios
    .post(
      `${API.defaults.baseURL}/auth/refresh`,
      { refreshToken },
      { withCredentials: true }
    )
    .then((response) => {
      const data = response.data?.data ?? response.data;
      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      persistTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    })
    .finally(() => {
      // Allow the next expiry cycle to trigger a fresh refresh.
      refreshPromise = null;
    });

  return refreshPromise;
};

// Endpoints where a 401 must NOT trigger a refresh attempt (avoids loops and
// nonsensical retries — a failed sign-in shouldn't try to refresh).
const isAuthEndpoint = (url = '') =>
  url.includes('/auth/refresh') ||
  url.includes('/auth/signin') ||
  url.includes('/auth/signup') ||
  url.includes('/auth/signout');

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
    if (
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        // Retry original request with the refreshed token.
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        // Refresh failed (refresh token expired/invalid) — clear session and
        // send the user back to sign in.
        clearTokens();
        window.dispatchEvent(new Event('screna-auth-change'));
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
