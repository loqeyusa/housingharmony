import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient, clearUserCache, forceRefreshAllData } from '@/lib/queryClient';

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
        const previousUserId = localStorage.getItem('currentUserId');
        
        console.log('Login: Previous user ID:', previousUserId);
        console.log('Login: New user ID:', userData.user.id);
        
        // Clear all cached data before setting new user
        queryClient.clear();
        queryClient.getMutationCache().clear();
        queryClient.getQueryCache().clear();
        
        // If different user, ensure complete cache isolation
        if (previousUserId && previousUserId !== userData.user.id.toString()) {
          console.log('Different user detected, clearing all caches');
          // Force cache recreation for complete isolation
          queryClient.invalidateQueries();
          queryClient.resetQueries();
        }
        
        setUser(userData.user);
        localStorage.setItem('authUser', JSON.stringify(userData.user));
        localStorage.setItem('currentUserId', userData.user.id.toString());
        
        // Force refresh all data after successful login
        setTimeout(() => {
          forceRefreshAllData();
        }, 100);
        
        console.log('Login complete for user:', userData.user.username, 'Company ID:', userData.user.companyId);
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
      localStorage.removeItem('currentUserId');
      // Clear all cached data when logging out
      queryClient.clear();
      queryClient.getMutationCache().clear();
      queryClient.getQueryCache().clear();
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
          const previousUserId = localStorage.getItem('currentUserId');
          
          // If different user, clear cache completely
          if (previousUserId && previousUserId !== userData.id.toString()) {
            queryClient.clear();
            queryClient.getMutationCache().clear();
            queryClient.getQueryCache().clear();
          }
          
          setUser(userData);
          localStorage.setItem('authUser', JSON.stringify(userData));
          localStorage.setItem('currentUserId', userData.id.toString());
        } else {
          // Clear any stale localStorage data and cache
          localStorage.removeItem('authUser');
          localStorage.removeItem('currentUserId');
          setUser(null);
          queryClient.clear();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('authUser');
        localStorage.removeItem('currentUserId');
        setUser(null);
        queryClient.clear();
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