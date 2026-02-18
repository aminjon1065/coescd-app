'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { IDisaster, DisasterSeverity, DisasterStatus } from '@/interfaces/IDisaster';
import { ITask } from '@/interfaces/ITask';
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

interface Stats {
  totalDisasters: number;
  activeDisasters: number;
  totalUsers: number;
  totalDepartments: number;
  totalTasks: number;
  activeTasks: number;
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
  const { accessToken } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [disasters, setDisasters] = useState<IDisaster[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<DisasterSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DisasterStatus | 'all'>('all');

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
