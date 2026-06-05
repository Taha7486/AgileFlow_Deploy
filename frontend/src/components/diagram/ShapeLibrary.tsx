import { useMemo, useState } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { AccountTree, Category, Class, DeviceHub, Notes, RadioButtonChecked, Schema, Square, Timeline } from '@mui/icons-material';

export interface ShapeDefinition {
  type: string;
  label: string;
  defaultLabel?: string;
  icon: JSX.Element;
  width: number;
  height: number;
}

export const SHAPES: ShapeDefinition[] = [
  { type: 'actor', label: 'Acteur', icon: <AccountTree />, width: 90, height: 120 },
  { type: 'useCase', label: 'Use case', icon: <RadioButtonChecked />, width: 170, height: 80 },
  { type: 'systemBoundary', label: 'Systeme', icon: <Schema />, width: 420, height: 260 },
  { type: 'class', label: 'Classe UML', icon: <Class />, width: 220, height: 170 },
  { type: 'lifeline', label: 'Lifeline', icon: <Timeline />, width: 140, height: 420 },
  { type: 'sequenceFrame', label: 'Cadre sequence', defaultLabel: 'opt', icon: <Schema />, width: 460, height: 240 },
  { type: 'activity', label: 'Activite', icon: <Square />, width: 170, height: 70 },
  { type: 'decision', label: 'Decision', icon: <DeviceHub />, width: 120, height: 120 },
  { type: 'start', label: 'Depart', icon: <RadioButtonChecked />, width: 44, height: 44 },
  { type: 'end', label: 'Fin', icon: <RadioButtonChecked />, width: 44, height: 44 },
  { type: 'component', label: 'Composant', icon: <Category />, width: 180, height: 90 },
  { type: 'nodeBox', label: 'Noeud 3D', icon: <Schema />, width: 190, height: 110 },
  { type: 'artifact', label: 'Artifact', icon: <Notes />, width: 160, height: 80 },
  { type: 'note', label: 'Note', icon: <Notes />, width: 170, height: 90 },
  { type: 'rectangle', label: 'Rectangle', icon: <Square />, width: 160, height: 72 },
];

