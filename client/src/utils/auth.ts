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
  city?: string;
  state?: string;
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
        const registerPayload = {
          email: data.email.trim().toLowerCase(),
          password: data.password,
          name: data.name.trim(),
          tenantName: data.tenantName.trim(),
          document: data.document?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null
        };

        let authUser: { id: string } | null = null;
        let accessToken: string | null = null;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: registerPayload.email,
          password: registerPayload.password,
          options: {
            data: {
              name: registerPayload.name
            }
          }
        });

        if (signUpError) {
          const message = signUpError.message?.toLowerCase() || '';

          if (message.includes('user already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: registerPayload.email,
              password: registerPayload.password
            });

            if (signInError || !signInData.session || !signInData.user) {
              throw new Error('Este email ja esta cadastrado. Se for sua conta, faca login.');
            }

            authUser = { id: signInData.user.id };
            accessToken = signInData.session.access_token;
          } else if (message.includes('email signups are disabled')) {
            throw new Error('Cadastro por email esta desativado no Supabase. Ative Email Provider em Authentication > Providers.');
          } else {
            throw signUpError;
          }
        } else {
          authUser = signUpData.user ? { id: signUpData.user.id } : null;
          accessToken = signUpData.session?.access_token || null;
        }

        if (!authUser) {
          throw new Error('Nao foi possivel criar o usuario de autenticacao.');
        }

        if (!accessToken) {
          throw new Error('Conta criada. Confira seu email para confirmar o cadastro antes do primeiro login.');
        }

        const { data: existingTenant, error: existingTenantError } = await supabase
          .from('Tenant')
          .select('id,name,areaUnit')
          .eq('email', registerPayload.email)
          .maybeSingle();

        if (existingTenantError) {
          throw existingTenantError;
        }

        let tenantRow: { id: string; name: string; areaUnit: string } | null = existingTenant || null;

        if (!tenantRow) {
          const { data: createdTenant, error: tenantError } = await supabase
            .from('Tenant')
            .insert({
              name: registerPayload.tenantName,
              document: registerPayload.document,
              email: registerPayload.email,
              city: registerPayload.city,
              state: registerPayload.state
            })
            .select('id,name,areaUnit')
            .single();

          if (tenantError || !createdTenant) {
            throw tenantError || new Error('Erro ao criar tenant.');
          }

          tenantRow = createdTenant;
        }

        const { data: existingUser, error: existingUserError } = await supabase
          .from('User')
          .select('id,email,name,role,tenantId')
          .eq('id', authUser.id)
          .maybeSingle();

        if (existingUserError) {
          throw existingUserError;
        }

        let userRow: { id: string; email: string; name: string; role: string } | null = null;

        if (existingUser) {
          const { data: updatedUser, error: updateUserError } = await supabase
            .from('User')
            .update({
              name: registerPayload.name,
              tenantId: tenantRow.id
            })
            .eq('id', authUser.id)
            .select('id,email,name,role')
            .single();

          if (updateUserError || !updatedUser) {
            throw updateUserError || new Error('Erro ao atualizar perfil de usuario.');
          }
          userRow = updatedUser;
        } else {
          const { data: createdUser, error: userError } = await supabase
            .from('User')
            .insert({
              id: authUser.id,
              email: registerPayload.email,
              name: registerPayload.name,
              role: 'ADMIN',
              tenantId: tenantRow.id
            })
            .select('id,email,name,role')
            .single();

          if (userError || !createdUser) {
            throw userError || new Error('Erro ao criar usuario na tabela User.');
          }
          userRow = createdUser;
        }

        set({
          token: accessToken,
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
