import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ friendsCount: 0, pendingRequestsCount: 0 });
  const [token, setToken] = useState(localStorage.getItem('affinity_token') || localStorage.getItem('nexus_token') || null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('affinity_token') || localStorage.getItem('nexus_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setStats(data.stats || { friendsCount: 0, pendingRequestsCount: 0 });
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('affinity_token', data.token);
    localStorage.setItem('nexus_token', data.token);
    setToken(data.token);
    setUser(data.user);
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    localStorage.setItem('affinity_token', data.token);
    localStorage.setItem('nexus_token', data.token);
    setToken(data.token);
    setUser(data.user);
    showToast(`Account created! Welcome, ${data.user.name}.`, 'success');
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('affinity_token');
    localStorage.removeItem('nexus_token');
    setToken(null);
    setUser(null);
    setStats({ friendsCount: 0, pendingRequestsCount: 0 });
    showToast('Logged out successfully.', 'info');
  };

  const updateProfile = async (formData) => {
    const res = await api.updateProfile(formData);
    setUser(res.user);
    showToast('Profile updated successfully!', 'success');
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        token,
        loading,
        toast,
        showToast,
        login,
        register,
        logout,
        refreshUser,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
