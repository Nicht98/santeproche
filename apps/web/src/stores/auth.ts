import { create } from 'zustand';
import type { AuthResponse } from '../lib/api';

export type AuthState = {
  user: AuthResponse['user'] | null;
  accessToken: string | null;
  refreshToken: string | null;
  isProfileComplete: boolean;
  isAuthenticated: boolean;
  setAuth: (payload: AuthResponse) => void;
  completeProfile: () => void;
  logout: () => void;
  hydrate: () => void;
};

const stored = (() => {
  try {
    const raw = localStorage.getItem('auth');
    if (raw) return JSON.parse(raw) as AuthResponse | null;
  } catch { /* noop */ }
  return null;
})();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored?.user ?? null,
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  isProfileComplete: stored?.isProfileComplete ?? false,
  isAuthenticated: !!stored?.accessToken,

  setAuth: (payload) => {
    localStorage.setItem('auth', JSON.stringify(payload));
    set({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      isProfileComplete: payload.isProfileComplete,
      isAuthenticated: true,
    });
  },

  completeProfile: () => {
    set((state) => {
      const next = { ...state, isProfileComplete: true };
      localStorage.setItem('auth', JSON.stringify({
        user: next.user,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        isProfileComplete: true,
      }));
      return next;
    });
  },

  logout: () => {
    localStorage.removeItem('auth');
    set({ user: null, accessToken: null, refreshToken: null, isProfileComplete: false, isAuthenticated: false });
  },
  hydrate: () => {},
}));
