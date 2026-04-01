'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskBoard } from '@/components/task-management/TaskBoard';
import { TaskFilters } from '@/components/task-management/TaskFilters';
import { TaskCreateForm } from '@/components/task-management/TaskCreateForm';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, LayoutGrid } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import { useTaskFiltersStore } from '@/lib/stores/task-filters-store';
import { useTmTaskSocket } from '@/hooks/useTmTaskSocket';
import type { ITmTaskBoard } from '@/interfaces/ITaskManagement';

export default function TaskBoardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { activeBoardId, setFilter } = useTaskFiltersStore();

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ['tm-boards'],
    queryFn: () => taskManagementApi.getBoards(),
  });

  const selectedBoardId = activeBoardId ?? boards[0]?.id ?? null;

  // Real-time updates for the active board
  useTmTaskSocket({ boardId: selectedBoardId ?? undefined });

  const handleBoardChange = (id: string) => setFilter('activeBoardId', id);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-slate-500" />
          <h1 className="text-xl font-semibold text-slate-800">Task Board</h1>

          {/* Board selector */}
          {boards.length > 0 && (
            <Select
              value={selectedBoardId ?? ''}
              onValueChange={handleBoardChange}
            >
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="Select board..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b: ITmTaskBoard) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters />

      {/* Board content */}
      <div className="flex-1 overflow-hidden">
        {boardsLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            Loading boards...
          </div>
        ) : selectedBoardId ? (
          <div className="h-full overflow-x-auto">
            <TaskBoard boardId={selectedBoardId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
            <LayoutGrid className="w-12 h-12 opacity-30" />
            <p className="text-sm">No boards yet.</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              Create your first board
            </Button>
          </div>
        )}
      </div>

      <TaskCreateForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        boardId={selectedBoardId ?? undefined}
        onCreated={() => {}}
      />
    </div>
  );
}
