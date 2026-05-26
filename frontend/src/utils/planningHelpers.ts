import type { TaskIssueType, TaskPriorite, TaskStatut } from '../types/planning.types';

export const STATUT_CONFIG: Record<TaskStatut, { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  TODO: { label: 'A faire', color: 'default' },
  IN_PROGRESS: { label: 'En cours', color: 'info' },
  REVIEW: { label: 'Revision', color: 'warning' },
  DONE: { label: 'Termine', color: 'success' },
};

export const PRIORITE_CONFIG: Record<TaskPriorite, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Basse', color: '#6B778C', bgColor: '#F4F5F7' },
  MEDIUM: { label: 'Moyenne', color: '#0052CC', bgColor: '#DEEBFF' },
  HIGH: { label: 'Haute', color: '#E65100', bgColor: '#FFF3E0' },
  CRITICAL: { label: 'Critique', color: '#B71C1C', bgColor: '#FFEBEE' },
};

export const ISSUE_TYPE_CONFIG: Record<TaskIssueType, { label: string; color: string; bgColor: string }> = {
  EPIC: { label: 'Epic', color: '#6B3DC9', bgColor: '#F0EBFF' },
  STORY: { label: 'Story', color: '#2E7D32', bgColor: '#E8F5E9' },
  TASK: { label: 'Tache', color: '#1976D2', bgColor: '#E3F2FD' },
  FEATURE: { label: 'Fonctionnalite', color: '#F57C00', bgColor: '#FFF3E0' },
  BUG: { label: 'Bug', color: '#C62828', bgColor: '#FFEBEE' },
};

export const COLUMN_LABELS: Record<string, string> = {
  titre: 'Tache',
  assignee: 'Assigne',
  reporter: 'Assignee par',
  priorite: 'Priorite',
  statut: 'Statut',
  dateEcheance: 'Echeance',
  dateMiseAJour: 'Mis a jour',
};

export function formatDateFR(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export function isOverdue(dateEcheance: string | null): boolean {
  if (!dateEcheance) return false;
  return new Date(dateEcheance) < new Date();
}

export function userFullName(user: { prenom?: string; nom?: string; email?: string } | null): string {
  if (!user) return 'Non assigne';
  const name = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
  return name || user.email || 'Utilisateur';
}
