'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  PlusIcon,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/context/auth-context';
import { ITask, TaskStatus } from '@/interfaces/ITask';
import { CreateTaskDialog } from './components/create-task-dialog';
import { ProtectedRouteGate } from '@/features/authz/ProtectedRouteGate';
import { useTasksQuery } from '@/hooks/queries/useTasks';
import { queryKeys } from '@/lib/query-keys';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  new: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

const NEXT_STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Взять в работу',
  in_progress: 'Завершить',
  completed: '',
};

// ── Group config ──────────────────────────────────────────────────────────────

interface TaskGroup {
  key: TaskStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyText: string;
}

const GROUPS: TaskGroup[] = [
  {
    key: 'in_progress',
    label: 'В работе',
    icon: Loader2,
    emptyText: 'Нет задач в работе',
  },
  {
    key: 'new',
    label: 'Новые',
    icon: Sparkles,
    emptyText: 'Нет новых задач',
  },
  {
    key: 'completed',
    label: 'Завершены',
    icon: CheckCircle2,
    emptyText: 'Нет завершённых задач',
  },
];

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusAdvance,
  advancingId,
}: {
  task: ITask;
  onStatusAdvance: (id: number, next: TaskStatus) => void;
  advancingId: number | null;
}) {
  const next = NEXT_STATUS[task.status];
  const isAdvancing = advancingId === task.id;

  return (
    <div className="group flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/40 transition-colors">
      {/* Link area */}
      <Link
        href={`/dashboard/tasks/${task.id}`}
        className="flex flex-1 min-w-0 items-start gap-3"
      >
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-medium text-sm leading-tight truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground pt-0.5">
            <span>От: {task.creator?.name ?? '—'}</span>
            <span>Кому: {task.receiver?.name ?? '—'}</span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {format(new Date(task.createdAt), 'dd.MM.yyyy')}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </Link>

      {/* Status badge + action button */}
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={task.status} />
        {next && (
          <Button
            size="sm"
            variant={task.status === 'new' ? 'outline' : 'default'}
            className={cn(
              'h-7 text-xs',
              task.status === 'in_progress' && 'bg-green-600 hover:bg-green-700 text-white',
            )}
            disabled={isAdvancing}
            onClick={(e) => {
              e.preventDefault();
              onStatusAdvance(task.id, next);
            }}
          >
            {isAdvancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              NEXT_STATUS_LABEL[task.status]
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

function TaskGroupSection({
  group,
  tasks,
  onStatusAdvance,
  advancingId,
}: {
  group: TaskGroup;
  tasks: ITask[];
  onStatusAdvance: (id: number, next: TaskStatus) => void;
  advancingId: number | null;
}) {
  const Icon = group.icon;

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4',
            group.key === 'in_progress' && 'animate-spin text-blue-500',
            group.key === 'new' && 'text-amber-500',
            group.key === 'completed' && 'text-green-500',
          )}
        />
        <h3 className="text-sm font-semibold">{group.label}</h3>
        <span className="text-xs text-muted-foreground">
          ({tasks.length})
        </span>
      </div>

      {/* Rows */}
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
          {group.emptyText}
        </p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusAdvance={onStatusAdvance}
              advancingId={advancingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.key} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  return (
    <ProtectedRouteGate
      policyKey="dashboard.tasks"
      deniedDescription="Раздел задач доступен пользователям с правом чтения задач."
    >
      <TasksContent />
    </ProtectedRouteGate>
  );
}

function TasksContent() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const { data: tasks = [], isLoading, isError, refetch } = useTasksQuery(!!accessToken);

  const handleStatusAdvance = async (taskId: number, next: TaskStatus) => {
    setAdvancingId(taskId);
    try {
      await api.patch(`/task/${taskId}`, { status: next });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    } catch {
      // silent — user can retry via detail page
    } finally {
      setAdvancingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Задачи</CardTitle>
        </CardHeader>
        <CardContent>
          <TasksSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">Не удалось загрузить задачи.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = GROUPS.map((g) => ({
    group: g,
    tasks: tasks.filter((t: ITask) => t.status === g.key),
  }));

  const totalActive = tasks.filter((t: ITask) => t.status !== 'completed').length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Задачи</CardTitle>
            {totalActive > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalActive} активных
              </p>
            )}
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Создать задачу
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {grouped.map(({ group, tasks: groupTasks }) => (
            <TaskGroupSection
              key={group.key}
              group={group}
              tasks={groupTasks}
              onStatusAdvance={handleStatusAdvance}
              advancingId={advancingId}
            />
          ))}
        </CardContent>
      </Card>

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
        }}
      />
    </>
  );
}