const dragPreviewSvg = (shape: ShapeDefinition) => {
  const stroke = '#2563eb';
  const fill = shape.type === 'note' ? '#fef9c3' : '#ffffff';
  const muted = '#94a3b8';

  if (shape.type === 'actor') {
    return `
      <svg width="96" height="120" viewBox="0 0 96 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="48" cy="22" r="14" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <path d="M48 36v38M22 50h52M48 74 24 104M48 74l24 30" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (shape.type === 'useCase') {
    return `
      <svg width="170" height="82" viewBox="0 0 170 82" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="6" width="162" height="70" rx="35" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      </svg>
    `;
  }

  if (shape.type === 'decision') {
    return `
      <svg width="122" height="122" viewBox="0 0 122 122" xmlns="http://www.w3.org/2000/svg">
        <path d="M61 5 117 61 61 117 5 61Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      </svg>
    `;
  }

  if (shape.type === 'start' || shape.type === 'end') {
    const inner = shape.type === 'end' ? `<circle cx="30" cy="30" r="19" fill="none" stroke="#111827" stroke-width="3"/>` : '';
    return `
      <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="22" fill="${shape.type === 'start' ? '#111827' : fill}" stroke="#111827" stroke-width="4"/>
        ${inner}
      </svg>
    `;
  }

  if (shape.type === 'lifeline') {
    return `
      <svg width="120" height="170" viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="8" width="84" height="38" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <path d="M60 48v112" stroke="${muted}" stroke-width="3" stroke-dasharray="7 7"/>
        <rect x="54" y="82" width="12" height="52" fill="#bfdbfe" stroke="${stroke}" stroke-width="2"/>
      </svg>
    `;
  }

  if (shape.type === 'class') {
    return `
      <svg width="180" height="135" viewBox="0 0 180 135" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="172" height="127" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <rect x="4" y="4" width="172" height="34" rx="6" fill="${stroke}"/>
        <path d="M4 72h172M46 48h88M34 84h112M34 102h92" stroke="${muted}" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (shape.type === 'systemBoundary') {
    return `
      <svg width="190" height="120" viewBox="0 0 190 120" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="180" height="110" rx="8" fill="rgba(255,255,255,.72)" stroke="${stroke}" stroke-width="4" stroke-dasharray="9 7"/>
      </svg>
    `;
  }

  if (shape.type === 'sequenceFrame') {
    return `
      <svg width="190" height="115" viewBox="0 0 190 115" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h182v107H4Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
        <path d="M4 4h64v22l-14 14H4Z" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="miter"/>
      </svg>
    `;
  }

  const radius = shape.type === 'activity' ? 999 : 7;
  return `
    <svg width="160" height="82" viewBox="0 0 160 82" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="152" height="70" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      ${shape.type === 'component' ? '<path d="M22 24h22v34H22zM16 30h12M16 50h12" fill="none" stroke="#94a3b8" stroke-width="4"/>' : ''}
      ${shape.type === 'nodeBox' ? '<path d="M38 20h74l24 18v30H62L38 50Z M62 68V38L38 20 M62 38h74" fill="none" stroke="#94a3b8" stroke-width="4"/>' : ''}
      ${shape.type === 'artifact' ? '<path d="M50 18h44l16 16v30H50z M94 18v16h16" fill="none" stroke="#94a3b8" stroke-width="4"/>' : ''}
    </svg>
  `;
};

const createDragPreview = (shape: ShapeDefinition) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = dragPreviewSvg(shape);
  wrapper.style.position = 'fixed';
  wrapper.style.top = '-240px';
  wrapper.style.left = '-240px';
  wrapper.style.padding = '10px';
  wrapper.style.borderRadius = '12px';
  wrapper.style.background = 'rgba(255,255,255,0.92)';
  wrapper.style.border = '1px solid rgba(37,99,235,0.18)';
  wrapper.style.boxShadow = '0 18px 45px rgba(15,23,42,0.18)';
  wrapper.style.pointerEvents = 'none';
  document.body.appendChild(wrapper);
  return wrapper;
};

interface ShapeLibraryProps {
  selectedShape: string | null;
  onSelectShape: (shape: ShapeDefinition) => void;
}

export const ShapeLibrary = ({ selectedShape, onSelectShape }: ShapeLibraryProps) => {
  const [query, setQuery] = useState('');
  const filteredShapes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return SHAPES;
    return SHAPES.filter((shape) => (
      shape.label.toLowerCase().includes(normalizedQuery)
      || shape.type.toLowerCase().includes(normalizedQuery)
    ));
  }, [query]);

  return (
    <Box sx={{ width: 220, flexShrink: 0, alignSelf: 'stretch', bgcolor: 'grey.900', color: 'white', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Bibliotheque</Typography>
        <TextField
          size="small"
          placeholder="Rechercher..."
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{ sx: { bgcolor: 'grey.800', color: 'white', '& fieldset': { borderColor: 'grey.700' } } }}
        />
      </Box>
      <Divider sx={{ borderColor: 'grey.700' }} />
      <Stack sx={{ p: 1.5, overflow: 'auto', flex: 1, minHeight: 0 }} spacing={1}>
        {filteredShapes.map((shape) => (
          <Button
            key={shape.type}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/agileflow-shape', JSON.stringify(shape));
              event.dataTransfer.effectAllowed = 'move';
              const preview = createDragPreview(shape);
              event.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
              window.setTimeout(() => preview.remove(), 0);
            }}
            onClick={() => onSelectShape(shape)}
            startIcon={shape.icon}
            variant={selectedShape === shape.type ? 'contained' : 'text'}
            sx={{ justifyContent: 'flex-start', color: selectedShape === shape.type ? 'white' : 'grey.200', '&:hover': { bgcolor: 'grey.800' } }}
          >
            {shape.label}
          </Button>
        ))}
        {filteredShapes.length === 0 && (
          <Typography variant="caption" sx={{ color: 'grey.400', px: 1 }}>
            Aucune forme trouvee.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
