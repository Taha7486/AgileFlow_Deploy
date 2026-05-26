import axiosInstance from './axiosInstance';
import type { InvitationResult, UserSearchResult } from '../types';

export const searchUsers = async (q: string, projectId: number) => {
  const { data } = await axiosInstance.get<UserSearchResult[]>('/users/search', { params: { q, projectId } });
  return data;
};

export const inviteToProject = async (projectId: number, email: string, role = 'ROLE_DEVELOPER') => {
  const { data } = await axiosInstance.post<{ status: InvitationResult['status']; message: string }>(
    `/projects/${projectId}/invite`,
    { email, projectId, role },
  );
  return data;
};

export const validateInvitationToken = async (token: string) => {
  const { data } = await axiosInstance.get<{ email: string; projectId: number; projectName: string }>('/invitations/validate', {
    params: { token },
  });
  return data;
};
