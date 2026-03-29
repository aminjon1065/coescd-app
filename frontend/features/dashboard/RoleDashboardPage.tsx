'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { Role } from '@/enums/RoleEnum';
import { ROLE_DASHBOARD_PATH } from '@/features/authz/roles';
import { DashboardRenderer } from '@/features/dashboard/DashboardRenderer';
import { DashboardResponse } from '@/features/dashboard/types';
import api from '@/lib/axios';
import { quickActionsByRole } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';

interface RoleDashboardPageProps {
  forcedRole?: Role;
}

// ── Alert banner ─────────────────────────────────────────────────────────────

interface AlertItem {
  key: string;
  message: string;
  href: string;
  severity: 'danger' | 'warning';
}

function buildAlerts(dashboard: DashboardResponse): AlertItem[] {
  const alerts: AlertItem[] = [];
  const { edm, tasks } = dashboard.widgets;

  if (edm.overdueStages > 0) {
    alerts.push({
      key: 'overdue',
      message: `${edm.overdueStages} просроченных этапов в маршрутах`,
      href: '/dashboard/documentation',
      severity: 'danger',
    });
  }
  if (edm.myApprovals > 0) {
    alerts.push({
      key: 'approvals',
      message: `${edm.myApprovals} документов ожидают вашего согласования`,
      href: '/dashboard/documentation/approvals',
      severity: 'warning',
    });
  }
  if (edm.myUnreadAlerts > 0) {
    alerts.push({
      key: 'unread-alerts',
      message: `${edm.myUnreadAlerts} непрочитанных системных уведомлений по СЭД`,
      href: '/dashboard/documentation/approvals',
      severity: 'warning',
    });
  }
  if (tasks.assignedToMe > 0 && tasks.inProgress === 0) {
    alerts.push({
      key: 'tasks-idle',
      message: `${tasks.assignedToMe} задач назначено, ни одна не в работе`,
      href: '/dashboard/tasks',
      severity: 'warning',
    });
  }
  return alerts;
}

function ActionBanner({ alerts }: { alerts: AlertItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.key));

  if (!visible.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((alert) => (
        <div
          key={alert.key}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
            alert.severity === 'danger'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{alert.message}</span>
          <Link
            href={alert.href}
            className="flex items-center gap-1 font-medium hover:underline"
          >
            Перейти <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(alert.key))}
            aria-label="Закрыть"
            className="ml-1 rounded p-0.5 opacity-60 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoleDashboardPage({ forcedRole }: RoleDashboardPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<DashboardResponse>('/reports/my-dashboard');
        setDashboard(response.data);
      } catch {
        setError('Не удалось загрузить дашборд. Проверьте доступ и повторите.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, [accessToken]);

  useEffect(() => {
    if (!forcedRole || !user || loading) return;
    if (user.role !== forcedRole) {
      router.replace(ROLE_DASHBOARD_PATH[user.role] ?? '/dashboard');
    }
  }, [forcedRole, loading, router, user]);

  useEffect(() => {
    if (forcedRole || !user || loading || pathname !== '/dashboard') return;
    router.replace(ROLE_DASHBOARD_PATH[user.role] ?? '/dashboard');
  }, [forcedRole, loading, pathname, router, user]);

  const role = useMemo<Role | null>(() => {
    if (forcedRole) return forcedRole;
    return dashboard?.actor.role ?? user?.role ?? null;
  }, [dashboard?.actor.role, forcedRole, user?.role]);

  const alerts = useMemo(() => (dashboard ? buildAlerts(dashboard) : []), [dashboard]);

  if (loading) return <DashboardSkeleton />;

  if (error || !dashboard || !role || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Дашборд</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? 'Данные недоступны'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quickActions = quickActionsByRole[role] ?? [];

  return (
    <div className="space-y-6">
      {/* ── Alert banners ────────────────────────────────────────────── */}
      <ActionBanner alerts={alerts} />

      {/* ── KPI cards ────────────────────────────────────────────────── */}
      <DashboardRenderer dashboard={dashboard} role={role} permissions={user.permissions ?? []} />

      {/* ── Quick actions ────────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Быстрый переход</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => {
                if (action.analystOnly && !dashboard.actor.isAnalyst) return null;

                const Icon = action.icon;
                const btn = (
                  <Button
                    key={action.key}
                    asChild
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Link href={action.href}>
                      <Icon className="mr-2 h-4 w-4 shrink-0" />
                      {action.label}
                    </Link>
                  </Button>
                );

                if (!action.anyPermissions?.length) return btn;

                return (
                  <Protected key={action.key} anyPermissions={action.anyPermissions}>
                    {btn}
                  </Protected>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Footer meta ──────────────────────────────────────────────── */}
      <p className="text-right text-xs text-muted-foreground">
        Обновлено: {new Date(dashboard.generatedAt).toLocaleString('ru-RU')}
      </p>
    </div>
  );
}
