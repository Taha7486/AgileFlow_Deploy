export type TimelineVue = 'SEMAINES' | 'MOIS' | 'TRIMESTRES';
export type TimelineStatut = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TimelineType = 'EPIC' | 'STORY' | 'TASK' | 'FEATURE' | 'BUG' | 'SUBTASK';

export interface TimelineUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  initiales: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

export interface TimelineSprint { id: number; nom: string; statut: string; }
export interface TimelineStory { id: number; titre: string; priorite: string; }
export interface TimelineProject { id: number; nom: string; }

export interface TimelineTask {
  id: number;
  titre: string;
  statut: TimelineStatut;
  priorite: string;
  typeTache: TimelineType;
  dateDebut: string | null;
  dateFin: string | null;
  isUrgent: boolean;
  labels: string[];
  assignee: TimelineUser | null;
  sprint: TimelineSprint | null;
  userStory: TimelineStory | null;
  parentEpicId: number | null;
  commentCount: number;
  aDesDatesDefinies: boolean;
}

export interface TimelineEpic {
  id: number;
  titre: string;
  statut: TimelineStatut;
  priorite: string;
  dateDebut: string | null;
  dateFin: string | null;
  couleur: string;
  assignee: TimelineUser | null;
  taches: TimelineTask[];
  tacheCount: number;
  tachesDoneCount: number;
  estExpanded: boolean;
}

export interface TimelinePeriode {
  dateMin: string;
  dateMax: string;
  dateAujourdhui: string;
  mois: string[];
  semaines: string[];
  trimestres: string[];
}

export interface TimelineData {
  project: TimelineProject;
  epics: TimelineEpic[];
  tasksWithoutEpic: TimelineTask[];
  periode: TimelinePeriode;
  stats: {
    total: number;
    avecDates: number;
    sansDates: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

export interface TimelineFilters {
  projectId: number | null;
  epicId: number | null;
  type: TimelineType | null;
  statut: TimelineStatut | null;
  assigneeId: number | null;
  search: string;
}

export type TimelineRow =
  | { key: string; kind: 'epic'; epic: TimelineEpic }
  | { key: string; kind: 'task'; task: TimelineTask; epic?: TimelineEpic };

export const STATUT_CONFIG: Record<TimelineStatut, { labelFR: string; bgColor: string; textColor: string }> = {
  TODO: { labelFR: 'A FAIRE', bgColor: '#DFE1E6', textColor: '#172B4D' },
  IN_PROGRESS: { labelFR: 'EN COURS', bgColor: '#DEEBFF', textColor: '#0052CC' },
  REVIEW: { labelFR: 'REVUE EN...', bgColor: '#EAE6FF', textColor: '#5E4DB2' },
  DONE: { labelFR: 'TERMINE', bgColor: '#E3FCEF', textColor: '#006644' },
};

export const TYPE_CONFIG: Record<TimelineType, { label: string; color: string; bgColor: string }> = {
  EPIC: { label: 'Epic', color: '#6B3DC9', bgColor: '#F0EBFF' },
  STORY: { label: 'Story', color: '#0052CC', bgColor: '#DEEBFF' },
  TASK: { label: 'Tache', color: '#36B37E', bgColor: '#E3FCEF' },
  FEATURE: { label: 'Feat.', color: '#00875A', bgColor: '#E3FCEF' },
  BUG: { label: 'Bug', color: '#DE350B', bgColor: '#FFEBE6' },
  SUBTASK: { label: 'Sub.', color: '#6B778C', bgColor: '#F4F5F7' },
};

export const PX_PAR_UNITE: Record<TimelineVue, number> = {
  SEMAINES: 40,
  MOIS: 14,
  TRIMESTRES: 5,
};
