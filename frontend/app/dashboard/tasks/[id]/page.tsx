'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RotateCcw,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import api from '@/lib/axios';
import { ITask, TaskStatus } from '@/interfaces/ITask';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  new: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

// ── Meta field (matches EDM detail style) ─────────────────────────────────────

function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <div className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

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
  const queryClient = useQueryClient();

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery<ITask>({
    queryKey: queryKeys.tasks.detail(String(id)),
    queryFn: async () => {
      const res = await api.get<ITask>(`/task/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const advanceMutation = useMutation({
    mutationFn: (next: TaskStatus) =>
      api.patch<ITask>(`/task/${id}`, { status: next }),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.tasks.detail(String(id)), res.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    },
  });

  if (isLoading) return <DetailSkeleton />;

  if (isError || !task) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <p className="text-sm text-red-600 dark:text-red-400">
            {isError ? 'Ошибка загрузки задачи.' : 'Задача не найдена.'}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </CardContent>
      </Card>
    );
  }

  const next = NEXT_STATUS[task.status];
  const isAdvancing = advanceMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground"
        onClick={() => router.push('/dashboard/tasks')}
      >
        <ArrowLeft className="h-4 w-4" />
        Задачи
      </Button>

      {/* Main card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
            </div>
            <StatusBadge status={task.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Metadata grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetaField
              icon={User}
              label="Создатель"
              value={
                <div>
                  <p className="font-medium">{task.creator?.name ?? '—'}</p>
                  {task.creator?.email && (
                    <p className="text-xs text-muted-foreground">{task.creator.email}</p>
                  )}
                </div>
              }
            />
            <MetaField
              icon={User}
              label="Исполнитель"
              value={
                <div>
                  <p className="font-medium">{task.receiver?.name ?? '—'}</p>
                  {task.receiver?.email && (
                    <p className="text-xs text-muted-foreground">{task.receiver.email}</p>
                  )}
                </div>
              }
            />
            <MetaField
              icon={Calendar}
              label="Создана"
              value={format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}
            />
            <MetaField
              icon={CalendarClock}
              label="Обновлена"
              value={format(new Date(task.updatedAt), 'dd.MM.yyyy HH:mm')}
            />
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Описание
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{task.description}</p>
            </div>
          )}

          {/* Status advance action */}
          {next && (
            <div className="border-t pt-4">
              <Button
                onClick={() => advanceMutation.mutate(next)}
                disabled={isAdvancing}
                className={cn(
                  'gap-2',
                  next === 'completed' && 'bg-green-600 hover:bg-green-700 text-white',
                )}
              >
                {isAdvancing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : next === 'in_progress' ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isAdvancing
                  ? 'Обновление...'
                  : next === 'in_progress'
                    ? 'Взять в работу'
                    : 'Завершить задачу'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
