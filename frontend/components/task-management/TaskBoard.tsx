'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { useTaskBoardStore } from '@/lib/stores/task-board-store';
import { taskManagementApi } from '@/lib/api/task-management';
import type { ITmTask } from '@/interfaces/ITaskManagement';
import { Loader2 } from 'lucide-react';

interface TaskBoardProps {
  boardId: string;
}

// Stable empty array to avoid creating a new reference on every render
const EMPTY_TASKS: ITmTask[] = [];

export function TaskBoard({ boardId }: TaskBoardProps) {
  const queryClient = useQueryClient();
  const { columns, tasksByColumn, setBoard, moveTask, draggingTaskId, setDragging } =
    useTaskBoardStore();
  const [activeTask, setActiveTask] = useState<ITmTask | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Stable per-column task arrays — only changes reference when the column's tasks change
  const stableTasksByColumn = useMemo(() => tasksByColumn, [tasksByColumn]);

  const { isLoading } = useQuery({
    queryKey: ['tm-board', boardId],
    queryFn: () => taskManagementApi.getBoard(boardId),
    onSuccess: (data) => setBoard(data, data.tasksByColumn),
  } as any);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, orderIndex }: { taskId: string; columnId: string; orderIndex: number }) =>
      taskManagementApi.moveToColumn(taskId, columnId, orderIndex),
    onError: () => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['tm-board', boardId] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const findColumn = useCallback(
    (taskId: string): string | null => {
      for (const [colId, tasks] of Object.entries(tasksByColumn)) {
        if (tasks.some((t) => t.id === taskId)) return colId;
      }
      return null;
    },
    [tasksByColumn],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setDragging(id);
    const task = Object.values(tasksByColumn).flat().find((t) => t.id === id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragging(null);
    setActiveTask(null);
    setOverId(null);

    if (!over) return;

    const taskId = String(active.id);
    const fromColId = findColumn(taskId);
    if (!fromColId) return;

    // Over a column directly or over another task (use its column)
    const toColId = columns.some((c) => c.id === String(over.id))
      ? String(over.id)
      : findColumn(String(over.id)) ?? fromColId;

    const toTasks = tasksByColumn[toColId] ?? [];
    const newIndex = toTasks.findIndex((t) => t.id === String(over.id));
    const orderIndex = newIndex === -1 ? toTasks.length : newIndex;

    // Optimistic update
    moveTask(taskId, fromColId, toColId, orderIndex);

    // Server sync
    moveMutation.mutate({ taskId, columnId: toColId, orderIndex });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {columns.map((col) => (
          <TaskColumn
            key={col.id}
            column={col}
            tasks={stableTasksByColumn[col.id] ?? EMPTY_TASKS}
            isOver={overId === col.id}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
