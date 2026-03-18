import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiPost } from '@/api';
import type { UserCredentialResponse } from '@/types';

interface AuthUser {
  name: string;
  email: string;
  givenName: string;
  familyName: string;
  pictureUrl: string;
  isAdmin: boolean;
  businessId: number | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  businessId: number | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (googleToken: string) => Promise<void>;
  logout: () => void;
  setBusinessId: (businessId: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'userCredential';
const CUSTOMER_STORAGE_KEY = 'bookingCustomerData';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 < Date.now();
}

interface StoredCredential {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isAdmin: false,
    businessId: null,
    loading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredCredential = JSON.parse(stored);
        if (parsed.token && !isTokenExpired(parsed.token)) {
          const payload = decodeJwtPayload(parsed.token);
          setState({
            // No persistimos businessId: siempre lo resolvemos consultando backend.
            user: { ...parsed.user, businessId: null },
            token: parsed.token,
            isAuthenticated: true,
            isAdmin: (payload?.isAdmin as boolean) ?? false,
            businessId: null,
            loading: false,
          });
          return;
        }
      } catch { /* corrupted storage */ }
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(prev => ({ ...prev, loading: false }));
  }, []);

  const login = useCallback(async (googleToken: string) => {
    const data = await apiPost<UserCredentialResponse>('/auth/google/login', { token: googleToken });

    const payload = decodeJwtPayload(data.jwt);
    const user: AuthUser = {
      name: data.name,
      email: data.email,
      givenName: data.givenName,
      familyName: data.familyName,
      pictureUrl: data.pictureUrl,
      isAdmin: data.isAdmin,
      // No persistimos businessId: lo resolvemos consultando backend en los guards.
      businessId: null,
    };

    const stored: StoredCredential = { token: data.jwt, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    setState({
      user,
      token: data.jwt,
      isAuthenticated: true,
      isAdmin: data.isAdmin,
      businessId: null,
      loading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      businessId: null,
      loading: false,
    });
  }, []);

  const setBusinessId = useCallback((businessId: number) => {
    setState((prev) => {
      if (!prev.user || !prev.token) return prev;
      const updatedUser = { ...prev.user, businessId };
      // No persistimos businessId en localStorage.
      return { ...prev, user: updatedUser, businessId };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setBusinessId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
