'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import Loading from '@/app/loading';

interface AuthUser {
  email: string;
  name: string;
  role: string;
  permissions: string[];
  department: object;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  accessToken: string | null;
  loading: boolean;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {
  },
  accessToken: null,
  loading: true,
  setAccessToken: () => {
  },
  logout: () => {
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const PUBLIC_ROUTES = ['/sign-in', '/forgot-password'];

  useEffect(() => {
    const initialize = async () => {
      if (pathname === '/sign-in') {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.post('/authentication/refresh-tokens', {}, { withCredentials: true });
        const { user, accessToken } = res.data;
        setUser(user);
        setAccessToken(accessToken);
        setLoading(false);
      } catch {
        setAccessToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    // если мы не в процессе загрузки, и пользователь неавторизован — редирект
    if (!loading && !user && !isPublic) {
      router.replace('/sign-in');
    }
  }, [loading, user, pathname, router, PUBLIC_ROUTES]);

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    router.push('/sign-in');
  };
  if (loading || (!user && !PUBLIC_ROUTES.includes(pathname))) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, accessToken, loading, setAccessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
