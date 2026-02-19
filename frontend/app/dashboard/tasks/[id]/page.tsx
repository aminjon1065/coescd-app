'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftIcon } from 'lucide-react';
import api from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { ITask, TaskStatus } from '@/interfaces/ITask';
import { format } from 'date-fns';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';

const statusLabel: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
};

const statusBadgeClass: Record<TaskStatus, string> = {
  new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  completed: 'bg-green-500/15 text-green-700 dark:text-green-400',
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  new: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

const nextStatusLabel: Record<TaskStatus, string> = {
  new: 'Взять в работу',
  in_progress: 'Завершить',
  completed: '',
};

export default function TaskDetailPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.tasks.detail"
      deniedDescription="Карточка задачи доступна пользователям с правом чтения задач."
    >
      <TaskDetailContent />
    </ProtectedRouteGate>
  );
}

function TaskDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [task, setTask] = useState<ITask | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    api
      .get(`/task/${id}`)
      .then((res) => setTask(res.data))
      .catch((err) => console.error('Failed to load task', err))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  const handleStatusChange = async () => {
    if (!task || !nextStatus[task.status]) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/task/${task.id}`, {
        status: nextStatus[task.status],
      });
      setTask(res.data);
    } catch (err) {
      console.error('Failed to update task', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Задача не найдена</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/tasks')}>
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Назад к задачам
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{task.title}</CardTitle>
          <Badge className={statusBadgeClass[task.status]} variant="outline">
            {statusLabel[task.status]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Описание</h3>
            <p className="text-sm whitespace-pre-wrap">{task.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Создатель</h3>
              <p className="text-sm">{task.creator?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{task.creator?.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Исполнитель</h3>
              <p className="text-sm">{task.receiver?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{task.receiver?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Создана</h3>
              <p className="text-sm">
                {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Обновлена</h3>
              <p className="text-sm">
                {format(new Date(task.updatedAt), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          </div>

          {nextStatus[task.status] && (
            <Button
              onClick={handleStatusChange}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Обновление...' : nextStatusLabel[task.status]}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
