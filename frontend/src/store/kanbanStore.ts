import { create } from 'zustand';
import { kanbanApi } from '../api/kanbanApi';
import type {
  KanbanBoardData,
  KanbanColumn,
  KanbanFilters,
  KanbanStatut,
  KanbanTask,
  KanbanUpdateMessage,
} from '../types/kanban.types';

const DEFAULT_FILTERS: KanbanFilters = {
  projectId: null,
  sprintId: null,
  assigneeId: null,
  search: '',
  priorite: null,
};

interface KanbanState {
  board: KanbanBoardData | null;
  columns: KanbanColumn[];
  filters: KanbanFilters;
  selectedTaskId: number | null;
  isLoading: boolean;
  error: string | null;
  groupBy: 'none' | 'assignee' | 'priorite';
  loadBoard: () => Promise<void>;
  setFilter: <K extends keyof KanbanFilters>(key: K, value: KanbanFilters[K]) => void;
  setProjectId: (projectId: number | null) => void;
  resetFilters: () => void;
  openTask: (id: number | null) => void;
  moveTaskOptimistic: (taskId: number, fromStatut: KanbanStatut, toStatut: KanbanStatut) => void;
  moveTaskConfirm: (taskId: number, toStatut: KanbanStatut) => Promise<void>;
  moveTaskRollback: (taskId: number, fromStatut: KanbanStatut, toStatut: KanbanStatut) => void;
  addTask: (task: KanbanTask) => void;
  updateTask: (task: KanbanTask) => void;
  deleteTask: (taskId: number) => void;
  handleWsMessage: (message: KanbanUpdateMessage | string) => void;
  setGroupBy: (groupBy: 'none' | 'assignee' | 'priorite') => void;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  board: null,
  columns: [],
  filters: DEFAULT_FILTERS,
  selectedTaskId: null,
  isLoading: false,
  error: null,
  groupBy: 'none',

  loadBoard: async () => {
    const { filters } = get();
    if (!filters.projectId) {
      set({ board: null, columns: [], isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const board = await kanbanApi.getBoard(filters);
      set({ board, columns: board.columns, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Chargement impossible', isLoading: false });
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }));
    if (key !== 'search') void get().loadBoard();
  },

  setProjectId: (projectId) => {
    set((state) => ({ filters: { ...state.filters, projectId, sprintId: null, assigneeId: null } }));
    void get().loadBoard();
  },

  resetFilters: () => {
    const projectId = get().filters.projectId;
    set({ filters: { ...DEFAULT_FILTERS, projectId } });
    void get().loadBoard();
  },

  openTask: (id) => set({ selectedTaskId: id }),

  moveTaskOptimistic: (taskId, fromStatut, toStatut) => {
    set((state) => {
      const movingTask = state.columns.find((column) => column.statut === fromStatut)?.tasks.find((task) => task.id === taskId);
      if (!movingTask) return state;
      return {
        columns: state.columns.map((column) => {
          if (column.statut === fromStatut) {
            return { ...column, count: Math.max(0, column.count - 1), tasks: column.tasks.filter((task) => task.id !== taskId) };
          }
          if (column.statut === toStatut) {
            return { ...column, count: column.count + 1, tasks: [{ ...movingTask, statut: toStatut }, ...column.tasks] };
          }
          return column;
        }),
      };
    });
  },

  moveTaskConfirm: async (taskId, toStatut) => {
    try {
      await kanbanApi.moveTask(taskId, toStatut);
      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Deplacement impossible' });
      throw error;
    }
  },

  moveTaskRollback: (taskId, fromStatut, toStatut) => {
    get().moveTaskOptimistic(taskId, toStatut, fromStatut);
  },

  addTask: (task) => {
    set((state) => ({
      columns: state.columns.map((column) => (
        column.statut === task.statut
          ? { ...column, count: column.count + 1, tasks: [task, ...column.tasks] }
          : column
      )),
    }));
  },

  updateTask: (task) => {
    set((state) => ({
      columns: state.columns.map((column) => {
        const containsTask = column.tasks.some((item) => item.id === task.id);
        if (containsTask && column.statut !== task.statut) {
          return { ...column, count: Math.max(0, column.count - 1), tasks: column.tasks.filter((item) => item.id !== task.id) };
        }
        if (!containsTask && column.statut === task.statut) {
          return { ...column, count: column.count + 1, tasks: [task, ...column.tasks] };
        }
        return { ...column, tasks: column.tasks.map((item) => (item.id === task.id ? task : item)) };
      }),
    }));
  },

  deleteTask: (taskId) => {
    set((state) => ({
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
      columns: state.columns.map((column) => {
        const existed = column.tasks.some((task) => task.id === taskId);
        return {
          ...column,
          count: existed ? Math.max(0, column.count - 1) : column.count,
          tasks: column.tasks.filter((task) => task.id !== taskId),
        };
      }),
    }));
  },

  handleWsMessage: (message) => {
    if (typeof message === 'string') {
      if (message === 'refresh') {
        void get().loadBoard();
      }
      return;
    }
    const { type, task } = message;
    if (type === 'TASK_CREATED') get().addTask(task);
    if (type === 'TASK_UPDATED' || type === 'TASK_MOVED') get().updateTask(task);
    if (type === 'TASK_DELETED') get().deleteTask(task.id);
  },

  setGroupBy: (groupBy) => set({ groupBy }),
}));
