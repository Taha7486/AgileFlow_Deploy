import { create } from 'zustand';
import { timelineApi } from '../api/timelineApi';
import type { TimelineData, TimelineFilters, TimelineTask, TimelineVue } from '../types/timeline.types';

const DEFAULT_FILTERS: TimelineFilters = {
  projectId: null,
  epicId: null,
  type: null,
  statut: null,
  assigneeId: null,
  search: '',
};

interface TimelineState {
  data: TimelineData | null;
  filters: TimelineFilters;
  vue: TimelineVue;
  expandedEpics: Set<number>;
  selectedTaskId: number | null;
  isLoading: boolean;
  error: string | null;
  loadTimeline: () => Promise<void>;
  setFilter: <K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) => void;
  setProjectId: (projectId: number | null) => void;
  resetFilters: () => void;
  setVue: (vue: TimelineVue) => void;
  toggleEpic: (epicId: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  openTask: (id: number | null) => void;
  updateTaskDates: (taskId: number, dateDebut: string | null, dateFin: string | null) => Promise<void>;
  scrollToToday: () => void;
  createEpic: (payload: { titre: string; description?: string; projectId: number; dateDebut?: string; dateFin?: string; couleur?: string; assigneeId?: number }) => Promise<void>;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  data: null,
  filters: DEFAULT_FILTERS,
  vue: 'MOIS',
  expandedEpics: new Set(),
  selectedTaskId: null,
  isLoading: false,
  error: null,

  loadTimeline: async () => {
    const { filters, vue } = get();
    if (!filters.projectId) {
      set({ data: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await timelineApi.getTimeline(filters, vue);
      set({ data, expandedEpics: new Set(data.epics.map((epic) => epic.id)), isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Chargement impossible', isLoading: false });
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }));
    if (key !== 'search') void get().loadTimeline();
  },

  setProjectId: (projectId) => {
    set((state) => ({ filters: { ...state.filters, projectId, epicId: null, assigneeId: null } }));
    void get().loadTimeline();
  },

  resetFilters: () => {
    const projectId = get().filters.projectId;
    set({ filters: { ...DEFAULT_FILTERS, projectId } });
    void get().loadTimeline();
  },

  setVue: (vue) => {
    set({ vue });
    void get().loadTimeline();
  },

  toggleEpic: (epicId) => {
    set((state) => {
      const next = new Set(state.expandedEpics);
      next.has(epicId) ? next.delete(epicId) : next.add(epicId);
      return { expandedEpics: next };
    });
  },

  expandAll: () => set({ expandedEpics: new Set(get().data?.epics.map((epic) => epic.id) ?? []) }),
  collapseAll: () => set({ expandedEpics: new Set() }),
  openTask: (id) => set({ selectedTaskId: id }),

  updateTaskDates: async (taskId, dateDebut, dateFin) => {
    const updateTask = (task: TimelineTask): TimelineTask => (
      task.id === taskId ? { ...task, dateDebut, dateFin, aDesDatesDefinies: Boolean(dateFin) } : task
    );
    set((state) => state.data ? ({
      data: {
        ...state.data,
        epics: state.data.epics.map((epic) => ({ ...epic, taches: epic.taches.map(updateTask) })),
        tasksWithoutEpic: state.data.tasksWithoutEpic.map(updateTask),
      },
    }) : state);
    try {
      await timelineApi.updateDates(taskId, dateDebut, dateFin);
      await get().loadTimeline();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Modification des dates impossible' });
      void get().loadTimeline();
    }
  },

  scrollToToday: () => window.dispatchEvent(new CustomEvent('timeline:scrollToToday')),

  createEpic: async (payload) => {
    try {
      await timelineApi.createEpic(payload);
      await get().loadTimeline();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Creation epic impossible' });
    }
  },
}));
