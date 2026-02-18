export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export const extractListItems = <T>(payload: ListResponse<T> | T[]): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.items ?? [];
};

