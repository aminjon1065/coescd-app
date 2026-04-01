'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List, Calendar, Search, X, BarChart2 } from 'lucide-react';
import { useTaskFiltersStore, type TaskViewMode } from '@/lib/stores/task-filters-store';
import type { TmTaskStatus, TmTaskPriority } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: TmTaskStatus; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'rejected', label: 'Rejected' },
];

const PRIORITY_OPTIONS: { value: TmTaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const VIEW_MODES: { mode: TaskViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'board', icon: LayoutGrid, label: 'Board' },
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'timeline', icon: Calendar, label: 'Timeline' },
];

export function TaskFilters() {
  const {
    viewMode, setViewMode,
    q, setFilter,
    status, priority,
    isOverdue, isSlaBreached,
    resetFilters,
  } = useTaskFiltersStore();

  const activeFilterCount = status.length + priority.length +
    (isOverdue ? 1 : 0) + (isSlaBreached ? 1 : 0);

  const toggleStatus = (s: TmTaskStatus) => {
    setFilter('status', status.includes(s) ? status.filter((x) => x !== s) : [...status, s]);
  };

  const togglePriority = (p: TmTaskPriority) => {
    setFilter('priority', priority.includes(p) ? priority.filter((x) => x !== p) : [...priority, p]);
  };

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Top row: search + view toggle + reset */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 text-sm"
            placeholder="Search tasks..."
            value={q}
            onChange={(e) => setFilter('q', e.target.value)}
          />
          {q && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setFilter('q', '')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              title={label}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                viewMode === mode
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Clear filters
            <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
          </Button>
        )}
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status filters */}
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleStatus(opt.value)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              status.includes(opt.value)
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            )}
          >
            {opt.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200" />

        {/* Priority filters */}
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => togglePriority(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              priority.includes(opt.value)
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', opt.color)} />
            {opt.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200" />

        {/* Special filters */}
        <button
          onClick={() => setFilter('isOverdue', !isOverdue)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            isOverdue
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-red-300',
          )}
        >
          Overdue
        </button>

        <button
          onClick={() => setFilter('isSlaBreached', !isSlaBreached)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            isSlaBreached
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300',
          )}
        >
          SLA Breached
        </button>
      </div>
    </div>
  );
}
