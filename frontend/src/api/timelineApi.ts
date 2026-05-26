import axiosInstance from './axiosInstance';
import type { TimelineData, TimelineEpic, TimelineFilters, TimelineTask, TimelineVue } from '../types/timeline.types';

export const timelineApi = {
  getTimeline: async (filters: TimelineFilters, vue: TimelineVue = 'MOIS'): Promise<TimelineData> => {
    const params: Record<string, string | number> = { vue };
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.epicId) params.epicId = filters.epicId;
    if (filters.type) params.type = filters.type;
    if (filters.statut) params.statut = filters.statut;
    if (filters.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters.search) params.search = filters.search;
    const { data } = await axiosInstance.get<TimelineData>('/timeline', { params });
    return data;
  },

  updateDates: async (taskId: number, dateDebut: string | null, dateFin: string | null): Promise<TimelineTask> => {
    const { data } = await axiosInstance.patch<TimelineTask>(`/timeline/${taskId}/dates`, { dateDebut, dateFin });
    return data;
  },

  createEpic: async (payload: {
    titre: string;
    description?: string;
    projectId: number;
    dateDebut?: string;
    dateFin?: string;
    couleur?: string;
    assigneeId?: number;
  }): Promise<TimelineEpic> => {
    const { data } = await axiosInstance.post<TimelineEpic>('/timeline/epics', payload);
    return data;
  },
};
