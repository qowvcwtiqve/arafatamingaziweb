import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

const getInitialAuth = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('quantumxd-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.user && parsed?.state?.token) {
          return {
            user: parsed.state.user,
            token: parsed.state.token,
            _hasHydrated: true,
          };
        }
      }
    } catch { /* ignore */ }
  }
  return { user: null, token: null, _hasHydrated: false };
};

const initial = getInitialAuth();

export const useAuthStore = create(
  persist(
    (set) => ({
      user: initial.user,
      token: initial.token,
      _hasHydrated: initial._hasHydrated,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.token, _hasHydrated: true });
        return data.user;
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        set({ user: data.user, token: data.token, _hasHydrated: true });
        return data.user;
      },

      logout: async () => {
        await api.post('/auth/logout').catch(() => {});
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/users/profile');
          if (data?.user) {
            set((state) => ({
              ...state,
              user: {
                ...state.user,
                ...data.user,
                balance: parseFloat(data.user.balance || 0),
              },
              _hasHydrated: true,
            }));
          }
        } catch {
          // Keep current state on transient network error
        }
      },
    }),
    {
      name: 'quantumxd-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

