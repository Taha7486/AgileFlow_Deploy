import axiosInstance from './axiosInstance';
import type { ActivityGroup, EpicProgress, ProjectSummaryData, WorkloadItem } from '../types/projectSummary.types';

export const projectSummaryApi = {
  getSummary: async (projectId: number, jours = 7): Promise<ProjectSummaryData> => {
    const { data } = await axiosInstance.get(`/projects/${projectId}/summary`, { params: { jours } });
    return data;
  },

  getRecentActivity: async (projectId: number, page = 0, size = 20): Promise<ActivityGroup[]> => {
    const { data } = await axiosInstance.get(`/projects/${projectId}/summary/activity`, { params: { page, size } });
    return data;
  },

  getTeamWorkload: async (projectId: number): Promise<WorkloadItem[]> => {
    const { data } = await axiosInstance.get(`/projects/${projectId}/summary/workload`);
    return data;
  },

  getEpicProgress: async (projectId: number): Promise<EpicProgress[]> => {
    const { data } = await axiosInstance.get(`/projects/${projectId}/summary/epic-progress`);
    return data;
  },
};
