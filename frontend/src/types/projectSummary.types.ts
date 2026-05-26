export interface StatusSegment {
  statut: string;
  labelFR: string;
  count: number;
  pourcentage: number;
  couleur: string;
}

export interface StatusOverview {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  segments: StatusSegment[];
}

export interface KpiStats {
  completed: number;
  updated: number;
  created: number;
  dueSoon: number;
  periodeDays: number;
}

export interface PriorityBreakdown {
  highest: number;
  high: number;
  medium: number;
  low: number;
  lowest: number;
}

export interface TypesOfWork {
  story: number;
  epic: number;
  task: number;
  feature: number;
  bug: number;
  subtask: number;
  total: number;
}

export interface WorkloadItem {
  userId: number;
  nom: string;
  prenom: string;
  initiales: string;
  avatarColor: string;
  tachesAssignees: number;
  pourcentage: number;
}

export interface EpicProgress {
  epicId: number;
  titre: string;
  statut: string;
  couleur: string;
  tachesTotal: number;
  tachesDone: number;
  pourcentage: number;
}

export interface ActivityItem {
  userId: number | null;
  userName: string;
  userInitiales: string;
  userAvatarColor: string;
  action: string;
  fieldName: string;
  preposition: string;
  taskId: number | null;
  taskTitre: string;
  taskStatut: string | null;
  taskTypeTache: string | null;
  dateRelative: string;
  dateISO: string | null;
}

export interface ActivityGroup {
  dateLabel: string;
  dateISO: string;
  items: ActivityItem[];
}

export interface ProjectSummaryData {
  project: { id: number; nom: string; statut: string };
  kpi: KpiStats;
  statusOverview: StatusOverview;
  priorityBreakdown: PriorityBreakdown;
  typesOfWork: TypesOfWork;
  teamWorkload: WorkloadItem[];
  epicProgress: EpicProgress[];
  recentActivity: ActivityGroup[];
}

export interface DonutDataPoint {
  name: string;
  value: number;
  couleur: string;
  labelFR: string;
}

export interface BarDataPoint {
  name: string;
  nameEN: string;
  value: number;
  couleur: string;
  icone: string;
}
