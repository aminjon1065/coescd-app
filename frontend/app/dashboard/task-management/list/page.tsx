'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { TaskFilters } from '@/components/task-management/TaskFilters';
import { TaskCreateForm } from '@/components/task-management/TaskCreateForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, List, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import { useTaskFiltersStore } from '@/lib/stores/task-filters-store';
import type { ITmTask, TmTaskStatus, TmTaskPriority } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<TmTaskStatus, string> = {
  draft:       'bg-slate-100 text-slate-600',
  created:     'bg-slate-100 text-slate-700',
  assigned:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  in_review:   'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  closed:      'bg-slate-200 text-slate-500',
  blocked:     'bg-red-100 text-red-700',
  rejected:    'bg-rose-100 text-rose-700',
  reopened:    'bg-orange-100 text-orange-700',
};

const PRIORITY_COLORS: Record<TmTaskPriority, string> = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_TRANSITIONS: Record<TmTaskStatus, TmTaskStatus[]> = {
  draft:       ['created'],
  created:     ['assigned'],
  assigned:    ['in_progress', 'blocked', 'rejected'],
  in_progress: ['in_review', 'blocked'],
  in_review:   ['completed', 'rejected', 'in_progress'],
  completed:   ['closed', 'reopened'],
  closed:      ['reopened'],
  blocked:     ['assigned'],
  rejected:    ['assigned', 'closed'],
  reopened:    ['assigned'],
};

export default function TaskListPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { q, status, priority, isOverdue, isSlaBreached, departmentId, assigneeUserId } =
    useTaskFiltersStore();

  const { data, isLoading } = useQuery({
    queryKey: ['tm-tasks', { page, q, status, priority, isOverdue, isSlaBreached, departmentId, assigneeUserId }],
    queryFn: () =>
      taskManagementApi.getTasks({
        page,
        limit,
        q: q || undefined,
        status: status.length ? status : undefined,
        priority: priority.length ? priority : undefined,
        isOverdue: isOverdue || undefined,
        isSlaBreached: isSlaBreached || undefined,
        departmentId: departmentId ?? undefined,
        assigneeUserId: assigneeUserId ?? undefined,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: TmTaskStatus }) =>
      taskManagementApi.changeStatus(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
    },
  });

  const tasks: ITmTask[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ru-RU') : '—';

  const isOverdueTask = (t: ITmTask) =>
    t.dueAt && new Date(t.dueAt) < new Date() && !['completed', 'closed'].includes(t.status);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
          {total > 0 && (
            <Badge variant="secondary" className="ml-1">
              {total}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters />

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-32">Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Priority</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-36">Assignee</TableHead>
              <TableHead className="w-28">Department</TableHead>
              <TableHead className="w-28">Due Date</TableHead>
              <TableHead className="w-12">SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                  No tasks found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={cn('group hover:bg-slate-50', isOverdueTask(task) && 'bg-red-50/30')}
                >
                  {/* Task number */}
                  <TableCell className="font-mono text-xs text-slate-500">
                    {task.taskNumber}
                  </TableCell>

                  {/* Title */}
                  <TableCell>
                    <Link
                      href={`/dashboard/task-management/${task.id}`}
                      className="font-medium text-slate-800 hover:text-blue-600 line-clamp-1 text-sm"
                    >
                      {task.title}
                    </Link>
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {task.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-100 text-slate-500 rounded px-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('text-xs capitalize', PRIORITY_COLORS[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>

                  {/* Status — inline change */}
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({ id: task.id, newStatus: v as TmTaskStatus })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs border-0 p-0 shadow-none focus:ring-0">
                        <SelectValue>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', STATUS_COLORS[task.status])}
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_TRANSITIONS[task.status]?.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Assignee */}
                  <TableCell>
                    {task.assigneeUser ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                            {task.assigneeUser.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-700 truncate max-w-[80px]">
                          {task.assigneeUser.name}
                        </span>
                      </div>
                    ) : task.assigneeDepartment ? (
                      <span className="text-xs text-slate-500 italic">
                        {task.assigneeDepartment.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>

                  {/* Department */}
                  <TableCell>
                    <span className="text-xs text-slate-500 truncate max-w-[80px] block">
                      {task.department?.name ?? '—'}
                    </span>
                  </TableCell>

                  {/* Due date */}
                  <TableCell>
                    <span
                      className={cn(
                        'text-xs',
                        isOverdueTask(task) ? 'text-red-600 font-medium' : 'text-slate-500',
                      )}
                    >
                      {formatDate(task.dueAt)}
                    </span>
                  </TableCell>

                  {/* SLA indicator */}
                  <TableCell>
                    {task.slaBreached && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent>SLA Breached</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} tasks
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <TaskCreateForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['tm-tasks'] })}
      />
    </div>
  );
}
