'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getStoredUser, storeAuth, clearAuth, AuthUser, AuthTokens } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthTokens>('/auth/login', { email, password });
    storeAuth(data);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {}
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return { user, loading, login, logout, isAdmin, isManager };
}
