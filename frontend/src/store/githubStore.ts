import { create } from 'zustand';
import type { AxiosError } from 'axios';
import {
  createBranchForTask,
  createPullRequestForTask,
  connectGitHub,
  disconnectGitHub,
  getGitHubCommits,
  getGitHubIntegration,
  getProjectDevelopment,
  getGitHubPullRequests,
  getTaskDevelopmentPanel,
  syncGitHubIssues,
} from '../api/github';
import type { Branch, DevelopmentPanelData, GitHubCommit, GitHubConnectRequest, GitHubIntegration, GitHubPullRequest, ProjectDevelopmentData } from '../types/github';

interface GitHubState {
  integration: GitHubIntegration | null;
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
  projectDevelopment: ProjectDevelopmentData | null;
  taskDevelopmentPanel: Record<number, DevelopmentPanelData>;
  loading: boolean;
  error: string | null;
  isLoadingDevelopment: boolean;
  developmentError: string | null;
  fetchIntegration: (projectId: number) => Promise<void>;
  connect: (projectId: number, data: GitHubConnectRequest) => Promise<void>;
  disconnect: (projectId: number) => Promise<void>;
  sync: (projectId: number) => Promise<void>;
  fetchPullRequests: (projectId: number) => Promise<void>;
  fetchCommits: (projectId: number) => Promise<void>;
  fetchProjectDevelopment: (projectId: number, page?: number) => Promise<void>;
  fetchTaskDevelopmentPanel: (taskId: number) => Promise<void>;
  createBranch: (taskId: number, branchName: string, fromBranch: string) => Promise<Branch>;
  createPullRequest: (taskId: number, title: string, body: string, headBranch: string, baseBranch: string) => Promise<GitHubPullRequest>;
  clearDevelopment: () => void;
}

const getErrorMessage = (error: unknown) => {
  const axiosError = error as AxiosError<{ message?: string }>;
  if (axiosError.response?.data?.message) return axiosError.response.data.message;
  if (axiosError.response?.status === 404) {
    return "Integration GitHub introuvable, endpoint backend non charge, ou depot GitHub inaccessible.";
  }
  return error instanceof Error ? error.message : 'Erreur GitHub';
};

export const useGitHubStore = create<GitHubState>((set, get) => ({
  integration: null,
  pullRequests: [],
  commits: [],
  projectDevelopment: null,
  taskDevelopmentPanel: {},
  loading: false,
  error: null,
  isLoadingDevelopment: false,
  developmentError: null,

  fetchIntegration: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const integration = await getGitHubIntegration(projectId);
      set({ integration, loading: false });
    } catch (error) {
      set({ integration: null, loading: false, error: getErrorMessage(error) });
    }
  },

  connect: async (projectId, data) => {
    set({ loading: true, error: null });
    try {
      const integration = await connectGitHub(projectId, data);
      set({ integration, loading: false });
      await Promise.all([get().fetchPullRequests(projectId), get().fetchCommits(projectId)]);
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  disconnect: async (projectId) => {
    set({ loading: true, error: null });
    try {
      await disconnectGitHub(projectId);
      set({ integration: null, pullRequests: [], commits: [], loading: false });
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  sync: async (projectId) => {
    set({ loading: true, error: null });
    try {
      await syncGitHubIssues(projectId);
      await get().fetchIntegration(projectId);
      set({ loading: false });
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  fetchPullRequests: async (projectId) => {
    try {
      const pullRequests = await getGitHubPullRequests(projectId);
      set({ pullRequests: Array.isArray(pullRequests) ? pullRequests : [] });
    } catch {
      set({ pullRequests: [] });
    }
  },

  fetchCommits: async (projectId) => {
    try {
      const commits = await getGitHubCommits(projectId);
      set({ commits: Array.isArray(commits) ? commits : [] });
    } catch {
      set({ commits: [] });
    }
  },

  fetchProjectDevelopment: async (projectId, page = 0) => {
    set({ isLoadingDevelopment: true, developmentError: null });
    try {
      const data = await getProjectDevelopment(projectId, page);
      set({ projectDevelopment: data, isLoadingDevelopment: false });
    } catch (error) {
      set({ projectDevelopment: null, isLoadingDevelopment: false, developmentError: getErrorMessage(error) });
    }
  },

  fetchTaskDevelopmentPanel: async (taskId) => {
    try {
      const data = await getTaskDevelopmentPanel(taskId);
      set((state) => ({
        taskDevelopmentPanel: { ...state.taskDevelopmentPanel, [taskId]: data },
      }));
    } catch {
      set((state) => {
        const next = { ...state.taskDevelopmentPanel };
        delete next[taskId];
        return { taskDevelopmentPanel: next };
      });
    }
  },

  createBranch: async (taskId, branchName, fromBranch) => {
    const branch = await createBranchForTask(taskId, { branchName, fromBranch });
    set((state) => {
      const next = { ...state.taskDevelopmentPanel };
      delete next[taskId];
      return { taskDevelopmentPanel: next, projectDevelopment: null };
    });
    return branch;
  },

  createPullRequest: async (taskId, title, body, headBranch, baseBranch) => {
    const pullRequest = await createPullRequestForTask(taskId, { title, body, headBranch, baseBranch });
    set((state) => {
      const next = { ...state.taskDevelopmentPanel };
      delete next[taskId];
      return { taskDevelopmentPanel: next, projectDevelopment: null };
    });
    return pullRequest;
  },

  clearDevelopment: () => set({ projectDevelopment: null, taskDevelopmentPanel: {}, developmentError: null }),
}));
