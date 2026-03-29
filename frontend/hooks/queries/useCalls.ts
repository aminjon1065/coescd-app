import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { ICall } from '@/interfaces/ICall';

interface PaginatedCalls {
  items: ICall[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated call history for the current user.
 *
 * Each (page, limit) combination is cached independently — navigating back to
 * a previously viewed page shows instantly from cache.
 *
 * `placeholderData: (prev) => prev` (keepPreviousData equivalent in v5) keeps
 * the current page visible while the next page is fetching, so the table never
 * flashes empty between page transitions.
 */
export function useCallHistoryQuery(page: number, limit: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.calls.history(page, limit),
    queryFn: async (): Promise<PaginatedCalls> => {
      const res = await api.get<PaginatedCalls>('/calls', {
        params: { page, limit },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
    enabled,
  });
}
