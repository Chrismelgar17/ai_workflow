import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  tenant_id?: string;
  tenant_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        setTimeout(() => {
          try {
            (useAuthStore as any).setState({ hydrated: true });
          } catch {}
        }, 0);
      },
    }
  )
);
