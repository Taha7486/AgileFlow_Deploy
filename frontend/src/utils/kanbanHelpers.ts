export function getLabelColor(label: string): { bg: string; text: string } {
  const palettes = [
    { bg: '#EAE6FF', text: '#5E4DB2' },
    { bg: '#DEEBFF', text: '#0052CC' },
    { bg: '#E3FCEF', text: '#006644' },
    { bg: '#FFEBE6', text: '#BF2600' },
    { bg: '#FFF0B3', text: '#172B4D' },
    { bg: '#E6FCFF', text: '#006878' },
  ];
  let hash = 0;
  for (const c of label) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

export function formatDateFR(iso: string | null): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function isOverdue(dateEcheance: string | null): boolean {
  return Boolean(dateEcheance && new Date(dateEcheance) < new Date());
}
