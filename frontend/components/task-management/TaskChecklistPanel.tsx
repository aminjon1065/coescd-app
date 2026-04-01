'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type { ITmTaskChecklistItem } from '@/interfaces/ITaskManagement';
import { cn } from '@/lib/utils';

interface TaskChecklistPanelProps {
  taskId: string;
  items: ITmTaskChecklistItem[];
  canEdit?: boolean;
}

export function TaskChecklistPanel({ taskId, items, canEdit = true }: TaskChecklistPanelProps) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const completed = items.filter((i) => i.isCompleted).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      taskManagementApi.updateChecklistItem(taskId, itemId, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tm-task', taskId] }),
  });

  const addMutation = useMutation({
    mutationFn: (title: string) => taskManagementApi.addChecklistItem(taskId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-task', taskId] });
      setNewTitle('');
      setAdding(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => taskManagementApi.removeChecklistItem(taskId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tm-task', taskId] }),
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate(newTitle.trim());
  };

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Checklist</span>
          <Badge variant="secondary" className="text-xs">
            {completed}/{items.length}
          </Badge>
        </div>
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>

      {items.length > 0 && <Progress value={pct} className="h-1.5" />}

      {/* Items */}
      <div className="space-y-1.5">
        {items
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 group py-1 px-2 rounded hover:bg-slate-50"
            >
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ itemId: item.id, isCompleted: !!checked })
                }
                disabled={!canEdit || toggleMutation.isPending}
                className="flex-shrink-0"
              />
              <span
                className={cn(
                  'flex-1 text-sm',
                  item.isCompleted && 'line-through text-slate-400',
                )}
              >
                {item.title}
              </span>
              {item.assignedTo && (
                <span className="text-xs text-slate-400 hidden group-hover:inline">
                  @{item.assignedTo.name}
                </span>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
      </div>

      {/* Add new item */}
      {canEdit && (
        adding ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="New checklist item..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
              }}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addMutation.isPending || !newTitle.trim()}
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setAdding(false); setNewTitle(''); }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-slate-500 hover:text-slate-700 w-full justify-start"
            onClick={() => setAdding(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </Button>
        )
      )}
    </div>
  );
}
