import { createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from '../utils/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  tenant: any;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, tenant, login, register, logout } = useAuthStore();

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, tenant, login, register, logout }}>
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
