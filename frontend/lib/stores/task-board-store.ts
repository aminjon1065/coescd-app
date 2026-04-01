import { create } from 'zustand';
import type { ITmTask, ITmTaskBoard, ITmTaskBoardColumn } from '@/interfaces/ITaskManagement';

interface TaskBoardStore {
  activeBoard: ITmTaskBoard | null;
  columns: ITmTaskBoardColumn[];
  tasksByColumn: Record<string, ITmTask[]>;
  draggingTaskId: string | null;

  setBoard: (board: ITmTaskBoard, tasksByColumn: Record<string, ITmTask[]>) => void;
  moveTask: (taskId: string, fromColId: string, toColId: string, newIndex: number) => void;
  addTaskToColumn: (task: ITmTask, columnId: string) => void;
  updateTaskInBoard: (taskId: string, updates: Partial<ITmTask>) => void;
  removeTaskFromBoard: (taskId: string) => void;
  setDragging: (taskId: string | null) => void;
  reset: () => void;
}

export const useTaskBoardStore = create<TaskBoardStore>((set, get) => ({
  activeBoard: null,
  columns: [],
  tasksByColumn: {},
  draggingTaskId: null,

  setBoard: (board, tasksByColumn) =>
    set({
      activeBoard: board,
      columns: [...board.columns].sort((a, b) => a.orderIndex - b.orderIndex),
      tasksByColumn,
    }),

  moveTask: (taskId, fromColId, toColId, newIndex) =>
    set((state) => {
      const from = [...(state.tasksByColumn[fromColId] ?? [])];
      const to = fromColId === toColId ? from : [...(state.tasksByColumn[toColId] ?? [])];

      const taskIdx = from.findIndex((t) => t.id === taskId);
      if (taskIdx === -1) return state;

      const [task] = from.splice(taskIdx, 1);
      const targetArray = fromColId === toColId ? from : to;
      targetArray.splice(newIndex, 0, task);

      return {
        tasksByColumn: {
          ...state.tasksByColumn,
          [fromColId]: from,
          ...(fromColId !== toColId ? { [toColId]: to } : {}),
        },
      };
    }),

  addTaskToColumn: (task, columnId) =>
    set((state) => ({
      tasksByColumn: {
        ...state.tasksByColumn,
        [columnId]: [...(state.tasksByColumn[columnId] ?? []), task],
      },
    })),

  updateTaskInBoard: (taskId, updates) =>
    set((state) => {
      const newMap = { ...state.tasksByColumn };
      for (const colId of Object.keys(newMap)) {
        newMap[colId] = newMap[colId].map((t) =>
          t.id === taskId ? { ...t, ...updates } : t,
        );
      }
      return { tasksByColumn: newMap };
    }),

  removeTaskFromBoard: (taskId) =>
    set((state) => {
      const newMap = { ...state.tasksByColumn };
      for (const colId of Object.keys(newMap)) {
        newMap[colId] = newMap[colId].filter((t) => t.id !== taskId);
      }
      return { tasksByColumn: newMap };
    }),

  setDragging: (taskId) => set({ draggingTaskId: taskId }),

  reset: () =>
    set({ activeBoard: null, columns: [], tasksByColumn: {}, draggingTaskId: null }),
}));
