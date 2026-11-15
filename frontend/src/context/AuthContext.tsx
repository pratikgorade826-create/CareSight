import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ElderlyProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  elderlyProfile: ElderlyProfile | null;
  linkedElderly: { elderly_id: string; elderly_name: string; circle_name: string; relationship_label: string }[];
  activeElderlyId: string | null;
  setActiveElderlyId: (id: string) => void;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [elderlyProfile, setElderlyProfile] = useState<ElderlyProfile | null>(null);
  const [linkedElderly, setLinkedElderly] = useState<any[]>([]);
  const [activeElderlyId, setActiveElderlyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const data = await api.getMyProfile();
      if (data?.user) {
        setUser(data.user);
        setElderlyProfile(data.elderly_profile);
        setLinkedElderly(data.linked_elderly || []);
        if (data.user.role === 'elderly') {
          setActiveElderlyId(data.user.id);
        } else if (data.linked_elderly && data.linked_elderly.length > 0) {
          setActiveElderlyId(data.linked_elderly[0].elderly_id);
        }
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
      if (!localStorage.getItem('caresight_access_token')) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('caresight_access_token');
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    localStorage.setItem('caresight_access_token', res.access_token);
    localStorage.setItem('caresight_refresh_token', res.refresh_token);
    if (res.user) {
      setUser(res.user);
    }
    await refreshProfile();
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    localStorage.setItem('caresight_access_token', res.access_token);
    localStorage.setItem('caresight_refresh_token', res.refresh_token);
    if (res.user) {
      setUser(res.user);
    }
    await refreshProfile();
  };

  const logout = () => {
    localStorage.removeItem('caresight_access_token');
    localStorage.removeItem('caresight_refresh_token');
    setUser(null);
    setElderlyProfile(null);
    setLinkedElderly([]);
    setActiveElderlyId(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        elderlyProfile,
        linkedElderly,
        activeElderlyId,
        setActiveElderlyId,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
