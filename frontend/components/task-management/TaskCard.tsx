'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Calendar, Paperclip, MessageSquare } from 'lucide-react';
import type { ITmTask, TmTaskPriority } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const PRIORITY_COLORS: Record<TmTaskPriority, string> = {
  low:      'bg-slate-100 text-slate-700 border-slate-200',
  medium:   'bg-blue-100 text-blue-700 border-blue-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const PRIORITY_DOT: Record<TmTaskPriority, string> = {
  low:      'bg-slate-400',
  medium:   'bg-blue-500',
  high:     'bg-orange-500',
  critical: 'bg-red-500',
};

interface TaskCardProps {
  task: ITmTask;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: dndDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueAt &&
    new Date(task.dueAt) < new Date() &&
    !['completed', 'closed'].includes(task.status);

  const checklistTotal = task.checklistItems?.length ?? 0;
  const checklistDone = task.checklistItems?.filter((i) => i.isCompleted).length ?? 0;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const assigneeName = task.assigneeUser?.name ?? task.assigneeDepartment?.name ?? null;
  const assigneeInitial = assigneeName?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group bg-white rounded-lg border border-slate-200 shadow-sm p-3 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md',
        (isDragging || dndDragging) && 'opacity-50 shadow-xl ring-2 ring-blue-500',
        task.slaBreached && 'border-red-300 bg-red-50/30',
      )}
    >
      {/* Top row: priority dot + task number + SLA badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />
          <span className="text-xs text-slate-400 font-mono">{task.taskNumber}</span>
        </div>
        <div className="flex items-center gap-1">
          {task.slaBreached && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>SLA Breached</TooltipContent>
            </Tooltip>
          )}
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <Link
        href={`/dashboard/task-management/${task.id}`}
        className="block text-sm font-medium text-slate-800 hover:text-blue-600 line-clamp-2 mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Checklist progress */}
      {checklistTotal > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Checklist</span>
            <span>{checklistDone}/{checklistTotal}</span>
          </div>
          <Progress value={checklistPct} className="h-1.5" />
        </div>
      )}

      {/* Footer: due date + assignee + type badge */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {task.dueAt && (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <Calendar className={cn('w-3 h-3', isOverdue && 'text-red-500')} />
                <span className={cn(isOverdue && 'text-red-500 font-medium')}>
                  {new Date(task.dueAt).toLocaleDateString()}
                </span>
              </TooltipTrigger>
              <TooltipContent>Due date</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.linkedDocumentId && (
            <Tooltip>
              <TooltipTrigger>
                <Paperclip className="w-3 h-3 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>Linked to document #{task.linkedDocumentId}</TooltipContent>
            </Tooltip>
          )}
          {assigneeName && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                    {assigneeInitial}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{assigneeName}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
