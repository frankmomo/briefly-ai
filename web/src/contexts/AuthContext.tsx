'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  subscribed: boolean;
  subscriptionChecked: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  subscribed: false,
  subscriptionChecked: false,
  login: () => {},
  logout: () => {},
  refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('briefly_token');
    const storedUser = localStorage.getItem('briefly_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Si falla el parse, limpiar almacenamiento corrupto
        localStorage.removeItem('briefly_token');
        localStorage.removeItem('briefly_user');
      }
    }
    setLoading(false);
  }, []);

  // Verificar suscripción cuando user/token cambien
  useEffect(() => {
    if (!token || !user) {
      setSubscriptionChecked(true);
      return;
    }

    let cancelled = false;

    getSubscriptionStatus()
      .then((res) => {
        if (!cancelled) {
          setSubscribed(res.active);
          setSubscriptionChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubscribed(false);
          setSubscriptionChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('briefly_token', newToken);
    localStorage.setItem('briefly_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setSubscribed(false); // Reset — se verificará en el useEffect
    setSubscriptionChecked(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('briefly_token');
    localStorage.removeItem('briefly_user');
    setToken(null);
    setUser(null);
    setSubscribed(false);
    setSubscriptionChecked(true);
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getSubscriptionStatus();
      setSubscribed(res.active);
    } catch {
      setSubscribed(false);
    } finally {
      setSubscriptionChecked(true);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        subscribed,
        subscriptionChecked,
        login,
        logout,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
