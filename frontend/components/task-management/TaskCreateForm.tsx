'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ListResponse } from '@/lib/list-response';
import type { ITmTask } from '@/interfaces/ITaskManagement';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { taskManagementApi } from '@/lib/api/task-management';
import type { CreateTmTaskPayload, TmTaskType, TmTaskPriority, TmTaskVisibility } from '@/interfaces/ITaskManagement';
import { useTaskBoardStore } from '@/lib/stores/task-board-store';

interface TaskCreateFormProps {
  open: boolean;
  onClose: () => void;
  boardId?: string;
  parentTaskId?: string;
  onCreated?: () => void;
}

type FormValues = {
  title: string;
  description: string;
  type: TmTaskType;
  priority: TmTaskPriority;
  visibility: TmTaskVisibility;
  dueAt: string;
  estimatedHours: string;
  tagInput: string;
};

export function TaskCreateForm({ open, onClose, boardId, parentTaskId, onCreated }: TaskCreateFormProps) {
  const queryClient = useQueryClient();
  const { columns, addTaskToColumn } = useTaskBoardStore();
  const [tags, setTags] = useState<string[]>([]);
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      type: 'simple',
      priority: 'medium',
      visibility: 'department',
      dueAt: '',
      estimatedHours: '',
      tagInput: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateTmTaskPayload) => taskManagementApi.createTask(payload),

    onMutate: async (payload) => {
      // Cancel in-flight task-list queries to prevent them from overwriting the optimistic entry
      await queryClient.cancelQueries({ queryKey: ['tm-tasks'] });

      // Snapshot previous list for rollback
      const previousTasks = queryClient.getQueryData<ListResponse<ITmTask>>(['tm-tasks']);

      // Build an optimistic task with a temporary ID
      const tempId = `__optimistic__${Date.now()}`;
      const optimisticTask: ITmTask = {
        id: tempId,
        taskNumber: '...',
        title: payload.title,
        description: payload.description ?? null,
        type: payload.type,
        status: 'created',
        priority: payload.priority,
        visibility: payload.visibility ?? 'department',
        tags: payload.tags ?? [],
        dueAt: payload.dueAt ?? null,
        slaBreached: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentTask: null,
        createdBy: null as any,
        assigneeUser: null,
        assigneeDepartment: null,
        board: null,
        boardColumn: null,
        estimatedHours: payload.estimatedHours ?? null,
        actualHours: null,
        orderIndex: 0,
        linkedDocumentId: null,
        linkedIncidentId: null,
        assigneeRole: null,
        blockedReason: null,
        rejectionReason: null,
        startedAt: null,
        completedAt: null,
        closedAt: null,
        slaDeadline: null,
        metadata: {},
      } as ITmTask;

      // Prepend to the list cache
      if (previousTasks) {
        queryClient.setQueryData<ListResponse<ITmTask>>(['tm-tasks'], {
          ...previousTasks,
          items: [optimisticTask, ...previousTasks.items],
          total: previousTasks.total + 1,
        });
      }

      // Add to board store immediately (first column if exists)
      if (boardId && columns.length > 0) {
        addTaskToColumn(optimisticTask, columns[0].id);
      }

      return { previousTasks, tempId };
    },

    onError: (_err, _payload, context) => {
      // Roll back the list cache
      if (context?.previousTasks) {
        queryClient.setQueryData(['tm-tasks'], context.previousTasks);
      }
    },

    onSuccess: () => {
      reset();
      setTags([]);
      onCreated?.();
      onClose();
    },

    onSettled: () => {
      // Always refetch to sync server state (removes temp entry, gets real taskNumber)
      queryClient.invalidateQueries({ queryKey: ['tm-tasks'] });
      if (boardId) queryClient.invalidateQueries({ queryKey: ['tm-board', boardId] });
    },
  });

  const tagInput = watch('tagInput');

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
      setValue('tagInput', '');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const onSubmit = (values: FormValues) => {
    const payload: CreateTmTaskPayload = {
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      priority: values.priority,
      visibility: values.visibility,
      dueAt: values.dueAt || undefined,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : undefined,
      tags,
      boardId: boardId || undefined,
      parentTaskId: parentTaskId || undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{parentTaskId ? 'Create Subtask' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Task title..."
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the task..."
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="checklist">Checklist</SelectItem>
                      <SelectItem value="workflow_driven">Workflow Driven</SelectItem>
                      <SelectItem value="document_linked">Document Linked</SelectItem>
                      <SelectItem value="incident_related">Incident Related</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Due date + Visibility row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dueAt">Due Date</Label>
              <Input id="dueAt" type="datetime-local" {...register('dueAt')} />
            </div>

            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="cross_department">Cross-Department</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Estimated hours */}
          <div className="space-y-1.5">
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 8"
              {...register('estimatedHours')}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                {...register('tagInput')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
