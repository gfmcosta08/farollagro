import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  areaUnit: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: User, tenant: Tenant) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantName: string;
  document?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user, tenant } = response.data;
        set({ token, user, tenant, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      register: async (data: RegisterData) => {
        const response = await api.post('/auth/register', data);
        const { token, user, tenant } = response.data;
        set({ token, user, tenant, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      logout: () => {
        set({ token: null, user: null, tenant: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      setAuth: (token: string, user: User, tenant: Tenant) => {
        set({ token, user, tenant, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }),
    {
      name: 'farollagro-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
