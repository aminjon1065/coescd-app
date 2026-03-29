import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { IUser } from '@/interfaces/IUser';
import { extractListItems, ListResponse } from '@/lib/list-response';

// ── Filters type ──────────────────────────────────────────────────────────────

export interface UsersQueryFilters {
  search?: string;
  /** 'all' means no department filter */
  departmentId?: number | string;
  /** When true, the query automatically restricts to managerDepartmentId */
  isManager?: boolean;
  managerDepartmentId?: number | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches the user list with optional server-side filters.
 *
 * The full filter object is included in the query key, so changing any filter
 * value automatically triggers a refetch — no manual effect needed.
 *
 * staleTime is intentionally left at the global default (1 min) so search
 * results are always fresh after the debounce window.
 */
export function useUsersQuery(filters: UsersQueryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async (): Promise<IUser[]> => {
      const params: Record<string, string | number> = {};

      // Manager sees only their own department regardless of the filter
      if (filters.isManager && filters.managerDepartmentId) {
        params.departmentId = filters.managerDepartmentId;
      } else if (
        filters.departmentId &&
        filters.departmentId !== 'all'
      ) {
        params.departmentId = Number(filters.departmentId);
      }

      if (filters.search?.trim()) {
        params.q = filters.search.trim();
      }

      const res = await api.get<ListResponse<IUser> | IUser[]>('/users', { params });
      return extractListItems(res.data);
    },
    enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new user account and invalidates the users list.
 */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<IUser>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
}

/**
 * Updates a user's profile fields (e.g. position, businessRole).
 * Invalidates ALL users queries so both the list and any detail views refresh.
 */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number;
      data: Record<string, unknown>;
    }) => api.patch<IUser>(`/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
}

/**
 * Toggles a user's active/disabled state.
 * Invalidates ALL users queries so the status badge updates everywhere.
 */
export function useToggleUserActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: number;
      isActive: boolean;
    }) => api.patch<IUser>(`/users/${userId}/active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
}
