'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskFilters } from '@/components/task-management/TaskFilters';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import { useTaskFiltersStore } from '@/lib/stores/task-filters-store';
import type { ITmTask, TmTaskPriority } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';
import {
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  differenceInDays,
  parseISO,
  max as dateMax,
  min as dateMin,
  isBefore,
  isAfter,
} from 'date-fns';

const PRIORITY_BAR_COLORS: Record<TmTaskPriority, string> = {
  low:      'bg-slate-400',
  medium:   'bg-blue-500',
  high:     'bg-orange-500',
  critical: 'bg-red-600',
};

const ROW_H = 36; // px per task row
const HEADER_H = 56; // px for date header
const LEFT_W = 220; // px for task name column
const DAY_W = 28; // px per day cell

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function TimelinePage() {
  const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()));

  const { q, status, priority, isOverdue, isSlaBreached, departmentId, assigneeUserId } =
    useTaskFiltersStore();

  const { data, isLoading } = useQuery({
    queryKey: ['tm-tasks-timeline', { q, status, priority, isOverdue, isSlaBreached, departmentId, assigneeUserId }],
    queryFn: () =>
      taskManagementApi.getTasks({
        page: 1,
        limit: 200,
        q: q || undefined,
        status: status.length ? status : undefined,
        priority: priority.length ? priority : undefined,
        isOverdue: isOverdue || undefined,
        isSlaBreached: isSlaBreached || undefined,
        departmentId: departmentId ?? undefined,
        assigneeUserId: assigneeUserId ?? undefined,
      }),
  });

  const tasks: ITmTask[] = useMemo(
    () =>
      (data?.items ?? []).filter(
        (t) => t.createdAt || t.dueAt,
      ),
    [data],
  );

  // View range: 6 weeks starting from viewStart
  const viewEnd = addDays(viewStart, 41); // 6 weeks
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const totalW = days.length * DAY_W;

  const prevMonth = () => setViewStart(subMonths(viewStart, 1));
  const nextMonth = () => setViewStart(addMonths(viewStart, 1));
  const today = () => setViewStart(startOfMonth(new Date()));

  // Group days into weeks for the header
  const weeks = useMemo(() => {
    const result: { label: string; start: Date; days: Date[] }[] = [];
    let cur: Date[] = [];
    days.forEach((d, i) => {
      cur.push(d);
      if (cur.length === 7 || i === days.length - 1) {
        result.push({
          label: format(cur[0], 'MMM d'),
          start: cur[0],
          days: cur,
        });
        cur = [];
      }
    });
    return result;
  }, [days]);

  // Pre-compute weekend indices once per view range change
  const weekendIndices = useMemo(
    () => days.reduce<number[]>((acc, d, i) => (isWeekend(d) ? [...acc, i] : acc), []),
    [days],
  );

  // Pre-compute the today line position once per view range change
  const todayLineLeft = useMemo(() => {
    const idx = differenceInDays(new Date(), viewStart);
    return idx >= 0 && idx < days.length ? idx * DAY_W + DAY_W / 2 : null;
  }, [viewStart, days.length]);

  // Pre-compute bar positions for all tasks at once
  const barStyles = useMemo(() => {
    const result = new Map<string, { left: number; width: number } | null>();
    for (const task of tasks) {
      const start = parseISO(task.createdAt);
      const end = task.dueAt ? parseISO(task.dueAt) : addDays(start, 1);
      const clampedStart = dateMax([start, viewStart]);
      const clampedEnd = dateMin([end, viewEnd]);
      if (isAfter(clampedStart, clampedEnd)) {
        result.set(task.id, null);
        continue;
      }
      const left = differenceInDays(clampedStart, viewStart) * DAY_W;
      const width = Math.max(DAY_W, (differenceInDays(clampedEnd, clampedStart) + 1) * DAY_W);
      result.set(task.id, { left, width });
    }
    return result;
  }, [tasks, viewStart, viewEnd]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-semibold text-slate-800">Timeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today} className="text-xs px-3">
            Today
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[100px] text-center">
            {format(viewStart, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <TaskFilters />

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          No tasks with dates found.
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
          <div style={{ minWidth: LEFT_W + totalW + 'px' }}>
            {/* Date header */}
            <div
              className="flex sticky top-0 z-10 bg-white border-b border-slate-200"
              style={{ height: HEADER_H + 'px' }}
            >
              {/* Left panel header */}
              <div
                className="flex-shrink-0 border-r border-slate-200 flex items-end px-3 pb-2"
                style={{ width: LEFT_W + 'px' }}
              >
                <span className="text-xs font-medium text-slate-500">Task</span>
              </div>

              {/* Day cells */}
              <div className="flex flex-col flex-1">
                {/* Week labels */}
                <div className="flex border-b border-slate-100">
                  {weeks.map((w) => (
                    <div
                      key={w.label}
                      style={{ width: w.days.length * DAY_W + 'px' }}
                      className="text-[10px] text-slate-400 px-1 py-1 border-r border-slate-100 text-center"
                    >
                      {w.label}
                    </div>
                  ))}
                </div>
                {/* Day labels */}
                <div className="flex">
                  {days.map((d) => (
                    <div
                      key={d.toISOString()}
                      style={{ width: DAY_W + 'px' }}
                      className={cn(
                        'text-[10px] text-center py-1 border-r border-slate-100 flex-shrink-0',
                        isToday(d) && 'bg-blue-50 text-blue-600 font-semibold',
                        isWeekend(d) && !isToday(d) && 'text-slate-300',
                        !isToday(d) && !isWeekend(d) && 'text-slate-500',
                      )}
                    >
                      {format(d, 'd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task rows */}
            {tasks.map((task) => {
              const barStyle = barStyles.get(task.id);
              return (
                <div
                  key={task.id}
                  className="flex hover:bg-slate-50/60 border-b border-slate-100 group"
                  style={{ height: ROW_H + 'px' }}
                >
                  {/* Task name */}
                  <div
                    className="flex-shrink-0 border-r border-slate-200 flex items-center gap-2 px-3 overflow-hidden"
                    style={{ width: LEFT_W + 'px' }}
                  >
                    <Link
                      href={`/dashboard/task-management/${task.id}`}
                      className="text-xs text-slate-700 hover:text-blue-600 truncate flex-1"
                    >
                      {task.title}
                    </Link>
                    {task.slaBreached && (
                      <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative flex items-center">
                    {/* Weekend shading */}
                    {weekendIndices.map((i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 bg-slate-50"
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    ))}

                    {/* Today line */}
                    {todayLineLeft !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-blue-400 z-10"
                        style={{ left: todayLineLeft }}
                      />
                    )}

                    {/* Task bar */}
                    {barStyle && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/dashboard/task-management/${task.id}`}>
                            <div
                              className={cn(
                                'absolute h-5 rounded cursor-pointer opacity-90 hover:opacity-100 transition-opacity flex items-center px-1.5 overflow-hidden',
                                PRIORITY_BAR_COLORS[task.priority],
                              )}
                              style={{
                                left: barStyle.left + 2,
                                width: Math.max(barStyle.width - 4, 4),
                              }}
                            >
                              <span className="text-[10px] text-white font-medium truncate">
                                {barStyle.width > 60 ? task.title : task.taskNumber}
                              </span>
                            </div>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-slate-400">
                            {task.dueAt
                              ? `Due: ${format(parseISO(task.dueAt), 'dd MMM yyyy')}`
                              : 'No due date'}
                          </p>
                          <p className="text-slate-400 capitalize">
                            {task.priority} · {task.status.replace('_', ' ')}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="font-medium">Priority:</span>
        {(['low', 'medium', 'high', 'critical'] as TmTaskPriority[]).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-sm', PRIORITY_BAR_COLORS[p])} />
            <span className="capitalize">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
