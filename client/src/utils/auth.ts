import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';

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
  loading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
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
      loading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData.session;

          if (!session?.user) {
            set({ token: null, user: null, tenant: null, isAuthenticated: false, loading: false });
            return;
          }

          const { data: userRow, error: userError } = await supabase
            .from('User')
            .select('id,email,name,role,tenantId')
            .eq('id', session.user.id)
            .single();

          if (userError || !userRow) {
            throw new Error('Perfil de usuario nao encontrado. Confira tabela User no schema Supabase.');
          }

          const { data: tenantRow, error: tenantError } = await supabase
            .from('Tenant')
            .select('id,name,areaUnit')
            .eq('id', userRow.tenantId)
            .single();

          if (tenantError || !tenantRow) {
            throw new Error('Tenant nao encontrado para o usuario autenticado.');
          }

          set({
            token: session.access_token,
            user: {
              id: userRow.id,
              email: userRow.email,
              name: userRow.name,
              role: userRow.role
            },
            tenant: {
              id: tenantRow.id,
              name: tenantRow.name,
              areaUnit: tenantRow.areaUnit
            },
            isAuthenticated: true,
            loading: false
          });
        } catch (error) {
          set({ token: null, user: null, tenant: null, isAuthenticated: false, loading: false });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const session = data.session;
        if (!session?.user) {
          throw new Error('Nao foi possivel iniciar sessao com este usuario.');
        }

        const { data: userRow, error: userError } = await supabase
          .from('User')
          .select('id,email,name,role,tenantId')
          .eq('id', session.user.id)
          .single();

        if (userError || !userRow) {
          throw new Error('Perfil nao encontrado. Confirme se a tabela User possui id igual ao auth user id.');
        }

        const { data: tenantRow, error: tenantError } = await supabase
          .from('Tenant')
          .select('id,name,areaUnit')
          .eq('id', userRow.tenantId)
          .single();

        if (tenantError || !tenantRow) {
          throw new Error('Tenant nao encontrado para este usuario.');
        }

        set({
          token: session.access_token,
          user: {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
            role: userRow.role
          },
          tenant: {
            id: tenantRow.id,
            name: tenantRow.name,
            areaUnit: tenantRow.areaUnit
          },
          isAuthenticated: true
        });
      },

      register: async (data: RegisterData) => {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name
            }
          }
        });

        if (signUpError) throw signUpError;

        if (!signUpData.session || !signUpData.user) {
          throw new Error('Cadastro criado, mas sessao nao iniciada. Desative confirmacao de email no Supabase ou confirme o email primeiro.');
        }

        const authUser = signUpData.user;

        const { data: tenantRow, error: tenantError } = await supabase
          .from('Tenant')
          .insert({
            name: data.tenantName,
            document: data.document || null,
            email: data.email
          })
          .select('id,name,areaUnit')
          .single();

        if (tenantError || !tenantRow) {
          throw tenantError || new Error('Erro ao criar tenant.');
        }

        const { data: userRow, error: userError } = await supabase
          .from('User')
          .insert({
            id: authUser.id,
            email: data.email,
            name: data.name,
            role: 'ADMIN',
            tenantId: tenantRow.id
          })
          .select('id,email,name,role')
          .single();

        if (userError || !userRow) {
          throw userError || new Error('Erro ao criar usuario na tabela User.');
        }

        set({
          token: signUpData.session.access_token,
          user: {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
            role: userRow.role
          },
          tenant: {
            id: tenantRow.id,
            name: tenantRow.name,
            areaUnit: tenantRow.areaUnit
          },
          isAuthenticated: true
        });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ token: null, user: null, tenant: null, isAuthenticated: false });
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
