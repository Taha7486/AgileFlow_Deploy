import { api } from './axiosInterceptor';
import type { BulkActionRequest, CreateSubtaskRequest, PlanningFilters, PlanningPageResponse, PlanningTask, SavedView } from '../types/planning.types';

const cleanParams = (params: Record<string, unknown>) => {
  const next = { ...params };
  Object.keys(next).forEach((key) => {
    if (next[key] == null || next[key] === '') delete next[key];
  });
  return next;
};

export const planningApi = {
  getTasks: async (filters: PlanningFilters, page = 0, size = 50): Promise<PlanningPageResponse> => {
    const { data } = await api.get('/tasks/planning', { params: cleanParams({ ...filters, page, size }) });
    return data;
  },

  inlineEdit: async (taskId: number, field: string, value: string): Promise<PlanningTask> => {
    const { data } = await api.patch(`/tasks/${taskId}/inline`, { field, value });
    return data;
  },

  bulkAction: async (req: BulkActionRequest) => {
    const { data } = await api.put('/tasks/planning/bulk', req);
    return data;
  },

  exportCsv: async (filters: PlanningFilters): Promise<void> => {
    const { data } = await api.get('/tasks/planning/export', {
      params: cleanParams({ ...filters, format: 'csv' }),
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agileflow-planning-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getSavedViews: async (): Promise<SavedView[]> => {
    const { data } = await api.get('/tasks/planning/saved-views');
    return data;
  },

  createSavedView: async (nom: string, filters: PlanningFilters): Promise<SavedView> => {
    const { data } = await api.post('/tasks/planning/saved-views', { nom, filtersJson: JSON.stringify(filters) });
    return data;
  },

  deleteSavedView: async (id: number): Promise<void> => {
    await api.delete(`/tasks/planning/saved-views/${id}`);
  },

  createSubtask: async (parentId: number, data: CreateSubtaskRequest): Promise<PlanningTask> => {
    const { data: res } = await api.post(`/tasks/${parentId}/subtasks`, data);
    return res;
  },

  getSubtasks: async (taskId: number): Promise<PlanningTask[]> => {
    const { data } = await api.get(`/tasks/${taskId}/subtasks`);
    return data;
  },
};
