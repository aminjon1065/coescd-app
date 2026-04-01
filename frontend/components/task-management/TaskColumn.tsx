'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ITmTaskBoardColumn, ITmTask } from '@/interfaces/ITaskManagement';

interface TaskColumnProps {
  column: ITmTaskBoardColumn;
  tasks: ITmTask[];
  isOver?: boolean;
}

function TaskColumnInner({ column, tasks, isOver }: TaskColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  const wipExceeded = column.wipLimit !== null && tasks.length > column.wipLimit;

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-lg mb-2"
        style={{ borderBottom: `3px solid ${column.color}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-sm font-semibold text-slate-700">{column.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn('text-xs', wipExceeded && 'bg-red-100 text-red-700')}
          >
            {tasks.length}
            {column.wipLimit !== null && `/${column.wipLimit}`}
          </Badge>
        </div>
      </div>

      {/* WIP warning */}
      {wipExceeded && (
        <div className="mx-1 mb-2 px-2 py-1 rounded text-xs bg-red-50 text-red-600 border border-red-200">
          WIP limit exceeded ({tasks.length}/{column.wipLimit})
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] space-y-2 p-1 rounded-lg transition-colors',
          isOver && 'bg-blue-50 ring-2 ring-blue-200',
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized column — only re-renders when the column definition, its task list,
 * or the isOver flag actually changes (shallow comparison on tasks array identity).
 */
export const TaskColumn = memo(TaskColumnInner, (prev, next) => {
  return (
    prev.column === next.column &&
    prev.tasks === next.tasks &&
    prev.isOver === next.isOver
  );
});
