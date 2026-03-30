'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
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
import {
  AlertTriangleIcon,
  ActivityIcon,
  UsersIcon,
  SearchIcon,
  BrainCircuitIcon,
  X,
} from 'lucide-react';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { extractListItems, ListResponse } from '@/lib/list-response';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { analyticsApi, PredictionResult } from '@/lib/api/analytics';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  totalDisasters: number;
  activeDisasters: number;
  totalUsers: number;
  totalDepartments: number;
  totalTasks: number;
  activeTasks: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface TaskByDeptRow {
  departmentId: number;
  name: string;
  total: number;
  new: number;
  inProgress: number;
  completed: number;
}

interface EdmDashboardSummary {
  asOf: string;
  period: { fromDate: string; toDate: string };
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
    overdueByDepartment: Array<{ departmentId: number; total: number }>;
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

// ── Constants ──────────────────────────────────────────────────────────────────

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

const severityChartColors: Record<DisasterSeverity, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const TYPE_PALETTE = [
  '#6366f1', '#f59e0b', '#ec4899', '#14b8a6',
  '#8b5cf6', '#84cc16', '#f43f5e', '#0ea5e9',
];

// ── Page entry ─────────────────────────────────────────────────────────────────

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

// ── Main content ───────────────────────────────────────────────────────────────

function AnalyticContent() {
  const { accessToken } = useAuth();

  // ── Core data ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [disasters, setDisasters] = useState<IDisaster[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<DisasterSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DisasterStatus | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState('');

  // ── Drill-down ─────────────────────────────────────────────────────────────
  const [drillDownSeverity, setDrillDownSeverity] = useState<DisasterSeverity | null>(null);
  const [drillDownType, setDrillDownType] = useState<string | null>(null);

  // ── Trend chart ────────────────────────────────────────────────────────────
  const [incidentsTrend, setIncidentsTrend] = useState<TrendPoint[]>([]);
  const [trendFrom, setTrendFrom] = useState<string>(
    () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [trendTo, setTrendTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // ── Tasks by department ────────────────────────────────────────────────────
  const [tasksByDept, setTasksByDept] = useState<TaskByDeptRow[]>([]);

  // ── EDM section ────────────────────────────────────────────────────────────
  const [edmSummary, setEdmSummary] = useState<EdmDashboardSummary | null>(null);
  const [edmLoading, setEdmLoading] = useState(false);
  const [edmError, setEdmError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>(
    () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // ── Fetch: core ────────────────────────────────────────────────────────────
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

  // ── Fetch: departments ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    api
      .get<IDepartment[]>('/department')
      .then((r) => setDepartments(r.data))
      .catch(console.error);
  }, [accessToken]);

  // ── Fetch: incidents trend ─────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    api
      .get<TrendPoint[]>('/reports/incidents-trend', {
        params: {
          fromDate: trendFrom + 'T00:00:00.000Z',
          toDate: trendTo + 'T23:59:59.999Z',
        },
      })
      .then((r) => setIncidentsTrend(r.data))
      .catch(console.error);
  }, [accessToken, trendFrom, trendTo]);

  // ── Fetch: tasks by department ─────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    api
      .get<TaskByDeptRow[]>('/reports/tasks-by-department')
      .then((r) => setTasksByDept(r.data))
      .catch(console.error);
  }, [accessToken]);

  // ── Fetch: EDM dashboard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    const loadEdmDashboard = async () => {
      setEdmLoading(true);
      setEdmError(null);
      try {
        const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
        const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();
        const response = await api.get<EdmDashboardSummary>('/edm/reports/dashboard', {
          params: { fromDate: fromIso, toDate: toIso, topManagers: 10 },
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

  // ── Computed ───────────────────────────────────────────────────────────────
  const departmentNameById = useMemo(
    () => new Map<number, string>(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  const filteredDisasters = useMemo(
    () =>
      disasters.filter((d) => {
        const matchesSearch =
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.location.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
        const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
        const matchesDept = !deptFilter || String(d.department?.id) === deptFilter;
        return matchesSearch && matchesSeverity && matchesStatus && matchesDept;
      }),
    [disasters, search, severityFilter, statusFilter, deptFilter],
  );

  // Drill-down filtered list — applies on top of filteredDisasters
  const drillDownList = useMemo(
    () =>
      filteredDisasters.filter((d) => {
        if (drillDownSeverity && d.severity !== drillDownSeverity) return false;
        if (drillDownType && (d.type?.name ?? 'Без типа') !== drillDownType) return false;
        return true;
      }),
    [filteredDisasters, drillDownSeverity, drillDownType],
  );

  const activeList = drillDownSeverity || drillDownType ? drillDownList : filteredDisasters;

  const severityChartData = useMemo(
    () =>
      (['low', 'medium', 'high', 'critical'] as DisasterSeverity[]).map((s) => ({
        name: severityLabel[s],
        value: disasters.filter((d) => d.severity === s).length,
        color: severityChartColors[s],
        severity: s,
      })),
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

  const typeChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of disasters) {
      const key = d.type?.name ?? 'Без типа';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [disasters]);

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
        completionRate:
          row.total > 0 ? Number(((row.finished / row.total) * 100).toFixed(2)) : 0,
        onTimeRate:
          row.finished > 0 ? Number(((row.onTime / row.finished) * 100).toFixed(2)) : 0,
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearDrillDown = () => {
    setDrillDownSeverity(null);
    setDrillDownType(null);
  };

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

  // ── Loading skeleton ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── KPI Cards ── */}
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

      {/* ── Filters ── */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры инцидентов</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
            onValueChange={(v) => setSeverityFilter(v as DisasterSeverity | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Серьёзность" />
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
            onValueChange={(v) => setStatusFilter(v as DisasterStatus | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активная</SelectItem>
              <SelectItem value="monitoring">Мониторинг</SelectItem>
              <SelectItem value="resolved">Устранена</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={deptFilter}
            onValueChange={(v) => setDeptFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Подразделение" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все подразделения</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Severity bar + Task status pie ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Распределение ЧС по критичности</CardTitle>
            <p className="text-xs text-muted-foreground">Нажмите на столбец для детализации</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(entry) => {
                    const s = (entry as unknown as { severity: DisasterSeverity }).severity;
                    setDrillDownType(null);
                    setDrillDownSeverity((prev) => (prev === s ? null : s));
                  }}
                >
                  {severityChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={
                        drillDownSeverity && drillDownSeverity !== entry.severity ? 0.35 : 1
                      }
                    />
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
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {taskChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={taskStatusColors[index % taskStatusColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Incidents over time (line chart) ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Динамика инцидентов</CardTitle>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={trendFrom}
                className="h-8 text-xs w-36"
                onChange={(e) => setTrendFrom(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={trendTo}
                className="h-8 text-xs w-36"
                onChange={(e) => setTrendTo(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {incidentsTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Нет данных за выбранный период
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={incidentsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Инциденты"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Incident types pie + Tasks by department bar ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>По типам ЧС</CardTitle>
            <p className="text-xs text-muted-foreground">Нажмите на сегмент для детализации</p>
          </CardHeader>
          <CardContent>
            {typeChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    cursor="pointer"
                    onClick={(entry) => {
                      setDrillDownSeverity(null);
                      setDrillDownType((prev) =>
                        prev === entry.name ? null : (entry.name as string),
                      );
                    }}
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={TYPE_PALETTE[index % TYPE_PALETTE.length]}
                        opacity={
                          drillDownType && drillDownType !== entry.name ? 0.35 : 1
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Задачи по подразделениям</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksByDept.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tasksByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" name="Новые" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="inProgress" name="В работе" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="completed" name="Завершены" fill="#22c55e" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── EDM Reporting section ── */}
      <Card>
        <CardHeader>
          <CardTitle>Отчетность СЭД</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button variant="outline" onClick={() => downloadEdmReport('sla', 'csv')} disabled={edmLoading}>
              SLA CSV
            </Button>
            <Button onClick={() => downloadEdmReport('sla', 'xlsx')} disabled={edmLoading}>
              SLA XLSX
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={() => downloadEdmReport('overdue', 'csv')} disabled={edmLoading}>
              Просрочки CSV
            </Button>
            <Button onClick={() => downloadEdmReport('overdue', 'xlsx')} disabled={edmLoading}>
              Просрочки XLSX
            </Button>
            <Button variant="outline" onClick={() => downloadEdmReport('workload', 'csv')} disabled={edmLoading}>
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

      {/* ── Incident list with drill-down ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Инциденты ({activeList.length})</CardTitle>
            {(drillDownSeverity || drillDownType) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Детализация:{' '}
                  {drillDownSeverity && (
                    <StatusBadge status={drillDownSeverity} label={severityLabel[drillDownSeverity]} />
                  )}
                  {drillDownType && (
                    <StatusBadge status="draft" label={drillDownType} className="ml-1" />
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={clearDrillDown}
                >
                  <X className="h-3 w-3 mr-1" />
                  Сбросить
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Инциденты не найдены</p>
          ) : (
            activeList.slice(0, 15).map((disaster) => (
              <div key={disaster.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{disaster.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={disaster.severity} label={severityLabel[disaster.severity]} />
                    <StatusBadge status={disaster.status} label={statusLabel[disaster.status]} />
                    {disaster.type && (
                      <StatusBadge status="draft" label={disaster.type.name} />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{disaster.location}</p>
                {disaster.affectedPeople > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Пострадавших: {disaster.affectedPeople}
                  </p>
                )}
              </div>
            ))
          )}
          {activeList.length > 15 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              Показано 15 из {activeList.length}. Уточните фильтры для сужения выборки.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Prediction block ── */}
      <PredictionSection departments={departments} />
    </div>
  );
}

// ── Prediction Section ──────────────────────────────────────────────────────

function PredictionSection({ departments }: { departments: IDepartment[] }) {
  const [fromDate, setFromDate] = useState<string>(
    () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [deptId, setDeptId] = useState('');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.predict({
        fromDate,
        toDate,
        horizonMonths,
        ...(deptId ? { departmentId: Number(deptId) } : {}),
      });
      setResult(data);
    } catch {
      setError('Не удалось выполнить прогноз. Проверьте параметры и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    const hist = result.historical.map((p) => ({
      month: p.month,
      historical: p.count,
      predicted: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
    }));
    const fore = result.forecast.map((p) => ({
      month: p.month,
      historical: undefined as number | undefined,
      predicted: Math.max(0, Math.round(p.predicted * 10) / 10),
      lower: Math.max(0, Math.round(p.lower * 10) / 10),
      upper: Math.max(0, Math.round(p.upper * 10) / 10),
    }));
    return [...hist, ...fore];
  }, [result]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <BrainCircuitIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Прогнозирование частоты ЧС</CardTitle>
          <Badge variant="secondary" className="text-xs ml-auto">Линейная регрессия</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Исторический период от</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Исторический период до</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Горизонт прогноза (месяцев)</p>
            <Select
              value={String(horizonMonths)}
              onValueChange={(v) => setHorizonMonths(Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 3, 6, 12, 18, 24].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} мес.</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Подразделение</p>
            <Select value={deptId} onValueChange={(v) => setDeptId(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все подразделения</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Вычисление...' : 'Построить прогноз'}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {result && (
          <>
            {/* Model stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
                <p className="text-xs text-muted-foreground">R² модели</p>
                <p className="text-xl font-bold">
                  {(result.model.r2 * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
                <p className="text-xs text-muted-foreground">RMSE</p>
                <p className="text-xl font-bold">{result.model.rmse.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
                <p className="text-xs text-muted-foreground">Тренд (наклон)</p>
                <p className="text-xl font-bold">
                  {result.model.slope >= 0 ? '+' : ''}
                  {result.model.slope.toFixed(2)}/мес
                </p>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      historical: 'История',
                      predicted: 'Прогноз',
                      lower: 'Нижняя граница (95%)',
                      upper: 'Верхняя граница (95%)',
                    };
                    return [value ?? '—', labels[name] ?? name];
                  }}
                />
                <Legend
                  formatter={(value) =>
                    ({ historical: 'История', predicted: 'Прогноз', lower: 'ДИ нижн.', upper: 'ДИ верхн.' })[value] ?? value
                  }
                />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  stroke="#d1d5db"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  stroke="#d1d5db"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center">
              Прогноз построен: {new Date(result.meta.generatedAt).toLocaleString('ru-RU')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
