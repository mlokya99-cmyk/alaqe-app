import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  switchDemoUser: (userId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('alaqe_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        // Automatically login as first demo user (Alisher) if first visit
        try {
          const res = await api.auth.quickLogin(1);
          setToken(res.token);
          setUser(res.user);
          localStorage.setItem('alaqe_token', res.token);
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await api.users.getMe();
        setUser(res.user);
      } catch (err) {
        console.error('Failed to load current user, clearing session:', err);
        localStorage.removeItem('alaqe_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('alaqe_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('alaqe_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const switchDemoUser = async (userId: number) => {
    setIsLoading(true);
    try {
      const res = await api.auth.quickLogin(userId);
      login(res.token, res.user);
    } catch (err) {
      console.error('Switch user failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
