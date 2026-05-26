import { create } from 'zustand';
import { planningApi } from '../api/planningApi';
import type { GroupByOption, PlanningFilters, PlanningGroup, PlanningStats, PlanningTask, SavedView } from '../types/planning.types';

export const DEFAULT_PLANNING_FILTERS: PlanningFilters = {
  projectId: null,
  statut: null,
  priorite: null,
  assigneeId: null,
  search: '',
  groupBy: 'NONE',
  sortBy: 'dateCreation',
  sortDir: 'DESC',
};

interface PlanningState {
  groups: PlanningGroup[];
  stats: PlanningStats | null;
  totalElements: number;
  currentPage: number;
  totalPages: number;
  filters: PlanningFilters;
  selectedTaskIds: Set<number>;
  openedTaskId: number | null;
  collapsedGroups: Set<string>;
  isLoading: boolean;
  error: string | null;
  savedViews: SavedView[];
  visibleColumns: string[];
  loadTasks: (page?: number) => Promise<void>;
  setFilter: <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => void;
  setFilters: (filters: Partial<PlanningFilters>) => void;
  resetFilters: () => void;
  applyFiltersAndReload: (filters: Partial<PlanningFilters>) => void;
  toggleTaskSelection: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  openTask: (id: number | null) => void;
  toggleGroup: (key: string) => void;
  inlineEditTask: (id: number, field: string, value: string) => Promise<void>;
  bulkAction: (action: string, value?: string, assigneeId?: number) => Promise<void>;
  loadSavedViews: () => Promise<void>;
  saveCurrentView: (nom: string) => Promise<void>;
  applySavedView: (view: SavedView) => void;
  deleteSavedView: (id: number) => Promise<void>;
  setVisibleColumns: (cols: string[]) => void;
  addSubtaskToParent: (parentId: number, newTask: PlanningTask) => void;
  handleWsTaskUpdate: (task: PlanningTask) => void;
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  groups: [],
  stats: null,
  totalElements: 0,
  currentPage: 0,
  totalPages: 0,
  filters: DEFAULT_PLANNING_FILTERS,
  selectedTaskIds: new Set(),
  openedTaskId: null,
  collapsedGroups: new Set(),
  isLoading: false,
  error: null,
  savedViews: [],
  visibleColumns: ['titre', 'assignee', 'reporter', 'priorite', 'statut', 'dateEcheance', 'dateMiseAJour'],

  loadTasks: async (page = 0) => {
    set({ isLoading: true, error: null });
    try {
      const res = await planningApi.getTasks(get().filters, page);
      const groups = page > 0 ? mergeGroups(get().groups, res.groups) : res.groups;
      set({
        groups,
        stats: res.stats,
        totalElements: res.totalElements,
        totalPages: res.totalPages,
        currentPage: res.currentPage,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? e.message ?? 'Erreur chargement planning', isLoading: false });
    }
  },

  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  resetFilters: () => {
    const projectId = get().filters.projectId;
    set({ filters: { ...DEFAULT_PLANNING_FILTERS, projectId }, selectedTaskIds: new Set() });
    void get().loadTasks(0);
  },
  applyFiltersAndReload: (filters) => {
    set((s) => ({ filters: { ...s.filters, ...filters }, selectedTaskIds: new Set() }));
    void get().loadTasks(0);
  },

  toggleTaskSelection: (id) => set((s) => {
    const selectedTaskIds = new Set(s.selectedTaskIds);
    selectedTaskIds.has(id) ? selectedTaskIds.delete(id) : selectedTaskIds.add(id);
    return { selectedTaskIds };
  }),
  selectAll: () => set({ selectedTaskIds: new Set(get().groups.flatMap((g) => g.tasks.map((t) => t.id))) }),
  clearSelection: () => set({ selectedTaskIds: new Set() }),
  openTask: (id) => set({ openedTaskId: id }),
  toggleGroup: (key) => set((s) => {
    const collapsedGroups = new Set(s.collapsedGroups);
    collapsedGroups.has(key) ? collapsedGroups.delete(key) : collapsedGroups.add(key);
    return { collapsedGroups };
  }),

