import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) => Promise<any>;
  logout: () => Promise<void>;
  oauthLogin: (provider: 'google' | 'github', providerId: string, email: string, firstName: string, lastName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  getSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('sentinel_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sentinel_access_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('sentinel_access_token');
        if (storedToken) {
          const res = await api.get('/auth/profile');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('sentinel_user', JSON.stringify(res.data));
          }
        }
      } catch {
        // Token expired or invalid
        localStorage.removeItem('sentinel_access_token');
        localStorage.removeItem('sentinel_refresh_token');
        localStorage.removeItem('sentinel_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleLogoutEvent = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('sentinel_auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('sentinel_auth_logout', handleLogoutEvent);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', credentials);
      const { accessToken, refreshToken, user: userData } = res.data;

      localStorage.setItem('sentinel_access_token', accessToken);
      localStorage.setItem('sentinel_refresh_token', refreshToken);
      localStorage.setItem('sentinel_user', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  };

  const oauthLogin = async (provider: 'google' | 'github', providerId: string, email: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/oauth/login', {
        provider,
        providerId,
        email,
        firstName,
        lastName,
      });

      const { accessToken, refreshToken, user: userData } = res.data;

      localStorage.setItem('sentinel_access_token', accessToken);
      localStorage.setItem('sentinel_refresh_token', refreshToken);
      localStorage.setItem('sentinel_user', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('sentinel_refresh_token');
    try {
      if (token) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('sentinel_access_token');
      localStorage.removeItem('sentinel_refresh_token');
      localStorage.removeItem('sentinel_user');
      setToken(null);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('sentinel_user', JSON.stringify(res.data));
      }
    } catch {
      // Ignore
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (tokenVal: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { token: tokenVal, newPassword });
    return res.data;
  };

  const verifyEmail = async (tokenVal: string) => {
    const res = await api.post('/auth/verify-email', { token: tokenVal });
    await refreshProfile();
    return res.data;
  };

  const getSessions = async () => {
    const res = await api.get('/auth/sessions');
    return res.data;
  };

  const revokeSession = async (sessionId: string) => {
    await api.delete(`/auth/sessions/${sessionId}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        oauthLogin,
        refreshProfile,
        forgotPassword,
        resetPassword,
        verifyEmail,
        getSessions,
        revokeSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
