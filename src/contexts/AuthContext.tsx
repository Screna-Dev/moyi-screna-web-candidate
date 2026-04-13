import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { safeCapture, safeIdentify } from '@/utils/posthog';
import API from '@/services/api';
import { getPersonalInfo } from '@/services/ProfileServices';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  country?: string;
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  setUserFromToken: (token: string) => Promise<void>;
}

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
const decodeToken = (token: string): Pick<User, 'id' | 'role'> | null => {
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
    const role = payload.roles[0];

    return {
      id: payload.sub || payload.userId || payload.id || '',
      role,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
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
          const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo };
          setUser(userData);
          safeIdentify(posthog, userData.id, {
            email: userData.email,
            name: userData.name,
            role: userData.role,
          });
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
        const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo };
        setUser(userData);
        safeIdentify(posthog, userData.id, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        });
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
        const userData: User = { id: '', email: '', name: '', ...tokenData, ...personalInfo };
        setUser(userData);
        safeIdentify(posthog, userData.id, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
        });
        return userData;
      } else {
        const fallback: User = { id: '', email, name: '', avatar: '' };
        setUser(fallback);
        return fallback;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      await API.post('/auth/signup', { email, password, name });
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

  const loginWithGoogle = () => {
    const clientId = "930330871717-0atvb2bigfithtl3d9pp9amer7u81klc.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = "openid email profile";
    const responseType = "code";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=${responseType}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline`;
    
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