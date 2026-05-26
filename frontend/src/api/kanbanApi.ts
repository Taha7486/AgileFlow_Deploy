import axiosInstance from './axiosInstance';
import type {
  KanbanBoardData,
  KanbanFilters,
  KanbanPriorite,
  KanbanStatut,
  KanbanTask,
  QuickCreateRequest,
} from '../types/kanban.types';

export const kanbanApi = {
  getBoard: async (filters: KanbanFilters): Promise<KanbanBoardData> => {
    const params: Record<string, string | number> = {};
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.sprintId) params.sprintId = filters.sprintId;
    if (filters.assigneeId) params.assigneeId = filters.assigneeId;
    if (filters.search) params.search = filters.search;
    if (filters.priorite) params.priorite = filters.priorite;
    const { data } = await axiosInstance.get<KanbanBoardData>('/tasks/kanban/board', { params });
    return data;
  },

  quickCreate: async (request: QuickCreateRequest): Promise<KanbanTask> => {
    const { data } = await axiosInstance.post<KanbanTask>('/tasks/kanban/quick-create', request);
    return data;
  },

  moveTask: async (taskId: number, newStatut: KanbanStatut): Promise<void> => {
    await axiosInstance.put(`/tasks/${taskId}/move`, { statut: newStatut });
  },

  inlineEdit: async (taskId: number, field: string, value: string): Promise<void> => {
    await axiosInstance.patch(`/tasks/${taskId}/inline`, { field, value });
  },

  updatePriority: async (taskId: number, priorite: KanbanPriorite): Promise<void> => {
    await axiosInstance.patch(`/tasks/${taskId}/inline`, { field: 'priorite', value: priorite });
  },

  assignTask: async (taskId: number, assigneeId: number): Promise<void> => {
    await axiosInstance.put(`/tasks/${taskId}/assign`, { assignedToId: assigneeId });
  },

  deleteTask: async (taskId: number): Promise<void> => {
    await axiosInstance.delete(`/tasks/${taskId}`);
  },

  getComments: async (taskId: number) => {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/comments`);
    return data;
  },

  addComment: async (taskId: number, contenu: string) => {
    const { data } = await axiosInstance.post(`/tasks/${taskId}/comments`, { contenu });
    return data;
  },

  addColumn: async (): Promise<void> => {
    await axiosInstance.post('/tasks/kanban/columns');
  },
};
