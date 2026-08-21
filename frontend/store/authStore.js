import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.token });
        return data.user;
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        set({ user: data.user, token: data.token });
        return data.user;
      },

      logout: async () => {
        await api.post('/auth/logout').catch(() => {});
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    { name: 'quantumxd-auth', partialize: s => ({ user: s.user, token: s.token }) }
  )
);
