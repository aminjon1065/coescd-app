'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangleIcon,
  ActivityIcon,
  UsersIcon,
  BuildingIcon,
  ListTodoIcon,
  ClipboardListIcon,
} from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
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

interface Disaster {
  id: number;
  title: string;
  severity: string;
  status: string;
  location: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
}

const severityColor: Record<string, string> = {
  low: 'bg-green-500/15 text-green-700 dark:text-green-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

const statusColor: Record<string, string> = {
  active: 'bg-red-500/15 text-red-700 dark:text-red-400',
  monitoring: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  resolved: 'bg-green-500/15 text-green-700 dark:text-green-400',
};

const TASK_COLORS = ['#3b82f6', '#f59e0b', '#22c55e'];

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      try {
        const [statsRes, disastersRes, tasksRes] = await Promise.all([
          api.get('/reports/stats'),
          api.get<ListResponse<Disaster> | Disaster[]>('/disasters'),
          api.get<ListResponse<Task> | Task[]>('/task'),
        ]);
        setStats(statsRes.data);
        setDisasters(extractListItems(disastersRes.data).slice(0, 5));
        setTasks(extractListItems(tasksRes.data));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const taskChartData = [
    { name: 'Новые', value: tasks.filter((t) => t.status === 'new').length },
    { name: 'В работе', value: tasks.filter((t) => t.status === 'in_progress').length },
    { name: 'Завершены', value: tasks.filter((t) => t.status === 'completed').length },
  ];

  const disasterChartData = [
    { name: 'Активные', count: stats?.activeDisasters ?? 0 },
    { name: 'Всего', count: stats?.totalDisasters ?? 0 },
  ];

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
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent>
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего ЧС</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDisasters ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Активных: {stats?.activeDisasters ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Активные инциденты</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeDisasters ?? 0}</div>
            <p className="text-xs text-muted-foreground">Требуют внимания</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Отделов: {stats?.totalDepartments ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Задачи</CardTitle>
            <ListTodoIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              В работе: {stats?.activeTasks ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Статистика ЧС</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={disasterChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Задачи по статусу</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {taskChartData.map((_, index) => (
                    <Cell key={index} fill={TASK_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Disasters & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Последние ЧС</CardTitle>
          </CardHeader>
          <CardContent>
            {disasters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет зарегистрированных ЧС</p>
            ) : (
              <div className="space-y-3">
                {disasters.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={severityColor[d.severity]} variant="outline">
                        {d.severity}
                      </Badge>
                      <Badge className={statusColor[d.status]} variant="outline">
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/tasks">
                <ClipboardListIcon className="mr-2 h-4 w-4" />
                Задачи
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/documentation">
                <BuildingIcon className="mr-2 h-4 w-4" />
                Документы
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/gis">
                <ActivityIcon className="mr-2 h-4 w-4" />
                Карта ЧС
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/analytic">
                <AlertTriangleIcon className="mr-2 h-4 w-4" />
                Аналитика
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
