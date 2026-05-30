export type KanbanStatut = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type KanbanPriorite = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type KanbanTypeTache = 'EPIC' | 'STORY' | 'TASK' | 'FEATURE' | 'BUG' | 'SUBTASK';

export interface KanbanUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  initiales: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export interface KanbanSprint { id: number; nom: string; statut: string; }
export interface KanbanStory { id: number; titre: string; priorite: string; }
export interface KanbanProject { id: number; nom: string; issuePrefix?: string; }

export interface KanbanTask {
  id: number;
  titre: string;
  description: string | null;
  statut: KanbanStatut;
  priorite: KanbanPriorite;
  isUrgent: boolean;
  dateEcheance: string | null;
  labels: string[];
  assignee: KanbanUser | null;
  reporter: KanbanUser | null;
  sprint: KanbanSprint | null;
  userStory: KanbanStory | null;
  project: KanbanProject | null;
  typeTache: KanbanTypeTache;
  parentTaskId: number | null;
  parentTaskTitre: string | null;
  epicTitre: string | null;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  githubPrNumber: number | null;
  githubPrUrl: string | null;
  commentCount: number;
  sousTaskeCount: number;
  sousTaskesDoneCount: number;
  dateCreation: string | null;
  dateMiseAJour: string | null;
  updatedAgo: string;
}

export interface KanbanColumn {
  statut: KanbanStatut;
  labelFR: string;
  count: number;
  tasks: KanbanTask[];
}

export interface KanbanStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  urgent: number;
  overdue: number;
}

export interface KanbanBoardData {
  project: KanbanProject;
  sprint: KanbanSprint | null;
  columns: KanbanColumn[];
  stats: KanbanStats;
}

export interface KanbanFilters {
  projectId: number | null;
  sprintId: number | null;
  assigneeId: number | null;
  search: string;
  priorite: KanbanPriorite | null;
}

export interface QuickCreateRequest {
  titre: string;
  description?: string;
  statut: KanbanStatut;
  projectId: number;
  sprintId?: number | null;
  typeTache: KanbanTypeTache;
  priorite: KanbanPriorite;
  assigneeId?: number | null;
}

export interface KanbanUpdateMessage {
  type: 'TASK_MOVED' | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED';
  task: KanbanTask;
  fromStatut?: KanbanStatut;
  toStatut?: KanbanStatut;
}

export const COLUMN_CONFIG: Record<KanbanStatut, {
  labelFR: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  TODO: { labelFR: 'A FAIRE', color: '#DFE1E6', bgColor: '#F4F5F7', textColor: '#172B4D' },
  IN_PROGRESS: { labelFR: 'EN COURS', color: '#DEEBFF', bgColor: '#E9F2FF', textColor: '#0052CC' },
  REVIEW: { labelFR: 'REVUE EN COURS', color: '#EAE6FF', bgColor: '#F3F0FF', textColor: '#5E4DB2' },
  DONE: { labelFR: 'TERMINE', color: '#E3FCEF', bgColor: '#F0FFF4', textColor: '#006644' },
};

export const TYPE_CONFIG: Record<KanbanTypeTache, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  EPIC: { label: 'Epic', color: '#6B3DC9', bgColor: '#F0EBFF' },
  STORY: { label: 'Story', color: '#2E7D32', bgColor: '#E8F5E9' },
  TASK: { label: 'Tache', color: '#1976D2', bgColor: '#E3F2FD' },
  FEATURE: { label: 'Fonctionnalite', color: '#F57C00', bgColor: '#FFF3E0' },
  BUG: { label: 'Bug', color: '#C62828', bgColor: '#FFEBEE' },
  SUBTASK: { label: 'Sous-tache', color: '#455A64', bgColor: '#ECEFF1' },
};

export const PRIORITE_CONFIG: Record<KanbanPriorite, { label: string; color: string }> = {
  LOW: { label: 'Basse', color: '#6B778C' },
  MEDIUM: { label: 'Moyenne', color: '#0052CC' },
  HIGH: { label: 'Haute', color: '#FF991F' },
  CRITICAL: { label: 'Critique', color: '#DE350B' },
};
