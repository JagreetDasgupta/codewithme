import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
axios.defaults.baseURL = API_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (import.meta.env.VITE_TEST_AUTH === '1') {
        if (!token) {
          const mockToken = 'test-token';
          localStorage.setItem('token', mockToken);
          setToken(mockToken);
          setUser({ id: 'test-user', email: 'test@example.com', name: 'Test User', role: 'tester' });
          axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        }
        setLoading(false);
        return;
      }
      if (token) {
        try {
          const decoded: any = jwt_decode(token);
          // Allow 5 minutes of clock skew
          if (decoded.exp * 1000 < Date.now() - 300000) {
            console.warn('Token expired (with skew check)', { exp: decoded.exp, now: Date.now() });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          } else {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
              const res = await axios.get('/api/v1/auth/me');
              const me = res?.data?.data?.user ?? res?.data?.user ?? null;
              setUser(me);
              if (me) localStorage.setItem('user', JSON.stringify(me));
            } catch (error: any) {
              console.warn('Failed to fetch user profile:', error?.message);
              // Fallback to local storage if API fails (e.g. network error)
              // Only clear auth if explicitly unauthorized
              if (error?.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
              } else {
                const raw = localStorage.getItem('user');
                if (raw) {
                  try {
                    const restored = JSON.parse(raw);
                    setUser(restored);
                  } catch {
                    // Only clear if JSON is corrupt
                    console.error('Cached user data corrupt');
                    setUser(null);
                  }
                } else {
                  // No cached user, cannot verify auth
                  setUser(null);
                }
              }
            }
          }
        } catch (error) {
          console.error('Auth initialization error (token verify failed):', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post('/api/v1/auth/login', { email, password });
      const accessToken = res?.data?.token ?? res?.data?.access_token;
      const userData = res?.data?.data?.user ?? res?.data?.user;
      if (!accessToken || !userData) {
        throw new Error(res?.data?.message || 'Invalid login response');
      }
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Incorrect email or password';
      console.error('Login error:', error);
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await axios.post('/api/v1/auth/register', { name, email, password });
      await login(email, password);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to register';
      console.error('Registration error:', error);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
