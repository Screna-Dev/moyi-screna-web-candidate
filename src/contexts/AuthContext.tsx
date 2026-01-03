import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<void>;
  setUserFromToken: (token: string) => void; // Add this helper
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
const decodeToken = (token: string): User | null => {
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
    console.log(payload)
    // Extract role - check common JWT field names for admin status
    const role = payload.roles[0];

    
    return {
      id: payload.sub || payload.userId || payload.id || '',
      email: payload.email || '',
      name: payload.name || payload.username || '',
      avatar: payload.avatar || payload.picture || undefined,
      role: role,
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        // Since /auth/me doesn't exist, decode the token to get user info
        const userData = decodeToken(token);
        if (userData) {
          setUser(userData);
        } else {
          // If token is invalid, clear it
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

  const setUserFromToken = (token: string) => {
    const userData = decodeToken(token);
    if (userData) {
      setUser(userData);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
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

    // Decode token to get user data
    const userData = decodeToken(accessToken);
    if (userData) {
      setUser(userData);
    } else {
      // Fallback if token decode fails
      setUser({ id: '', email, name: '', avatar: '' });
    }
    return userData;
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    setUser(null);
    navigate('/auth');
    try {
      await API.post('/auth/signout');
    } catch (error) {
      console.error('Logout error:', error);
    }
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