  inlineEditTask: async (id, field, value) => {
    try {
      const updated = await planningApi.inlineEdit(id, field, value);
      set((s) => ({
        groups: s.groups.map((group) => ({
          ...group,
          tasks: updateTaskInList(group.tasks, updated),
        })),
      }));
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? e.message ?? 'Erreur modification' });
    }
  },

  bulkAction: async (action, value, assigneeId) => {
    const ids = Array.from(get().selectedTaskIds);
    if (!ids.length) return;
    try {
      await planningApi.bulkAction({ action: action as any, taskIds: ids, value, assigneeId });
      set({ selectedTaskIds: new Set() });
      await get().loadTasks(get().currentPage);
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? e.message ?? 'Erreur action multiple' });
    }
  },

  loadSavedViews: async () => {
    try {
      set({ savedViews: await planningApi.getSavedViews() });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? e.message ?? 'Erreur vues sauvegardees' });
    }
  },
  saveCurrentView: async (nom) => {
    const view = await planningApi.createSavedView(nom, get().filters);
    set((s) => ({ savedViews: [view, ...s.savedViews] }));
  },
  applySavedView: (view) => {
    const projectId = get().filters.projectId;
    set({ filters: { ...(JSON.parse(view.filtersJson) as PlanningFilters), projectId } });
    void get().loadTasks(0);
  },
  deleteSavedView: async (id) => {
    await planningApi.deleteSavedView(id);
    set((s) => ({ savedViews: s.savedViews.filter((view) => view.id !== id) }));
  },
  setVisibleColumns: (cols) => set({ visibleColumns: cols }),
  addSubtaskToParent: (parentId, newTask) => set((s) => ({
    groups: s.groups.map((group) => ({
      ...group,
      tasks: addSubtaskToList(group.tasks, parentId, newTask),
    })),
  })),
  handleWsTaskUpdate: (task) => set((s) => ({
    groups: s.groups.map((group) => ({
      ...group,
      tasks: updateTaskInList(group.tasks, task),
    })),
  })),
}));

export const GROUP_LABELS: Record<GroupByOption, string> = {
  STORY: 'Story',
  ASSIGNEE: 'Assigne',
  STATUT: 'Statut',
  NONE: 'Aucun',
};

const mergeGroups = (current: PlanningGroup[], incoming: PlanningGroup[]) => {
  const byKey = new Map(current.map((group) => [group.groupKey, { ...group, tasks: [...group.tasks] }]));
  incoming.forEach((group) => {
    const existing = byKey.get(group.groupKey);
    if (!existing) {
      byKey.set(group.groupKey, group);
      return;
    }
    existing.tasks.push(...group.tasks);
    existing.taskCount += group.taskCount;
    existing.doneCount += group.doneCount;
  });
  return Array.from(byKey.values());
};

const updateTaskInList = (tasks: PlanningTask[], updated: PlanningTask): PlanningTask[] => {
  return tasks.map(task => {
    if (task.id === updated.id) return updated;
    if (task.sousTaskes && task.sousTaskes.length > 0) {
      return { ...task, sousTaskes: updateTaskInList(task.sousTaskes, updated) };
    }
    return task;
  });
};

const addSubtaskToList = (tasks: PlanningTask[], parentId: number, newTask: PlanningTask): PlanningTask[] => {
  return tasks.map(task => {
    if (task.id === parentId) {
      return {
        ...task,
        sousTaskes: [...(task.sousTaskes || []), newTask],
        sousTaskeCount: (task.sousTaskeCount || 0) + 1,
      };
    }
    if (task.sousTaskes && task.sousTaskes.length > 0) {
      return { ...task, sousTaskes: addSubtaskToList(task.sousTaskes, parentId, newTask) };
    }
    return task;
  });
};
