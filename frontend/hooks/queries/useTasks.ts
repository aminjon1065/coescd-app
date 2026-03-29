import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { ITask } from '@/interfaces/ITask';
import { extractListItems, ListResponse } from '@/lib/list-response';

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches the full task list for the current user.
 *
 * Caching behaviour: results are kept fresh for 1 minute (global default).
 * Navigation back to the tasks page within that window shows instantly from
 * cache; a background refetch silently updates the data.
 */
export function useTasksQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: async (): Promise<ITask[]> => {
      const res = await api.get<ListResponse<ITask> | ITask[]>('/task');
      return extractListItems(res.data);
    },
    enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface CreateTaskPayload {
  title: string;
  description?: string;
  receiverId: number;
  dueDate?: string;
}

/**
 * Creates a new task and invalidates the task list so the new entry appears
 * immediately without a manual refetch call.
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => api.post<ITask>('/task', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
    },
  });
}
