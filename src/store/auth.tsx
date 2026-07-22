/**
 * AuthContext — global auth state.
 *
 * Wrap seluruh app dengan AuthProvider.
 * Gunakan useAuthContext() di komponen manapun untuk akses user.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  getStoredUser,
  signInWithGoogle,
  signOut as apiSignOut,
  refreshFirebaseToken,
  updateStoredToken,
  configureGoogleSignIn,
} from '../api/auth';
import type {FirebaseUser} from '../types';

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getValidToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    configureGoogleSignIn();

    // Cek stored session saat startup
    getStoredUser()
      .then(stored => {
        if (stored) {
          setUser(stored);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async () => {
    setError(null);
    try {
      const firebaseUser = await signInWithGoogle();
      setUser(firebaseUser);
    } catch (e: any) {
      const msg = e?.message ?? 'Login gagal';
      setError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  /**
   * Kembalikan ID token yang valid.
   * Kalau sudah expired, refresh dulu lewat securetoken endpoint.
   * Komponen tidak perlu tahu detail token expiry.
   */
  const getValidToken = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Tidak ada sesi aktif');
    try {
      // Coba pakai token yang ada
      return user.idToken;
    } catch (_) {
      // Refresh jika perlu
      if (!user.refreshToken) throw new Error('Refresh token tidak ada');
      const newToken = await refreshFirebaseToken(user.refreshToken);
      const updated = await updateStoredToken(user, newToken);
      setUser(updated);
      return newToken;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{user, loading, error, login, logout, getValidToken}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext harus dipakai di dalam AuthProvider');
  }
  return ctx;
}
