import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { IDepartment } from '@/interfaces/IDepartment';
import { extractListItems, ListResponse } from '@/lib/list-response';

/**
 * Fetches the flat department list.
 *
 * Departments change infrequently — staleTime is set to 5 minutes so the
 * users page, create-user form, and department filter all share a single
 * cached response instead of each firing their own network request.
 */
export function useDepartmentsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: async (): Promise<IDepartment[]> => {
      const res = await api.get<ListResponse<IDepartment> | IDepartment[]>('/department');
      return extractListItems(res.data);
    },
    staleTime: 1_000 * 60 * 5, // 5 minutes — departments rarely change
    enabled,
  });
}
