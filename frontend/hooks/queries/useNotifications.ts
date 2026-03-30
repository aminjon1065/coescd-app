import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import type { ListResponse } from '@/lib/list-response';

export interface INotification {
  id: number;
  kind:
    | 'task_assigned'
    | 'task_updated'
    | 'document_routed'
    | 'edm_alert'
    | 'call_incoming'
    | 'system';
  message: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** Fetch paginated notifications. Pass `unread=true` for unread-only. */
export function useNotificationsQuery(unread = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(unread),
    queryFn: () =>
      api
        .get<ListResponse<INotification>>('/notifications', {
          params: { limit: 20, ...(unread ? { unread: 'true' } : {}) },
        })
        .then((r) => r.data),
    enabled,
    refetchInterval: 30_000, // poll every 30 s
  });
}

/** Fetch unread notification count (lightweight — shown in bell badge). */
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () =>
      api
        .get<{ count: number }>('/notifications/unread-count')
        .then((r) => r.data.count),
    enabled,
    refetchInterval: 30_000,
  });
}

/** Mark a single notification as read. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch<INotification>(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

/** Mark all notifications as read. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}
