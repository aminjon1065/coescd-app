'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/axios';
import axios from 'axios';
import { IDisaster, DisasterSeverity, DisasterStatus } from '@/interfaces/IDisaster';
import { ITask } from '@/interfaces/ITask';
import { IDepartment } from '@/interfaces/IDepartment';
import { AlertTriangleIcon, ActivityIcon, UsersIcon, SearchIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { extractListItems, ListResponse } from '@/lib/list-response';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

interface Stats {
  totalDisasters: number;
  activeDisasters: number;
  totalUsers: number;
  totalDepartments: number;
  totalTasks: number;
  activeTasks: number;
}

interface EdmDashboardSummary {
  asOf: string;
  period: {
    fromDate: string;
    toDate: string;
  };
  kpis: {
    totalRoutes: number;
    finishedRoutes: number;
    completionRate: number;
    onTimeRate: number;
    avgRouteHours: number;
    totalOverdue: number;
    totalActiveStages: number;
    overdueLoadRate: number;
  };
  charts: {
    slaByDepartment: Array<{
      departmentId: number;
      total: number;
      finished: number;
      onTime: number;
      late: number;
      avgHours: number;
    }>;
    overdueByDepartment: Array<{
      departmentId: number;
      total: number;
    }>;
    workloadByDepartment: Array<{
      departmentId: number;
      activeStages: number;
      overdueStages: number;
      documentsInRoute: number;
    }>;
    managerLoad: Array<{
      userId: number;
      name: string;
      departmentId: number | null;
      assignedStages: number;
      overdueAssignedStages: number;
      ownedDocumentsInRoute: number;
    }>;
  };
}

const severityLabel: Record<DisasterSeverity, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
};

const statusLabel: Record<DisasterStatus, string> = {
  active: 'Активная',
  monitoring: 'Мониторинг',
  resolved: 'Устранена',
};

const severityBadgeClass: Record<DisasterSeverity, string> = {
  low: 'bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

const taskStatusLabel: Record<ITask['status'], string> = {
  new: 'Новые',
  in_progress: 'В работе',
  completed: 'Завершены',
};

const taskStatusColors = ['#3b82f6', '#f59e0b', '#22c55e'];

export default function AnalyticPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.analytics"
      deniedDescription="Раздел аналитики доступен пользователям с правами аналитики/отчетов."
    >
      <AnalyticContent />
    </ProtectedRouteGate>
  );
}

