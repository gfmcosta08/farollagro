import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuthStore } from '../utils/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: any;
  tenant: any;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user, tenant, initialize, login, register, logout } = useAuthStore();

  useEffect(() => {
    initialize().catch(() => undefined);
  }, [initialize]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, tenant, initialize, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
