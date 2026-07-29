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

// Persist a freshly minted access token. The refresh token is deliberately NOT
// written here: the backend does NOT rotate refresh tokens — /auth/refresh-token
// returns `refreshToken: null`, and the original one stays valid for its full
// 30-day life. Overwriting the stored value with the null response would log the
// user out on the next refresh. See docs/auth (JWT Auth APIs) — "no rotation".
const persistAccessToken = (accessToken) => {
  if (!accessToken) return;
  resolveStore().setItem('authToken', accessToken);
};

const clearTokens = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('refreshToken');
};

// Decode a JWT payload (base64url) without verifying it. Works even on an
// expired access token — decoding does not check `exp`. Used only to read the
// `sub` (userId) and `exp` claims for the refresh flow; never for authorization.
const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// The refresh endpoint requires the userId. We don't store it separately — it's
// the `sub` claim of the (still-decodable, possibly expired) access token.
const getUserId = () => {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub || payload?.userId || payload?.id || null;
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

// --- Session end -----------------------------------------------------------
// A failed refresh is the only signal that the 30-day refresh token is gone
// (expired, revoked by a signout elsewhere, or the account was banned). Clear
// everything and bounce to sign-in. Idempotent: several in-flight requests can
// fail at once, so guard against stacking redirects.
let sessionEnding = false;
const handleSessionEnded = () => {
  clearTokens();
  stopProactiveRefresh();
  window.dispatchEvent(new Event('screna-auth-change'));
  if (sessionEnding) return;
  sessionEnding = true;
  if (window.location.pathname !== '/auth') {
    window.location.href = '/auth';
  }
};

// --- Single-flight token refresh -------------------------------------------
// When the access token expires, many in-flight requests can fail at once. We
// funnel every concurrent refresh through one shared promise so exactly one
// network call happens and everyone waits on its result.
let refreshPromise = null;

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  const userId = getUserId();
  if (!refreshToken || !userId) {
    return Promise.reject(new Error('No refresh token / userId available'));
  }

  refreshPromise = axios
    // Public endpoint: send NO Authorization header (a raw axios call, not the
    // API instance, so the request interceptor above never runs). An expired
    // bearer would otherwise break this very call.
    .post(
      `${API.defaults.baseURL}/auth/refresh-token`,
      { userId, refreshToken }
    )
    .then((response) => {
      const data = response.data?.data ?? response.data;
      const newAccessToken = data?.accessToken;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      // Persist ONLY the access token. data.refreshToken is null (no rotation).
      persistAccessToken(newAccessToken);
      // Keep the proactive cycle alive off the fresh token's own `exp`.
      scheduleProactiveRefresh(newAccessToken);
      return newAccessToken;
    })
    .finally(() => {
      // Allow the next expiry cycle to trigger a fresh refresh.
      refreshPromise = null;
    });

  return refreshPromise;
};

// --- Proactive refresh -----------------------------------------------------
// Access tokens live only 30 min. Rather than wait for a request to fail, we
// refresh at ~80% of the token's remaining life, computed from its own `exp`
// claim (the server-driven source of truth — no need to plumb `expiresIn`).
// This keeps the reactive interceptor below a genuine fallback.
let proactiveTimer = null;

const stopProactiveRefresh = () => {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
};

// Schedule the next proactive refresh based on the given (or stored) access
// token's exp/iat claims. Safe to call repeatedly — it replaces any pending
// timer. Exposed so AuthContext can start the cycle on login / cold start.
export const scheduleProactiveRefresh = (token = getAccessToken()) => {
  stopProactiveRefresh();
  if (!token) return;

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (!exp) return;

  const nowSec = Date.now() / 1000;
  const iat = payload?.iat ?? nowSec;
  const lifetime = Math.max(exp - iat, 0);
  // Fire at 80% of the token's total life, measured from now. If the token is
  // already at/past that point, refresh on the next tick.
  const fireAtSec = iat + lifetime * 0.8;
  const delayMs = Math.max((fireAtSec - nowSec) * 1000, 0);

  proactiveTimer = setTimeout(() => {
    refreshAccessToken().catch(() => handleSessionEnded());
  }, delayMs);
};

export const stopTokenRefreshCycle = stopProactiveRefresh;

// Endpoints where a failure must NOT trigger a refresh attempt (avoids loops
// and nonsensical retries — a failed sign-in shouldn't try to refresh).
const isAuthEndpoint = (url = '') =>
  url.includes('/auth/refresh-token') ||
  url.includes('/auth/signin') ||
  url.includes('/auth/signup') ||
  url.includes('/auth/signout');

// An access token that is present but expired / malformed / wrong-signature
// currently escapes the backend's filter chain and comes back as a bare 500
// with NO CustomApiResponse envelope (its `status` field is absent), rather
// than a clean 401. Treat either signal as "token expired, try refreshing".
// A genuine application 500 carries the envelope (status: 'ERROR') and is left
// alone. See docs/auth — "Expired token behaviour".
const isExpiredTokenResponse = (response) => {
  if (!response) return false;
  if (response.status === 401) return true;
  if (response.status === 500 && response.data?.status !== 'ERROR') return true;
  return false;
};

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

    // Only 401 (or an envelope-less 500) means "token expired". A 403 is
    // authenticated-but-not-allowed (wrong role / tier / credits gate) and must
    // never trigger a refresh — it would just loop.
    if (
      isExpiredTokenResponse(error.response) &&
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
        // Refresh failed (refresh token expired/invalid) — end the session.
        handleSessionEnded();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
