import { create } from 'zustand';
import type { AuthResponse } from '../lib/api';

export type AuthState = {
  user: AuthResponse['user'] | null;
  accessToken: string | null;
  refreshToken: string | null;
  isProfileComplete: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  setAuth: (payload: AuthResponse) => void;
  completeProfile: () => void;
  logout: () => void;
  hydrate: () => void;
  loginAsGuest: () => void;
};

const stored = (() => {
  try {
    const raw = localStorage.getItem('auth');
    if (raw) return JSON.parse(raw) as AuthResponse | null;
  } catch { /* noop */ }
  return null;
})();

const isGuestStored = (() => {
  try { return localStorage.getItem('auth_guest') === '1'; } catch { return false; }
})();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored?.user ?? null,
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  isProfileComplete: stored?.isProfileComplete ?? false,
  isAuthenticated: !!stored?.accessToken,
  isGuest: isGuestStored,

  setAuth: (payload) => {
    localStorage.setItem('auth', JSON.stringify(payload));
    localStorage.setItem('accessToken', payload.accessToken);
    localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.removeItem('auth_guest');
    set({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      isProfileComplete: payload.isProfileComplete,
      isAuthenticated: true,
      isGuest: false,
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth_guest');
    set({ user: null, accessToken: null, refreshToken: null, isProfileComplete: false, isAuthenticated: false, isGuest: false });
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw) as AuthResponse;
        if (parsed?.accessToken) {
          localStorage.setItem('accessToken', parsed.accessToken);
        }
        if (parsed?.refreshToken) {
          localStorage.setItem('refreshToken', parsed.refreshToken);
        }
      }
    } catch { /* noop */ }
  },

  loginAsGuest: () => {
    localStorage.setItem('auth_guest', '1');
    set({ isGuest: true, isAuthenticated: false, user: null, accessToken: null, refreshToken: null, isProfileComplete: false });
  },
}));
