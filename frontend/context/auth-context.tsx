'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { parseJwt } from '@/utils/jwt';

interface AuthUser {
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  loading: true,
  setAccessToken: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const pathname = usePathname();
  useEffect(() => {
    const initialize = async () => {
      if (pathname === '/sign-in') {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.post('/authentication/refresh-tokens', {}, { withCredentials: true });
        const token = res.data.accessToken;
        setAccessToken(token);

        const userData = parseJwt(token);
        setUser(userData);
        setLoading(false);
      } catch {
        setAccessToken(null);
        setUser(null);
        setLoading(false);
        router.replace('/sign-in');
      }
    };

    initialize();
  }, []);

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, setAccessToken, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
