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
  logout: () => Promise<void>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const token = localStorage.getItem('shiuli_access_token');
    const saved = localStorage.getItem('shiuli_user');
    if (token && saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('shiuli_access_token');
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

  // Restore session silently on initial load
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      const token = localStorage.getItem('shiuli_access_token');
      if (!token) {
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await api.getMe();
        if (isMounted) {
          setUser(currentUser);
          setIsLoggedIn(true);
          localStorage.setItem('shiuli_user', JSON.stringify(currentUser));
        }
      } catch (err: any) {
        // Token invalid or network error
        if (isMounted) {
          if (err?.status === 401) {
            api.clearSession();
            setIsLoggedIn(false);
            setUser(null);
          }
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

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsLoggedIn(false);
    setPendingIntent(null);
  };

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
