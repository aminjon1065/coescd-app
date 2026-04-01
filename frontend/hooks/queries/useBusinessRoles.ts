import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { queryKeys } from '@/lib/query-keys';
import { IBusinessRole } from '@/interfaces/IBusinessRole';

export function useBusinessRolesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.businessRoles.list(),
    queryFn: async (): Promise<IBusinessRole[]> => {
      const res = await api.get<IBusinessRole[]>('/business-roles');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 1_000 * 60 * 5,
    enabled,
  });
}
