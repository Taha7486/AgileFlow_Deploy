import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectListItem } from '../types';

interface ActiveProjectState {
  activeProject: ProjectListItem | null;
  setActiveProject: (project: ProjectListItem | null) => void;
  clearActiveProject: () => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),
      clearActiveProject: () => set({ activeProject: null }),
    }),
    { name: 'agileflow_active_project' },
  ),
);
