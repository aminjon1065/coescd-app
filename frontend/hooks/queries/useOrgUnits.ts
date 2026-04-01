import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { IOrgUnit } from '@/interfaces/IOrgUnit';

export function useOrgUnitsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orgUnits.list(),
    queryFn: async (): Promise<IOrgUnit[]> => {
      const res = await api.get<IOrgUnit[]>('/org-units');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 1_000 * 60 * 5,
    enabled,
  });
}
