import axios, { AxiosError } from 'axios';
import axiosInstance from './axiosInstance';
import type { ProjectInvitation, ProjectMember, TaskItem } from '../types';
import type { InviteMemberPayload, MemberRole, TeamMember, TeamStats } from '../types/team';

interface TeamStatsResponse {
  activeMembers?: number;
  pendingInvitations?: number;
  assignedTasks?: number;
  completionRate?: number;
}

const normalizeRole = (role: string | null | undefined, owner = false): MemberRole => {
  if (owner) return 'OWNER';
  const normalized = role?.replace('ROLE_', '').toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'VIEWER') return 'VIEWER';
  return 'DEVELOPER';
};

const mapMember = (member: ProjectMember): TeamMember => ({
  id: member.userId,
  userId: member.userId,
  email: member.email,
  nom: member.lastName,
  prenom: member.firstName,
  avatarUrl: member.avatarUrl ?? null,
  role: normalizeRole(member.projectRole ?? member.role, member.owner),
  status: 'ACTIVE',
  tasksCount: 0,
  lastActivity: member.joinedAt,
  invitedAt: null,
});

const mapInvitation = (invitation: ProjectInvitation): TeamMember => ({
  id: -invitation.id,
  userId: invitation.invitedUserId,
  email: invitation.invitedEmail,
  nom: null,
  prenom: null,
  avatarUrl: null,
  role: normalizeRole(invitation.role),
  status: 'INVITED',
  tasksCount: 0,
  lastActivity: null,
  invitedAt: invitation.createdAt,
});

const fetchProjectTasks = async (projectId: number): Promise<TaskItem[]> => {
  const { data } = await axiosInstance.get<TaskItem[]>('/tasks', { params: { projectId } });
  return data;
};

const withTaskCounts = (members: TeamMember[], tasks: TaskItem[]): TeamMember[] => {
  const counts = new Map<number, number>();
  tasks.forEach((task) => {
    if (task.assignedToId == null) return;
    counts.set(task.assignedToId, (counts.get(task.assignedToId) ?? 0) + 1);
  });

  return members.map((member) => ({
    ...member,
    tasksCount: member.userId == null ? 0 : counts.get(member.userId) ?? 0,
  }));
};

const calculateStats = (members: TeamMember[], tasks: TaskItem[]): TeamStats => {
  const assignedTasks = tasks.filter((task) => task.assignedToId != null).length;
  const doneTasks = tasks.filter((task) => task.statut === 'DONE').length;
  return {
    activeMembers: members.filter((member) => member.status === 'ACTIVE').length,
    pendingInvitations: members.filter((member) => member.status === 'INVITED').length,
    assignedTasks,
    completionRate: tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100),
  };
};

const apiMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | string | undefined;
    if (typeof data === 'string') return data;
    return data?.message ?? fallback;
  }
  return fallback;
};

const isUnavailable = (error: unknown): error is AxiosError =>
  axios.isAxiosError(error) && (
    error.response?.status === 404
    || error.response?.status === 403
    || error.response?.status === 405
  );

export const getTeamMembers = async (projectId: number): Promise<TeamMember[]> => {
  const [{ data: members }, tasks] = await Promise.all([
    axiosInstance.get<ProjectMember[]>(`/projects/${projectId}/members`),
    fetchProjectTasks(projectId).catch(() => [] as TaskItem[]),
  ]);

  try {
    const { data: invitations } = await axiosInstance.get<ProjectInvitation[]>(`/projects/${projectId}/invitations/pending`);
    return withTaskCounts([...members.map(mapMember), ...invitations.map(mapInvitation)], tasks);
  } catch (error) {
    if (!isUnavailable(error)) {
      throw new Error(apiMessage(error, 'Impossible de charger les invitations en attente.'));
    }
    return withTaskCounts(members.map(mapMember), tasks);
  }
};

export const getTeamStats = async (projectId: number): Promise<TeamStats> => {
  try {
    const { data } = await axiosInstance.get<TeamStatsResponse>(`/projects/${projectId}/members/stats`);
    return {
      activeMembers: data.activeMembers ?? 0,
      pendingInvitations: data.pendingInvitations ?? 0,
      assignedTasks: data.assignedTasks ?? 0,
      completionRate: data.completionRate ?? 0,
    };
  } catch (error) {
    if (!isUnavailable(error)) {
      throw new Error(apiMessage(error, 'Impossible de charger les statistiques equipe.'));
    }
    const [members, tasks] = await Promise.all([
      getTeamMembers(projectId),
      fetchProjectTasks(projectId).catch(() => [] as TaskItem[]),
    ]);
    return calculateStats(members, tasks);
  }
};

export const inviteMember = async (projectId: number, payload: InviteMemberPayload): Promise<void> => {
  await axiosInstance.post(`/projects/${projectId}/members/invite`, {
    email: payload.email,
    userId: payload.userId,
    role: payload.role,
  });
};

export const updateMemberRole = async (projectId: number, memberId: number, role: MemberRole): Promise<void> => {
  try {
    await axiosInstance.patch(`/projects/${projectId}/members/${memberId}/role`, { role });
  } catch (error) {
    if (isUnavailable(error)) {
      throw new Error('La modification du role n est pas encore disponible cote backend.');
    }
    throw new Error(apiMessage(error, 'Impossible de modifier le role.'));
  }
};

export const removeMember = async (projectId: number, memberId: number): Promise<void> => {
  if (memberId < 0) {
    throw new Error('La suppression d une invitation en attente n est pas encore disponible.');
  }
  await axiosInstance.delete(`/projects/${projectId}/members/${memberId}`);
};

export const resendInvitation = async (projectId: number, memberId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/projects/${projectId}/members/${Math.abs(memberId)}/resend-invitation`);
  } catch (error) {
    if (isUnavailable(error)) {
      throw new Error('Le renvoi d invitation n est pas encore disponible cote backend.');
    }
    throw new Error(apiMessage(error, 'Impossible de renvoyer l invitation.'));
  }
};
