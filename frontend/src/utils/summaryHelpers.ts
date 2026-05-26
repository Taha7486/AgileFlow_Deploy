export const STATUT_COULEURS: Record<string, string> = {
  TODO: '#DFE1E6',
  IN_PROGRESS: '#0052CC',
  REVIEW: '#36B37E',
  DONE: '#00875A',
};

export const STATUT_LABELS_FR: Record<string, string> = {
  TODO: 'A faire',
  IN_PROGRESS: 'En cours',
  REVIEW: 'En revision',
  DONE: 'Termine',
};

export function getAvatarColor(email: string): string {
  const colors = ['#0052CC', '#00875A', '#DE350B', '#6B3DC9', '#FF991F', '#00B8D9', '#36B37E', '#6554C0'];
  let hash = 0;
  for (const c of email) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getInitiales(prenom: string, nom: string): string {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
}

export function formatDateRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 30) return `il y a ${days}j`;
  return `il y a ${months} mois`;
}

export function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());
}