function AnalyticContent() {
  const { accessToken } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [disasters, setDisasters] = useState<IDisaster[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<DisasterSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DisasterStatus | 'all'>('all');
  const [edmSummary, setEdmSummary] = useState<EdmDashboardSummary | null>(null);
  const [edmLoading, setEdmLoading] = useState(false);
  const [edmError, setEdmError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        const [statsRes, disastersRes, tasksRes] = await Promise.all([
          api.get('/reports/stats'),
          api.get<ListResponse<IDisaster> | IDisaster[]>('/disasters'),
          api.get<ListResponse<ITask> | ITask[]>('/task'),
        ]);
        setStats(statsRes.data);
        setDisasters(extractListItems(disastersRes.data));
        setTasks(extractListItems(tasksRes.data));
      } catch (error) {
        console.error('Failed to load analytics data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const loadDepartments = async () => {
      try {
        const response = await api.get<IDepartment[]>('/department');
        setDepartments(response.data);
      } catch (error) {
        console.error('Failed to load departments for analytics labels', error);
      }
    };

    loadDepartments();
  }, [accessToken]);

  const departmentNameById = useMemo(
    () =>
      new Map<number, string>(
        departments.map((department) => [department.id, department.name]),
      ),
    [departments],
  );

  useEffect(() => {
    if (!accessToken) return;

    const loadEdmDashboard = async () => {
      setEdmLoading(true);
      setEdmError(null);
      try {
        const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
        const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();
        const response = await api.get<EdmDashboardSummary>('/edm/reports/dashboard', {
          params: {
            fromDate: fromIso,
            toDate: toIso,
            topManagers: 10,
          },
        });
        setEdmSummary(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setEdmSummary(null);
          setEdmError('У вашей роли нет доступа к отчетам СЭД.');
          return;
        }
        setEdmError('Не удалось загрузить отчетность СЭД.');
      } finally {
        setEdmLoading(false);
      }
    };

    loadEdmDashboard();
  }, [accessToken, fromDate, toDate]);

  const downloadEdmReport = async (
    reportType: 'sla' | 'overdue' | 'workload',
    format: 'csv' | 'xlsx',
  ) => {
    try {
      const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();
      const endpoint =
        format === 'csv'
          ? `/edm/reports/${reportType}/export`
          : `/edm/reports/${reportType}/export/xlsx`;
      const response = await api.get(endpoint, {
        params: { fromDate: fromIso, toDate: toIso },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edm-${reportType}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download EDM report', error);
      setEdmError('Не удалось выгрузить отчет. Проверьте доступ и повторите.');
    }
  };

  const filteredDisasters = useMemo(
    () =>
      disasters.filter((d) => {
        const matchesSearch =
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.location.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
        const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
        return matchesSearch && matchesSeverity && matchesStatus;
      }),
    [disasters, search, severityFilter, statusFilter],
  );

  const severityChartData = useMemo(
    () => [
      { name: 'Низкая', value: disasters.filter((d) => d.severity === 'low').length, color: '#22c55e' },
      { name: 'Средняя', value: disasters.filter((d) => d.severity === 'medium').length, color: '#eab308' },
      { name: 'Высокая', value: disasters.filter((d) => d.severity === 'high').length, color: '#f97316' },
      { name: 'Критическая', value: disasters.filter((d) => d.severity === 'critical').length, color: '#ef4444' },
    ],
    [disasters],
  );

  const taskChartData = useMemo(
    () => [
      { name: taskStatusLabel.new, value: tasks.filter((t) => t.status === 'new').length },
      { name: taskStatusLabel.in_progress, value: tasks.filter((t) => t.status === 'in_progress').length },
      { name: taskStatusLabel.completed, value: tasks.filter((t) => t.status === 'completed').length },
    ],
    [tasks],
  );

  const criticalCount = useMemo(
    () => disasters.filter((d) => d.severity === 'critical').length,
    [disasters],
  );

  const affectedPeopleTotal = useMemo(
    () => disasters.reduce((sum, d) => sum + (d.affectedPeople || 0), 0),
    [disasters],
  );

  const edmSlaByDepartmentChart = useMemo(
    () =>
      (edmSummary?.charts.slaByDepartment ?? []).map((row) => ({
        name: departmentNameById.get(row.departmentId) ?? `Деп. ${row.departmentId}`,
        completionRate: row.total > 0 ? Number(((row.finished / row.total) * 100).toFixed(2)) : 0,
        onTimeRate: row.finished > 0 ? Number(((row.onTime / row.finished) * 100).toFixed(2)) : 0,
      })),
    [departmentNameById, edmSummary],
  );

  const edmWorkloadByDepartmentChart = useMemo(
    () =>
      (edmSummary?.charts.workloadByDepartment ?? []).map((row) => ({
        name: departmentNameById.get(row.departmentId) ?? `Деп. ${row.departmentId}`,
        activeStages: row.activeStages,
        overdueStages: row.overdueStages,
      })),
    [departmentNameById, edmSummary],
  );

  const edmManagerLoadChart = useMemo(
    () =>
      (edmSummary?.charts.managerLoad ?? []).map((row) => ({
        name: row.name,
        assignedStages: row.assignedStages,
        overdueAssignedStages: row.overdueAssignedStages,
      })),
    [edmSummary],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего ЧС</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalDisasters ?? disasters.length}</p>
            <p className="text-xs text-muted-foreground">Активных: {stats?.activeDisasters ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Критичные</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Требуют немедленного реагирования</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Пострадавшие</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{affectedPeopleTotal}</p>
            <p className="text-xs text-muted-foreground">Суммарно по всем инцидентам</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Задачи реагирования</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalTasks ?? tasks.length}</p>
            <p className="text-xs text-muted-foreground">В работе: {stats?.activeTasks ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры инцидентов</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              value={search}
              placeholder="Поиск по названию или локации"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={severityFilter}
            onValueChange={(value: DisasterSeverity | 'all') => setSeverityFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уровни</SelectItem>
              <SelectItem value="low">Низкая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="high">Высокая</SelectItem>
              <SelectItem value="critical">Критическая</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value: DisasterStatus | 'all') => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активная</SelectItem>
              <SelectItem value="monitoring">Мониторинг</SelectItem>
              <SelectItem value="resolved">Устранена</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Распределение ЧС по критичности</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={severityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {severityChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Задачи по статусу</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {taskChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={taskStatusColors[index % taskStatusColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Отчетность СЭД</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button
              variant="outline"
              onClick={() => downloadEdmReport('sla', 'csv')}
              disabled={edmLoading}
            >
              SLA CSV
            </Button>
            <Button onClick={() => downloadEdmReport('sla', 'xlsx')} disabled={edmLoading}>
              SLA XLSX
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => downloadEdmReport('overdue', 'csv')}
              disabled={edmLoading}
            >
              Просрочки CSV
            </Button>
            <Button onClick={() => downloadEdmReport('overdue', 'xlsx')} disabled={edmLoading}>
              Просрочки XLSX
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadEdmReport('workload', 'csv')}
              disabled={edmLoading}
            >
              Нагрузка CSV
            </Button>
            <Button onClick={() => downloadEdmReport('workload', 'xlsx')} disabled={edmLoading}>
              Нагрузка XLSX
            </Button>
          </div>

          {edmLoading && <p className="text-sm text-muted-foreground">Загрузка отчётности СЭД...</p>}
          {edmError && <p className="text-sm text-red-600">{edmError}</p>}

          {edmSummary && (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Маршруты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{edmSummary.kpis.totalRoutes}</p>
                    <p className="text-xs text-muted-foreground">
                      Завершено: {edmSummary.kpis.finishedRoutes}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">SLA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{edmSummary.kpis.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">
                      On-time: {edmSummary.kpis.onTimeRate}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Просрочки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{edmSummary.kpis.totalOverdue}</p>
                    <p className="text-xs text-muted-foreground">
                      Load overdue: {edmSummary.kpis.overdueLoadRate}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Среднее время</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{edmSummary.kpis.avgRouteHours} ч</p>
                    <p className="text-xs text-muted-foreground">
                      Активные этапы: {edmSummary.kpis.totalActiveStages}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>SLA по департаментам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={edmSlaByDepartmentChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="completionRate" name="Completion %" fill="#0ea5e9" />
                        <Bar dataKey="onTimeRate" name="On-time %" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Нагрузка по департаментам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={edmWorkloadByDepartmentChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="activeStages" name="Активные этапы" fill="#3b82f6" />
                        <Bar dataKey="overdueStages" name="Просроченные этапы" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Топ менеджеров по нагрузке</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={edmManagerLoadChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="assignedStages" name="Назначенные этапы" fill="#6366f1" />
                      <Bar
                        dataKey="overdueAssignedStages"
                        name="Просроченные назначенные"
                        fill="#f97316"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Инциденты ({filteredDisasters.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredDisasters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Инциденты не найдены</p>
          ) : (
            filteredDisasters.slice(0, 10).map((disaster) => (
              <div key={disaster.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{disaster.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={severityBadgeClass[disaster.severity]}>
                      {severityLabel[disaster.severity]}
                    </Badge>
                    <Badge variant="outline">{statusLabel[disaster.status]}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{disaster.location}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
