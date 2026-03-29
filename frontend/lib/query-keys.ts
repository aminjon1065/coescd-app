/**
 * Centralized React Query key factories.
 *
 * Why a key factory instead of ad-hoc string arrays?
 *  • A single source of truth — renaming a resource only changes one file.
 *  • Hierarchical invalidation: `queryClient.invalidateQueries({ queryKey:
 *    queryKeys.users.all() })` invalidates every users query at once, while
 *    `queryKeys.users.list(filters)` targets only a specific filter set.
 *  • TypeScript `as const` gives the compiler the exact tuple types, so
 *    `useQuery({ queryKey: queryKeys.tasks.list() })` is fully typed.
 *
 * Hierarchy convention:
 *   all()  — matches every query for the resource (use for broad invalidation)
 *   list() — matches paginated / filtered list queries
 *   detail(id) — matches single-item queries
 */

export const queryKeys = {
  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: {
    all: () => ['tasks'] as const,
    list: () => ['tasks', 'list'] as const,
    detail: (id: number | string) => ['tasks', 'detail', id] as const,
  },

  // ── Calls ─────────────────────────────────────────────────────────────────
  calls: {
    all: () => ['calls'] as const,
    /** Paginated call history — key includes page + limit so each page is
     *  cached independently (no flash when navigating back a page). */
    history: (page: number, limit: number) =>
      ['calls', 'history', { page, limit }] as const,
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    all: () => ['users'] as const,
    list: (filters: {
      search?: string;
      departmentId?: number | string;
      isManager?: boolean;
      managerDepartmentId?: number | null;
    }) => ['users', 'list', filters] as const,
  },

  // ── Departments ───────────────────────────────────────────────────────────
  departments: {
    all: () => ['departments'] as const,
    list: () => ['departments', 'list'] as const,
  },
} as const;
