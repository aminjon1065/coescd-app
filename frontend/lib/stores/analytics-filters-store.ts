import { create } from 'zustand';
import { subDays } from 'date-fns';

interface FiltersStore {
  dateRange: [Date, Date];
  geoScope: string | null;
  incidentTypes: string[];
  groupBy: 'day' | 'week' | 'month';

  setDateRange: (range: [Date, Date]) => void;
  setGeoScope: (code: string | null) => void;
  setIncidentTypes: (types: string[]) => void;
  setGroupBy: (g: 'day' | 'week' | 'month') => void;
  reset: () => void;
}

const defaultState = {
  dateRange: [subDays(new Date(), 30), new Date()] as [Date, Date],
  geoScope: null,
  incidentTypes: [],
  groupBy: 'day' as const,
};

export const useAnalyticsFilters = create<FiltersStore>((set) => ({
  ...defaultState,

  setDateRange: (range) => set({ dateRange: range }),
  setGeoScope: (code) => set({ geoScope: code }),
  setIncidentTypes: (types) => set({ incidentTypes: types }),
  setGroupBy: (g) => set({ groupBy: g }),
  reset: () => set(defaultState),
}));
