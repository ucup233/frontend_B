'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, getAuthToken, setAuthToken, clearAuthToken } from './api';

interface User {
  id: number;
  username: string;
  nama?: string;
  email?: string;
  role: 'superadmin' | 'pelayanan' | 'distribusi' | 'keuangan' | 'penerimaan';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authApi.getMe();
          if (response.data) {
            setUser(response.data);
          }
        } catch (err) {
          clearAuthToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(username, password);
      if (response.data?.token) {
        setAuthToken(response.data.token);
        setUser(response.data.user || { id: 1, username });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuthToken();
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
