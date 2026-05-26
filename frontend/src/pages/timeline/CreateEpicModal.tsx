import { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTimelineStore } from '../../store/timelineStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
}

const COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const CreateEpicModal = ({ open, onClose, projectId }: Props) => {
  const createEpic = useTimelineStore((state) => state.createEpic);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [couleur, setCouleur] = useState(COLORS[0]);

  const submit = async () => {
    if (!titre.trim()) return;
    await createEpic({
      titre: titre.trim(),
      description: description.trim() || undefined,
      projectId,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      couleur,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Creer un epic
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField autoFocus required label="Titre" value={titre} onChange={(event) => setTitre(event.target.value)} />
          <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <TextField label="Date de debut" type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Date de fin" type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Couleur</Typography>
            <Stack direction="row" spacing={1}>
              {COLORS.map((color) => (
                <Box key={color} onClick={() => setCouleur(color)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: color, cursor: 'pointer', outline: couleur === color ? `3px solid ${color}55` : 'none', transform: couleur === color ? 'scale(1.12)' : 'scale(1)' }} />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!titre.trim()} onClick={() => void submit()}>Creer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEpicModal;
