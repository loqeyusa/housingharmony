import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface User {
  id: number;
  companyId?: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isEnabled: boolean;
  isSuperAdmin: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await response.json();

      if (userData.user) {
        setUser(userData.user);
        localStorage.setItem('authUser', JSON.stringify(userData.user));
        // Clear all cached data to ensure fresh data for new user
        queryClient.clear();
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Try to parse error message from server response
      if (error instanceof Error && error.message.includes('401:')) {
        throw new Error('Invalid username or password');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await apiRequest('POST', '/api/auth/logout', { userId: user.id });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authUser');
      // Clear all cached data when logging out
      queryClient.clear();
    }
  };

  // Check for existing session on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('authUser', JSON.stringify(userData));
        } else {
          // Clear any stale localStorage data and cache
          localStorage.removeItem('authUser');
          setUser(null);
          queryClient.clear();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('authUser');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}