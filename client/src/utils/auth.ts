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

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const fallbackNameFromEmail = (email: string) => {
  const localPart = email.split('@')[0] || 'usuario';
  return localPart.replace(/[._-]+/g, ' ').trim() || 'Usuario';
};

const ensureProfile = async (
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> },
  preferredTenantName?: string | null
) => {
  const email = normalizeEmail(authUser.email || '');
  if (!email) {
    throw new Error('Usuario autenticado sem email valido.');
  }

  const displayName = (authUser.user_metadata?.name as string | undefined)?.trim() || fallbackNameFromEmail(email);

  const { data: existingUser, error: existingUserError } = await supabase
    .from('User')
    .select('id,email,name,role,tenantId')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingUserError) {
    throw existingUserError;
  }

  let tenantRow: { id: string; name: string; areaUnit: string } | null = null;

  if (existingUser?.tenantId) {
    const { data: existingTenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('id,name,areaUnit')
      .eq('id', existingUser.tenantId)
      .maybeSingle();

    if (tenantError) {
      throw tenantError;
    }
    tenantRow = existingTenant || null;
  }

  if (!tenantRow) {
    const { data: tenantByEmail, error: tenantByEmailError } = await supabase
      .from('Tenant')
      .select('id,name,areaUnit')
      .eq('email', email)
      .maybeSingle();

    if (tenantByEmailError) {
      throw tenantByEmailError;
    }
    tenantRow = tenantByEmail || null;
  }

  if (!tenantRow) {
    const tenantName = preferredTenantName?.trim() || `Fazenda ${displayName}`;
    const { data: createdTenant, error: createTenantError } = await supabase
      .from('Tenant')
      .insert({
        name: tenantName,
        email
      })
      .select('id,name,areaUnit')
      .single();

    if (createTenantError || !createdTenant) {
      throw createTenantError || new Error('Erro ao criar tenant.');
    }

    tenantRow = createdTenant;
  }

  const { data: upsertedUser, error: upsertUserError } = await supabase
    .from('User')
    .upsert(
      {
        id: authUser.id,
        email,
        name: existingUser?.name || displayName,
        role: existingUser?.role || 'ADMIN',
        tenantId: tenantRow.id
      },
      { onConflict: 'id' }
    )
    .select('id,email,name,role,tenantId')
    .single();

  if (upsertUserError || !upsertedUser) {
    throw upsertUserError || new Error('Erro ao criar/atualizar perfil de usuario.');
  }

  return {
    user: {
      id: upsertedUser.id,
      email: upsertedUser.email,
      name: upsertedUser.name,
      role: upsertedUser.role
    },
    tenant: {
      id: tenantRow.id,
      name: tenantRow.name,
      areaUnit: tenantRow.areaUnit
    }
  };
};

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

          const profile = await ensureProfile(session.user);

          set({
            token: session.access_token,
            user: profile.user,
            tenant: profile.tenant,
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

        const profile = await ensureProfile(session.user);

        set({
          token: session.access_token,
          user: profile.user,
          tenant: profile.tenant,
          isAuthenticated: true
        });
      },

      register: async (data: RegisterData) => {
        const registerPayload = {
          email: normalizeEmail(data.email),
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

        const profile = await ensureProfile(
          { id: authUser.id, email: registerPayload.email, user_metadata: { name: registerPayload.name } },
          registerPayload.tenantName
        );

        set({
          token: accessToken,
          user: profile.user,
          tenant: profile.tenant,
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
