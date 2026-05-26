import { create } from 'zustand';
import axios from 'axios';
import { projectSummaryApi } from '../api/projectSummaryApi';
import type { ProjectSummaryData } from '../types/projectSummary.types';

interface ProjectSummaryState {
  data: ProjectSummaryData | null;
  activityPage: number;
  hasMoreActivity: boolean;
  banniereVisible: boolean;
  periodeDays: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadSummary: (projectId: number) => Promise<void>;
  loadMoreActivity: (projectId: number) => Promise<void>;
  setPeriode: (days: number, projectId: number) => void;
  dismissBanniere: () => void;
  refresh: (projectId: number) => Promise<void>;
}

const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const useProjectSummaryStore = create<ProjectSummaryState>((set, get) => ({
  data: null,
  activityPage: 0,
  hasMoreActivity: true,
  banniereVisible: localStorage.getItem('summary-banner-dismissed') !== 'true',
  periodeDays: 7,
  isLoading: false,
  isLoadingMore: false,
  error: null,

  loadSummary: async (projectId) => {
    set({ isLoading: true, error: null, activityPage: 0, hasMoreActivity: true });
    try {
      const data = await projectSummaryApi.getSummary(projectId, get().periodeDays);
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: errorMessage(error, 'Chargement impossible'), isLoading: false });
    }
  },

  loadMoreActivity: async (projectId) => {
    const { activityPage, isLoadingMore, hasMoreActivity } = get();
    if (isLoadingMore || !hasMoreActivity) return;
    set({ isLoadingMore: true });
    try {
      const nextPage = activityPage + 1;
      const moreActivity = await projectSummaryApi.getRecentActivity(projectId, nextPage, 20);
      set((state) => ({
        data: state.data ? { ...state.data, recentActivity: [...state.data.recentActivity, ...moreActivity] } : state.data,
        activityPage: nextPage,
        hasMoreActivity: moreActivity.length > 0,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ error: errorMessage(error, 'Chargement activite impossible'), isLoadingMore: false });
    }
  },

  setPeriode: (days, projectId) => {
    set({ periodeDays: days });
    void get().loadSummary(projectId);
  },

  dismissBanniere: () => {
    localStorage.setItem('summary-banner-dismissed', 'true');
    set({ banniereVisible: false });
  },

  refresh: async (projectId) => {
    await get().loadSummary(projectId);
  },
}));
