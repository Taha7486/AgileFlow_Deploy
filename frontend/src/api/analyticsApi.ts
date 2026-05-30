import axiosInstance from './axiosInstance';
import type { AnalyticsData, AnalyticsPeriod } from '../types';

export interface AnalyticsParams {
  period: AnalyticsPeriod;
  projectId?: number;
  sprintId?: number;
}

const toQuery = (params: AnalyticsParams) => ({
  period: params.period,
  ...(params.projectId ? { projectId: params.projectId } : {}),
  ...(params.sprintId ? { sprintId: params.sprintId } : {}),
});

export const fetchAnalytics = async (params: AnalyticsParams) => {
  const { data } = await axiosInstance.get<AnalyticsData>('/analytics', {
    params: toQuery(params),
  });
  return data;
};

export const exportAnalyticsPdf = async (params: AnalyticsParams) => {
  const { data } = await axiosInstance.get<Blob>('/analytics/export.pdf', {
    params: toQuery(params),
    responseType: 'blob',
  });
  return data;
};
