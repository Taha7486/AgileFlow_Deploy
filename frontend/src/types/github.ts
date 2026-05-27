export interface GitHubIntegration {
  id: number;
  projectId: number;
  repoOwner: string;
  repoName: string;
  syncIssues: boolean;
  syncPrs: boolean;
  syncCommits: boolean;
  lastSyncedAt: string | null;
  active: boolean;
}

export interface GitHubConnectRequest {
  repoOwner: string;
  repoName: string;
  accessToken: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  htmlUrl: string;
  assigneeLogin: string | null;
  labels: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  htmlUrl: string;
  url: string;
  headBranch: string;
  baseBranch: string;
  authorLogin: string;
  authorAvatarUrl: string;
  merged: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  checksStatus: 'success' | 'failure' | 'pending' | 'unknown';
  linkedTaskId: number | null;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorLogin: string;
  authorAvatarUrl: string;
  htmlUrl: string;
  url: string;
  committedAt: string | null;
  mentionedTaskIds: number[];
  linkedTaskId: number | null;
}

export type PullRequest = GitHubPullRequest;
export type Commit = GitHubCommit;

export interface Branch {
  name: string;
  sha: string;
  taskId: number | null;
  createdAt: string | null;
}

export interface CreateBranchRequest {
  branchName: string;
  fromBranch: string;
}

export interface DevelopmentPanelData {
  taskId: number;
  taskTitre: string;
  taskStatut: string;
  branches: Branch[];
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
}

export interface ProjectDevelopmentData {
  projectId: number;
  repoFullName: string | null;
  connected: boolean;
  openPullRequests: GitHubPullRequest[];
  mergedPullRequests: GitHubPullRequest[];
  activeBranches: Branch[];
  recentCommits: GitHubCommit[];
  totalOpenPRs: number;
  totalMergedPRs: number;
  totalBranches: number;
  failingChecks: number;
  page: number;
  size: number;
  totalPages: number;
}
