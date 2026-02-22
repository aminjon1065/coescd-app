'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import axios, { setAccessToken as setAxiosAccessToken } from '@/lib/axios';
import Loading from '@/app/loading';
import { Role } from '@/enums/RoleEnum';
import { IDepartment } from '@/interfaces/IDepartment';
import { getRoleDashboardPath } from '@/features/authz/roles';
import { Permission } from '@/lib/permissions';

interface AuthUser {
  id?: number;
  email: string;
  name: string;
  role: Role;
  permissions: string[];
  department?: IDepartment | null;
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
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await axios.post('/authentication/refresh-tokens', {}, { withCredentials: true });
        const { user, accessToken } = res.data;
        setUser(user);
        setAccessToken(accessToken);
        setAxiosAccessToken(accessToken);
        if (isPublicRoute) {
          router.replace(getRoleDashboardPath(user.role));
        }
        setLoading(false);
      } catch {
        setAccessToken(null);
        setUser(null);
        setAxiosAccessToken(null);
        setLoading(false);
      }
    };

    initialize();
  }, [isPublicRoute, router]);

  useEffect(() => {
    setAxiosAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    // если мы не в процессе загрузки, и пользователь неавторизован — редирект
    if (!loading && !user && !isPublicRoute) {
      router.replace('/sign-in');
    }
  }, [isPublicRoute, loading, router, user]);

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    setAxiosAccessToken(null);
    axios.post('/authentication/logout').catch(() => {});
    router.push('/sign-in');
  };
  if (loading || (!user && !isPublicRoute)) {
    return <Loading />;
  }
  console.log(user?.permissions);
  console.log(Permission.USERS_READ)
  return (
    <AuthContext.Provider value={{ user, setUser, accessToken, loading, setAccessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
