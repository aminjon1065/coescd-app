import { create } from 'zustand';
import type { TmTaskStatus, TmTaskPriority, TmTaskType } from '@/interfaces/ITaskManagement';

export type TaskViewMode = 'board' | 'list' | 'timeline';

interface TaskFiltersStore {
  viewMode: TaskViewMode;
  status: TmTaskStatus[];
  priority: TmTaskPriority[];
  type: TmTaskType[];
  assigneeUserId: number | null;
  departmentId: number | null;
  dueDateFrom: string | null;
  dueDateTo: string | null;
  isOverdue: boolean;
  isSlaBreached: boolean;
  q: string;
  activeBoardId: string | null;

  setViewMode: (mode: TaskViewMode) => void;
  setFilter: <K extends keyof Omit<TaskFiltersStore, 'setViewMode' | 'setFilter' | 'resetFilters'>>(
    key: K,
    value: TaskFiltersStore[K],
  ) => void;
  resetFilters: () => void;
}

const initialFilters = {
  status: [] as TmTaskStatus[],
  priority: [] as TmTaskPriority[],
  type: [] as TmTaskType[],
  assigneeUserId: null,
  departmentId: null,
  dueDateFrom: null,
  dueDateTo: null,
  isOverdue: false,
  isSlaBreached: false,
  q: '',
  activeBoardId: null,
};

export const useTaskFiltersStore = create<TaskFiltersStore>((set) => ({
  viewMode: 'board',
  ...initialFilters,

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilter: (key, value) => set({ [key]: value }),

  resetFilters: () => set(initialFilters),
}));
