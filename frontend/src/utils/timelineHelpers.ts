import { PX_PAR_UNITE, TimelineVue } from '../types/timeline.types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function dateToPixel(dateISO: string, dateMinISO: string, vue: TimelineVue): number {
  const diffDays = (new Date(dateISO).getTime() - new Date(dateMinISO).getTime()) / DAY_MS;
  return Math.round(diffDays * PX_PAR_UNITE[vue]);
}

export function pixelToDate(px: number, dateMinISO: string, vue: TimelineVue): string {
  const diffDays = Math.round(px / PX_PAR_UNITE[vue]);
  const date = new Date(new Date(dateMinISO).getTime() + diffDays * DAY_MS);
  return date.toISOString().split('T')[0];
}

export function dureeEnPixels(dateDebutISO: string, dateFinISO: string, vue: TimelineVue): number {
  const diffDays = (new Date(dateFinISO).getTime() - new Date(dateDebutISO).getTime()) / DAY_MS;
  return Math.max(Math.round(diffDays * PX_PAR_UNITE[vue]), 30);
}

export function largeurGrille(dateMinISO: string, dateMaxISO: string, vue: TimelineVue): number {
  return dureeEnPixels(dateMinISO, dateMaxISO, vue) + 220;
}

export function formatMois(moisStr: string): string {
  const [year, month] = moisStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function formatSemaine(semaineStr: string): string {
  const [year, week] = semaineStr.split('-W').map(Number);
  const date = getDateFromWeek(year, week);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function formatTrimestre(value: string): string {
  return value.replace('-', ' ');
}

export function debutMois(moisStr: string): string {
  return `${moisStr}-01`;
}

export function formatDateFR(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function getVisibleRows(data: import('../types/timeline.types').TimelineData | null, expandedEpics: Set<number>) {
  if (!data) return [];
  const rows: import('../types/timeline.types').TimelineRow[] = [];
  data.epics.forEach((epic) => {
    rows.push({ key: `epic-${epic.id}`, kind: 'epic', epic });
    if (expandedEpics.has(epic.id)) {
      epic.taches.forEach((task) => rows.push({ key: `task-${task.id}`, kind: 'task', task, epic }));
    }
  });
  return rows;
}

function getDateFromWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - jan4.getDay() + 1 + (week - 1) * 7);
  return start;
}
