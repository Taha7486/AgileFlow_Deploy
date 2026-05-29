import axiosInstance from './axiosInstance';
import type {
  Branch,
  CreateBranchRequest,
  CreatePullRequestRequest,
  DevelopmentPanelData,
  GitHubCommit,
  GitHubConnectRequest,
  GitHubIntegration,
  GitHubPullRequest,
  ProjectDevelopmentData,
} from '../types/github';

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export const getGitHubIntegration = async (projectId: number): Promise<GitHubIntegration | null> => {
  const response = await axiosInstance.get<GitHubIntegration | ''>(`/github/projects/${projectId}/integration`);
  return response.status === 204 || !response.data ? null : response.data as GitHubIntegration;
};

export const connectGitHub = async (projectId: number, data: GitHubConnectRequest): Promise<GitHubIntegration> => {
  const response = await axiosInstance.post<GitHubIntegration>(`/github/projects/${projectId}/connect`, data);
  return response.data;
};

export const disconnectGitHub = async (projectId: number): Promise<void> => {
  await axiosInstance.delete(`/github/projects/${projectId}/disconnect`);
};

export const syncGitHubIssues = async (projectId: number): Promise<{ synced: number }> => {
  const response = await axiosInstance.post<{ synced: number }>(`/github/projects/${projectId}/sync`);
  return response.data;
};

export const getGitHubPullRequests = async (projectId: number): Promise<GitHubPullRequest[]> => {
  const response = await axiosInstance.get<unknown>(`/github/projects/${projectId}/pull-requests`);
  return asArray<GitHubPullRequest>(response.data);
};

export const getGitHubCommits = async (projectId: number): Promise<GitHubCommit[]> => {
  const response = await axiosInstance.get<unknown>(`/github/projects/${projectId}/commits`);
  return asArray<GitHubCommit>(response.data);
};

export const getTaskCommits = async (taskId: number): Promise<GitHubCommit[]> => {
  const response = await axiosInstance.get<unknown>(`/github/tasks/${taskId}/commits`);
  return asArray<GitHubCommit>(response.data);
};

export const getRepoBranches = async (projectId: number): Promise<string[]> => {
  const response = await axiosInstance.get<unknown>(`/github/projects/${projectId}/branches`);
  return asArray<string>(response.data);
};

export const getProjectDevelopment = async (projectId: number, page = 0, size = 20): Promise<ProjectDevelopmentData> => {
  const response = await axiosInstance.get<ProjectDevelopmentData>(`/github/projects/${projectId}/development`, { params: { page, size } });
  return response.data;
};

export const getTaskDevelopmentPanel = async (taskId: number): Promise<DevelopmentPanelData> => {
  const response = await axiosInstance.get<DevelopmentPanelData>(`/github/tasks/${taskId}/development-panel`);
  return response.data;
};

export const getTaskBranches = async (taskId: number): Promise<Branch[]> => {
  const response = await axiosInstance.get<unknown>(`/github/tasks/${taskId}/branches`);
  return asArray<Branch>(response.data);
};

export const createBranchForTask = async (taskId: number, data: CreateBranchRequest): Promise<Branch> => {
  const response = await axiosInstance.post<Branch>(`/github/tasks/${taskId}/create-branch`, data);
  return response.data;
};

export const createPullRequestForTask = async (taskId: number, data: CreatePullRequestRequest): Promise<GitHubPullRequest> => {
  const response = await axiosInstance.post<GitHubPullRequest>(`/github/tasks/${taskId}/create-pull-request`, data);
  return response.data;
};

export const suggestBranchName = async (taskId: number): Promise<string> => {
  const response = await axiosInstance.get<{ branchName: string }>(`/github/tasks/${taskId}/suggest-branch-name`);
  return response.data.branchName;
};
