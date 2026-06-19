import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api, setAccessToken, setSessionExpiredHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const applyAuth = useCallback((userData, token) => {
    setUser(userData);
    setAccessToken(token);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
  }, []);

  // Try silent login via refresh cookie on first mount
  useEffect(() => {
    setSessionExpiredHandler(clearAuth);
    (async () => {
      try {
        const { data } = await axios.post('/api/auth/refresh', null, { withCredentials: true });
        applyAuth(data.data.user, data.data.accessToken);
      } catch {
        /* not logged in */
      } finally {
        setBooting(false);
      }
    })();
  }, [applyAuth, clearAuth]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    applyAuth(data.data.user, data.data.accessToken);
    return data.data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    applyAuth(data.data.user, data.data.accessToken);
    return data.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
    }
  };

  const refreshMe = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data.user);
    return data.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, refreshMe, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
