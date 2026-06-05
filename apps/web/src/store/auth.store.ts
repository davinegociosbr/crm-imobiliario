import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  company: { id: string; name: string; logo?: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('crm_token', data.token);
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      register: async (formData) => {
        const { data } = await api.post('/auth/register', formData);
        localStorage.setItem('crm_token', data.token);
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('crm_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
