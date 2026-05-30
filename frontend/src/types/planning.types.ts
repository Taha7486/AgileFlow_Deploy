export type TaskStatut = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriorite = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskIssueType = 'EPIC' | 'TASK' | 'STORY' | 'FEATURE' | 'BUG';
export type TypeTache = 'EPIC' | 'STORY' | 'TASK' | 'FEATURE' | 'BUG' | 'SUBTASK';
export type GroupByOption = 'STORY' | 'ASSIGNEE' | 'STATUT' | 'NONE';
export type SortByOption = 'dateCreation' | 'dateMiseAJour' | 'priorite' | 'statut' | 'dateEcheance' | 'titre';

export interface UserSummary {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  initiales: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export interface StorySummary { id: number; titre: string; priorite: string; }
export interface ProjectSummary { id: number; nom: string; issuePrefix?: string; }

export interface PlanningTask {
  id: number;
  titre: string;
  description: string | null;
  type: TaskIssueType;
  statut: TaskStatut;
  priorite: TaskPriorite;
  isUrgent: boolean;
  dateEcheance: string | null;
  dateCreation: string | null;
  dateMiseAJour: string | null;
  labels: string[];
  assignee: UserSummary | null;
  reporter: UserSummary | null;
  userStory: StorySummary | null;
  project: ProjectSummary | null;
  commentCount: number;
  subtaskCount: number;
  updatedAgo: string;
  typeTache: TypeTache;
  parentTaskId: number | null;
  parentTaskTitre: string | null;
  sousTaskes: PlanningTask[];
  sousTaskeCount: number;
  sousTaskesDoneCount: number;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  githubPrNumber: number | null;
  githubPrUrl: string | null;
}

export interface PlanningGroup {
  groupKey: string;
  groupLabel: string;
  groupType: GroupByOption;
  tasks: PlanningTask[];
  taskCount: number;
  doneCount: number;
}

export interface PlanningStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  urgent: number;
  overdue: number;
}

export interface PlanningPageResponse {
  groups: PlanningGroup[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  stats: PlanningStats;
}

export interface PlanningFilters {
  projectId: number | null;
  statut: TaskStatut | null;
  priorite: TaskPriorite | null;
  assigneeId: number | null;
  search: string;
  groupBy: GroupByOption;
  sortBy: SortByOption;
  sortDir: 'ASC' | 'DESC';
}

export interface SavedView {
  id: number;
  nom: string;
  filtersJson: string;
}

export interface BulkActionRequest {
  action: 'UPDATE_STATUS' | 'UPDATE_PRIORITY' | 'ASSIGN' | 'DELETE';
  taskIds: number[];
  value?: string;
  assigneeId?: number;
}

export interface CreateSubtaskRequest {
  titre: string;
  typeTache: TypeTache;
  description?: string;
  assigneeId?: number;
  priorite?: string;
}

export const ALLOWED_CHILD_TYPES: Record<TypeTache, TypeTache[]> = {
  EPIC:    ['STORY', 'TASK', 'FEATURE', 'BUG'],
  STORY:   ['TASK', 'BUG', 'FEATURE'],
  TASK:    ['SUBTASK'],
  FEATURE: ['SUBTASK'],
  BUG:     ['SUBTASK'],
  SUBTASK: [],
};

export const TYPE_CONFIG: Record<TypeTache, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  EPIC:    { label: 'Épique',       color: '#6B3DC9', bgColor: '#F0EBFF', icon: 'FlashOn' },
  STORY:   { label: 'Story',        color: '#2E7D32', bgColor: '#E8F5E9', icon: 'Bookmark' },
  TASK:    { label: 'Tâche',        color: '#1976D2', bgColor: '#E3F2FD', icon: 'CheckBox' },
  FEATURE: { label: 'Fonctionnalité', color: '#F57C00', bgColor: '#FFF3E0', icon: 'Star' },
  BUG:     { label: 'Bug',          color: '#C62828', bgColor: '#FFEBEE', icon: 'BugReport' },
  SUBTASK: { label: 'Sous-tâche',   color: '#455A64', bgColor: '#ECEFF1', icon: 'SubdirectoryArrowRight' },
};
