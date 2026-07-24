import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { safeIdentify, safeCapture } from '@/utils/posthog';
import { getDaysSinceOnboarding } from '@/utils/analytics';
import { EVENTS } from '@/constants/analyticsEvents';
import API from '@/services/api';
import { getPersonalInfo } from '@/services/ProfileServices';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  // All roles carried by the JWT (e.g. ['CANDIDATE', 'MENTOR']). `role` keeps
  // the primary/first role for backwards compatibility; `roles` lets us detect
  // dual-role accounts that can switch between the candidate and mentor dashboards.
  roles?: string[];
  country?: string;
  timezone?: string;
  // Whether the account has an email/password credential (vs. Google-only).
  // Derived from the sign-in method + JWT federated identity; see detectHasPassword.
  hasPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  signup: (email: string, password: string, name: string, referralCode?: string) => Promise<void>;
  loginWithGoogle: (fromSignup?: boolean, returnTo?: string, referralCode?: string) => void;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  setUserFromToken: (token: string) => Promise<void>;
}

// localStorage keys recording how the account authenticates. These let the
// Security settings tab show password controls only for email/password
// accounts (Google accounts have no password credential).
const AUTH_PROVIDER_KEY = 'screna_auth_provider'; // 'password' | 'google'
const HAS_PASSWORD_KEY = 'screna_has_password';   // 'true' once a password exists

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to decode JWT and extract user info
const decodeToken = (token: string): Pick<User, 'id' | 'role' | 'roles'> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    const roles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
    const role = roles[0];

    return {
      id: payload.sub || payload.userId || payload.id || '',
      role,
      roles,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

// Decode the raw JWT payload (claims) without throwing.
const decodeTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Decide whether the account has an email/password credential.
// Priority: explicit "password set" flag → recorded sign-in method →
// JWT federated-identity signal (Cognito marks Google users with an
// `identities` claim and a `google_<sub>` username). Defaults to true
// (treat as a password account) when there is no Google signal.
const detectHasPassword = (token: string): boolean => {
  if (localStorage.getItem(HAS_PASSWORD_KEY) === 'true') return true;

  const provider = localStorage.getItem(AUTH_PROVIDER_KEY);
  if (provider === 'password') return true;
  if (provider === 'google') return false;

  const claims = decodeTokenPayload(token);
  if (claims) {
    const identities = claims.identities;
    if (Array.isArray(identities) && identities.length > 0) return false;
    const username = String(
      claims.username || claims['cognito:username'] || ''
    ).toLowerCase();
    if (/^google[_-]/.test(username)) return false;
  }
  return true;
};

// Fetch personal info (name, email, avatar, country, timezone) from API
const fetchPersonalInfo = async (): Promise<Partial<User>> => {
  try {
    const response = await getPersonalInfo();
    const data = response.data?.data;
    if (!data) return {};
    return {
      name: data.name || '',
      email: data.email || '',
      avatar: data.avatarUrl || '',
      country: data.country || '',
      timezone: data.timezone || '',
    };
  } catch (error) {
    console.error('Failed to fetch personal info:', error);
    return {};
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const posthog = usePostHog();

  // Retention: 用户进入平台时上报 app_opened（在 identify 之后调用，确保事件归属到用户）
  const trackAppOpened = (isReturning: boolean) => {
    safeCapture(posthog, EVENTS.APP_OPENED, {
      days_since_onboarding: getDaysSinceOnboarding(),
      entry_page: window.location.pathname,
      is_returning: isReturning,
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        const tokenData = decodeToken(token);
        if (tokenData) {
          const personalInfo = await fetchPersonalInfo();
          const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo, hasPassword: detectHasPassword(token) };
          setUser(userData);
          safeIdentify(posthog, userData.id, {
            email: userData.email,
            name: userData.name,
            role: userData.role,
          });
          trackAppOpened(true);
        } else {
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const setUserFromToken = async (token: string) => {
    setIsLoading(true);
    try {
      const tokenData = decodeToken(token);
      if (tokenData) {
        const personalInfo = await fetchPersonalInfo();
        const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo, hasPassword: detectHasPassword(token) };
        setUser(userData);
        window.dispatchEvent(new Event('screna-auth-change'));
        safeIdentify(posthog, userData.id, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        });
        trackAppOpened(false);
        window.dispatchEvent(new Event('screna-auth-change'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    const response = await API.post('/auth/signin', { email, password });
    
    const accessToken = response.data.data.accessToken;
    const refreshToken = response.data.data.refreshToken;

    // Signing in with email + password means the account has a password.
    localStorage.setItem(AUTH_PROVIDER_KEY, 'password');
    localStorage.setItem(HAS_PASSWORD_KEY, 'true');

    if (rememberMe) {
      localStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    } else {
      sessionStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
      }
    }

    try {
      const tokenData = decodeToken(accessToken);
      if (tokenData) {
        const personalInfo = await fetchPersonalInfo();
        const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo, hasPassword: true };
        setUser(userData);
        window.dispatchEvent(new Event('screna-auth-change'));
        safeIdentify(posthog, userData.id, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        });
        trackAppOpened(false);
        window.dispatchEvent(new Event('screna-auth-change'));
        return userData;
      } else {
        const fallback: User = { id: '', email, name: '', avatar: '', hasPassword: true };
        setUser(fallback);
        window.dispatchEvent(new Event('screna-auth-change'));
        return fallback;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, referralCode?: string) => {
    try {
      const payload: Record<string, string> = { email, password, name };
      if (referralCode) payload.referralCode = referralCode;
      await API.post('/auth/signup', payload);
      // 00 — Acquire: 邮箱注册成功（UTM 归因经 super properties 自动附带）
      safeCapture(posthog, EVENTS.SIGNUP_COMPLETED, {
        signup_method: 'email',
        promo_code: referralCode || null,
      });
    } catch (error: any) {
      if (error.response?.data?.errorCode === 'EMAIL_NOT_VERIFIED' || 
          error.response?.data?.errorCode === 'USER_EXISTS_UNVERIFIED') {
        try {
          await API.post('/auth/resend-confirmation-code', { email });
        } catch (resendError) {
          console.error('Failed to resend verification code:', resendError);
        }
        throw error;
      }
      throw error;
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    await API.post('/auth/verify-email', { 
      email, 
      confirmationCode: code 
    });
  };

  const resendVerificationCode = async (email: string) => {
    await API.post('/auth/resend-confirmation-code', { email });
  };

  const loginWithGoogle = (fromSignup = false, returnTo = '', referralCode = '') => {
    const clientId = "930330871717-0atvb2bigfithtl3d9pp9amer7u81klc.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = "openid email profile";
    const responseType = "code";
    const state = encodeURIComponent(JSON.stringify({ flow: fromSignup ? 'signup' : 'login', returnTo, referralCode }));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=${responseType}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=select_account` +
      `&state=${state}`;

    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      await API.post('/auth/signout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem(AUTH_PROVIDER_KEY);
    localStorage.removeItem(HAS_PASSWORD_KEY);
    localStorage.removeItem('screnaIsLoggedIn');
    localStorage.removeItem('screnaUserData');
    localStorage.removeItem('screna_share_count');
    localStorage.removeItem('theme');
    localStorage.removeItem('cookie_consent');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    // Clear any PostHog tracking data
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ph_')) {
        localStorage.removeItem(key);
      }
    }
    setUser(null);
    window.dispatchEvent(new Event('screna-auth-change'));
    navigate('/auth');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    loginWithGoogle,
    logout,
    verifyEmail,
    resendVerificationCode,
    setUserFromToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};