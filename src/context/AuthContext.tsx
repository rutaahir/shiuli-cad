import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'client' | 'staff' | 'admin';
  phone_number?: string;
  profile_photo?: string | null;
}

export type AuthIntentType = 'wishlist' | 'purchase' | 'custom-request' | 'general';

export interface PendingIntent {
  actionFn: () => void | Promise<void>;
  intent: AuthIntentType;
  productId?: string;
  formData?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (fields: { name: string; email: string; password: string; phone_number?: string }) => Promise<any>;
  sendRegistrationOtp: (email: string, name?: string) => Promise<any>;
  verifyRegistrationOtp: (fields: { email: string; code: string; name: string; password: string; phone_number?: string }) => Promise<any>;
  logout: (redirectTo?: string) => Promise<void>;
  updateUser: (updatedUser: UserProfile) => void;
  refreshUser: () => Promise<UserProfile | null>;
  requireAuth: (actionFn: () => void | Promise<void>, options?: { intent?: AuthIntentType; message?: string; productId?: string; formData?: any }) => boolean;
  pendingIntent: PendingIntent | null;
  authModalOpen: boolean;
  authModalMessage: string | null;
  openAuthModal: (message?: string) => void;
  closeAuthModal: () => void;
  executePendingIntent: () => Promise<void>;
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false; // Non-standard or mock token; let backend validate
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false;
    // Buffer of 30 seconds
    return payload.exp * 1000 <= Date.now() + 30000;
  } catch {
    return false; // On parse failure, don't proactively expire; let server decide
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with cached user immediately so UI shows logged in state without flicker
  const [user, setUser] = useState<UserProfile | null>(() => {
    const token = localStorage.getItem('shiuli_access_token');
    const refresh = localStorage.getItem('shiuli_refresh_token');
    const saved = localStorage.getItem('shiuli_user');
    if ((token || refresh) && saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const token = localStorage.getItem('shiuli_access_token');
    const refresh = localStorage.getItem('shiuli_refresh_token');
    return Boolean(token || refresh);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Intent & Modal state for auth-gating
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('shiuli_user', JSON.stringify(updatedUser));
  }, []);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const currentUser = await api.getMe();
      setUser(currentUser);
      localStorage.setItem('shiuli_user', JSON.stringify(currentUser));
      return currentUser;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
      return null;
    }
  }, []);

  // Restore session silently on initial load with token refresh fallback
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      const token = localStorage.getItem('shiuli_access_token');
      const refresh = localStorage.getItem('shiuli_refresh_token');

      // If user has neither access nor refresh token, they are not logged in
      if (!token && !refresh) {
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // If access token is missing or expired, attempt silent refresh using refresh token
      let activeToken = token;
      if (!activeToken || isTokenExpired(activeToken)) {
        if (refresh) {
          try {
            activeToken = await api.refreshToken();
          } catch (refreshErr: any) {
            // Only clear session if refresh token was rejected by server (400/401)
            if (refreshErr?.isAuthExpired || refreshErr?.status === 401 || refreshErr?.status === 400) {
              api.clearSession();
              if (isMounted) {
                setIsLoggedIn(false);
                setUser(null);
                setIsLoading(false);
              }
              return;
            }
            // For network errors (e.g. offline when opening browser), retain cached login!
            if (isMounted) {
              setIsLoading(false);
            }
            return;
          }
        } else {
          // Access token expired and no refresh token available
          api.clearSession();
          if (isMounted) {
            setIsLoggedIn(false);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
      }

      try {
        const currentUser = await api.getMe();
        if (isMounted) {
          setUser(currentUser);
          setIsLoggedIn(true);
          localStorage.setItem('shiuli_user', JSON.stringify(currentUser));
        }
      } catch (err: any) {
        // Only invalidate if server actively rejects authenticated session
        if (err?.isAuthExpired || err?.status === 401) {
          api.clearSession();
          if (isMounted) {
            setIsLoggedIn(false);
            setUser(null);
          }
        } else {
          // If offline / network error, retain existing user credentials!
          console.warn('Could not contact server during session restore; keeping cached profile:', err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for global auth expiration (401 token invalid / refresh failed)
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsLoggedIn(false);
      setUser(null);
    };
    window.addEventListener('shiuli:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('shiuli:auth_expired', handleAuthExpired);
    };
  }, []);

  // Multi-tab sync: listen for storage events to immediately logout if token removed in another tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === 'shiuli_access_token' || e.key === 'shiuli_user') && !e.newValue) {
        // Verify if both tokens are truly gone (intentional logout)
        const hasToken = localStorage.getItem('shiuli_access_token');
        const hasRefresh = localStorage.getItem('shiuli_refresh_token');
        if (!hasToken && !hasRefresh) {
          setUser(null);
          setIsLoggedIn(false);
          setPendingIntent(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password);
    setUser(data.user);
    setIsLoggedIn(true);
    return data;
  };

  const register = async (fields: { name: string; email: string; password: string; phone_number?: string }) => {
    const data = await api.registerClient(fields);
    setUser(data.user);
    setIsLoggedIn(true);
    return data;
  };

  const sendRegistrationOtp = async (email: string, name?: string) => {
    return await api.sendRegistrationOtp(email, name);
  };

  const verifyRegistrationOtp = async (fields: {
    email: string;
    code: string;
    name: string;
    password: string;
    phone_number?: string;
  }) => {
    const data = await api.verifyRegistrationOtp(fields);
    setUser(data.user);
    setIsLoggedIn(true);
    return data;
  };

  const logout = useCallback(async (redirectTo: string = '/login') => {
    try {
      await api.logout();
    } catch {
      // Ignore network failure during logout
    } finally {
      api.clearSession();
      setUser(null);
      setIsLoggedIn(false);
      setPendingIntent(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('shiuli:logout'));
        if (redirectTo) {
          window.location.replace(redirectTo);
        }
      }
    }
  }, []);

  const openAuthModal = useCallback((message?: string) => {
    setAuthModalMessage(message || null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalMessage(null);
    setPendingIntent(null);
  }, []);

  const executePendingIntent = useCallback(async () => {
    if (pendingIntent?.actionFn) {
      const fn = pendingIntent.actionFn;
      setPendingIntent(null);
      setAuthModalOpen(false);
      setAuthModalMessage(null);
      try {
        await fn();
      } catch (err) {
        console.error('[AuthContext] Error executing pending intent:', err);
      }
    }
  }, [pendingIntent]);

  const requireAuth = useCallback(
    (
      actionFn: () => void | Promise<void>,
      options?: { intent?: AuthIntentType; message?: string; productId?: string; formData?: any }
    ): boolean => {
      if (isLoggedIn) {
        actionFn();
        return true;
      }

      // Not logged in -> store intent and open modal with contextual message
      let defaultMsg = 'Sign in to perform this action';
      const intent = options?.intent || 'general';

      if (intent === 'wishlist') {
        defaultMsg = 'Sign in to save this design to your wishlist';
      } else if (intent === 'purchase') {
        defaultMsg = 'Sign in to complete your purchase';
      } else if (intent === 'custom-request') {
        defaultMsg = "Sign in to submit your custom design request — we'll save everything you've entered.";
      }

      const msg = options?.message || defaultMsg;
      setPendingIntent({
        actionFn,
        intent,
        productId: options?.productId,
        formData: options?.formData,
      });
      setAuthModalMessage(msg);
      setAuthModalOpen(true);
      return false;
    },
    [isLoggedIn]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        isLoading,
        login,
        register,
        sendRegistrationOtp,
        verifyRegistrationOtp,
        logout,
        updateUser,
        refreshUser,
        requireAuth,
        pendingIntent,
        authModalOpen,
        authModalMessage,
        openAuthModal,
        closeAuthModal,
        executePendingIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
