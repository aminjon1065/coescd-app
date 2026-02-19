'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ActivityIcon,
  AlertTriangleIcon,
  Building2Icon,
  ClipboardListIcon,
  FileIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { can } from '@/features/authz/can';
import { ROLE_DASHBOARD_PATH } from '@/features/authz/roles';
import { DashboardRenderer } from '@/features/dashboard/DashboardRenderer';
import { DashboardResponse } from '@/features/dashboard/types';
import api from '@/lib/axios';

interface RoleDashboardPageProps {
  forcedRole?: Role;
}

export function RoleDashboardPage({ forcedRole }: RoleDashboardPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<DashboardResponse>('/reports/my-dashboard');
        setDashboard(response.data);
      } catch (err) {
        console.error('Failed to load role dashboard', err);
        setError('Не удалось загрузить дашборд. Проверьте доступ и повторите.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, [accessToken]);

  useEffect(() => {
    if (!forcedRole || !user || loading) {
      return;
    }

    if (user.role !== forcedRole) {
      router.replace(ROLE_DASHBOARD_PATH[user.role]);
    }
  }, [forcedRole, loading, router, user]);

  useEffect(() => {
    if (forcedRole || !user || loading || pathname !== '/dashboard') {
      return;
    }

    router.replace(ROLE_DASHBOARD_PATH[user.role]);
  }, [forcedRole, loading, pathname, router, user]);

  const role = useMemo<Role | null>(() => {
    if (forcedRole) {
      return forcedRole;
    }
    return dashboard?.actor.role ?? user?.role ?? null;
  }, [dashboard?.actor.role, forcedRole, user?.role]);

  const headerTitle = useMemo(() => {
    if (role === Role.Admin) {
      return 'Админовский дашборд';
    }
    if (role === Role.Manager) {
      return 'Дашборд руководителя отдела';
    }
    return dashboard?.actor.isAnalyst ? 'Дашборд аналитика' : 'Рабочий дашборд сотрудника';
  }, [dashboard?.actor.isAnalyst, role]);

  const scopeLabel = useMemo(() => {
    if (!dashboard) {
      return '';
    }
    if (dashboard.scope === 'global') {
      return 'Глобальный контур';
    }
    if (dashboard.scope === 'department') {
      return 'Контур департамента';
    }
    return 'Личный контур';
  }, [dashboard]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard || !role || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Дашборд</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error ?? 'Данные недоступны'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>{headerTitle}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{scopeLabel}</Badge>
            {dashboard.actor.isAnalyst ? <Badge variant="outline">Analyst</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Обновлено: {new Date(dashboard.generatedAt).toLocaleString()}
        </CardContent>
      </Card>

      <DashboardRenderer dashboard={dashboard} role={role} permissions={user.permissions ?? []} />

      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/dashboard/documentation">
              <FileIcon className="mr-2 h-4 w-4" />
              СЭД документы
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/dashboard/tasks">
              <ClipboardListIcon className="mr-2 h-4 w-4" />
              Задачи
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/dashboard/files">
              <Building2Icon className="mr-2 h-4 w-4" />
              Файлы
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/dashboard/analytic">
              <ActivityIcon className="mr-2 h-4 w-4" />
              Аналитика
            </Link>
          </Button>

          {can(user, { roles: [Role.Manager, Role.Admin] }) ? (
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/users">
                <UsersIcon className="mr-2 h-4 w-4" />
                Работники
              </Link>
            </Button>
          ) : null}

          {dashboard.actor.isAnalyst ? (
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/gis">
                <AlertTriangleIcon className="mr-2 h-4 w-4" />
                Карта ЧС
              </Link>
            </Button>
          ) : null}

          {can(user, { roles: [Role.Admin] }) ? (
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/access">
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                Доступы и роли
              </Link>
            </Button>
          ) : null}

          {can(user, { roles: [Role.Admin] }) ? (
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/audit-logs">
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                Audit Logs
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
