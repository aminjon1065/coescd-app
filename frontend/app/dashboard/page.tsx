'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/axios';
import { Role } from '@/enums/RoleEnum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ActivityIcon,
  AlertTriangleIcon,
  Building2Icon,
  ClipboardListIcon,
  FileIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';

type DashboardScope = 'global' | 'department' | 'self';

interface DashboardResponse {
  generatedAt: string;
  scope: DashboardScope;
  actor: {
    userId: number;
    role: Role;
    departmentId: number | null;
    isAnalyst: boolean;
  };
  widgets: {
    tasks: {
      total: number;
      inProgress: number;
      new: number;
      completed: number;
      assignedToMe: number;
      createdByMe: number;
    };
    edm: {
      documentsTotal: number;
      documentsInRoute: number;
      documentsDraft: number;
      documentsArchived: number;
      myUnreadAlerts: number;
      myApprovals: number;
      overdueStages: number;
    };
    admin?: {
      totalUsers: number;
      activeUsers: number;
      totalDepartments: number;
      activeFiles: number;
      routeActiveTotal: number;
    };
    department?: {
      departmentUsers: number;
      departmentFiles: number;
    };
    analytics?: {
      totalDisasters: number;
      activeDisasters: number;
      criticalDisasters: number;
      monitoringDisasters: number;
    };
  };
}

export default function DashboardPage() {
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

  const headerTitle = useMemo(() => {
    const role = dashboard?.actor.role ?? user?.role;
    if (role === Role.Admin) {
      return 'Админовский дашборд';
    }
    if (role === Role.Manager) {
      return 'Дашборд руководителя отдела';
    }
    return dashboard?.actor.isAnalyst ? 'Дашборд аналитика' : 'Рабочий дашборд сотрудника';
  }, [dashboard?.actor.isAnalyst, dashboard?.actor.role, user?.role]);

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

  if (error || !dashboard) {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Мои задачи</CardTitle>
            <ClipboardListIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.widgets.tasks.assignedToMe}</div>
            <p className="text-xs text-muted-foreground">
              В работе: {dashboard.widgets.tasks.inProgress}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Документы в маршруте</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.widgets.edm.documentsInRoute}</div>
            <p className="text-xs text-muted-foreground">
              Черновики: {dashboard.widgets.edm.documentsDraft}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Мои согласования</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.widgets.edm.myApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Непрочитанные алерты: {dashboard.widgets.edm.myUnreadAlerts}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Просрочки</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.widgets.edm.overdueStages}</div>
            <p className="text-xs text-muted-foreground">Этапы с превышенным сроком</p>
          </CardContent>
        </Card>
      </div>

      {dashboard.widgets.department ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Сотрудники департамента</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.department.departmentUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Файлы департамента</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.department.departmentFiles}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {dashboard.widgets.admin ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Пользователи</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.admin.totalUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Активные пользователи</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.admin.activeUsers}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Департаменты</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.admin.totalDepartments}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Активные файлы</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.admin.activeFiles}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Активные маршруты</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.admin.routeActiveTotal}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {dashboard.widgets.analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ЧС всего</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.analytics.totalDisasters}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ЧС активные</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.analytics.activeDisasters}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Критические ЧС</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.analytics.criticalDisasters}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Мониторинг</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {dashboard.widgets.analytics.monitoringDisasters}
            </CardContent>
          </Card>
        </div>
      ) : null}

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

          {dashboard.actor.role === Role.Manager || dashboard.actor.role === Role.Admin ? (
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

          {dashboard.actor.role === Role.Admin ? (
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/access">
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                Доступы и роли
              </Link>
            </Button>
          ) : null}

          {dashboard.actor.role === Role.Admin ? (
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
