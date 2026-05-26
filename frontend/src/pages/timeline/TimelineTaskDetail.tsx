import { useMemo, useState } from 'react';
import { ArrowBack, Close } from '@mui/icons-material';
import { Box, Chip, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import { useTimelineStore } from '../../store/timelineStore';
import { STATUT_CONFIG, TYPE_CONFIG } from '../../types/timeline.types';
import type { TimelineStatut, TimelineTask } from '../../types/timeline.types';

interface Props {
  taskId: number;
  onClose: () => void;
}

const findTask = (tasks: TimelineTask[], id: number) => tasks.find((task) => task.id === id) ?? null;

const TimelineTaskDetail = ({ taskId, onClose }: Props) => {
  const { data, updateTaskDates } = useTimelineStore();
  const task = useMemo(() => {
    if (!data) return null;
    const fromEpic = data.epics.flatMap((epic) => epic.taches).find((item) => item.id === taskId);
    return fromEpic ?? findTask(data.tasksWithoutEpic, taskId);
  }, [data, taskId]);
  const [dateDebut, setDateDebut] = useState(task?.dateDebut?.slice(0, 10) ?? '');
  const [dateFin, setDateFin] = useState(task?.dateFin?.slice(0, 10) ?? '');

  if (!task) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ height: 52, borderBottom: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', px: 1 }}>
          <IconButton onClick={onClose}><ArrowBack /></IconButton>
          <Typography>Tache introuvable</Typography>
        </Box>
      </Box>
    );
  }

  const status = STATUT_CONFIG[task.statut] ?? STATUT_CONFIG.TODO;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
      <Box sx={{ height: 52, borderBottom: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', px: 1, gap: 1 }}>
        <IconButton onClick={onClose}><ArrowBack /></IconButton>
        <Typography sx={{ flex: 1, fontSize: 13, color: '#6B778C' }}>Chronologie / PJ-{task.id}</Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={status.labelFR} sx={{ bgcolor: status.bgColor, color: status.textColor, fontWeight: 700 }} />
          <Chip icon={<TaskTypeIcon type={task.typeTache} showTooltip={false} />} label={TYPE_CONFIG[task.typeTache].label} />
        </Stack>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#172B4D', mb: 2 }}>{task.titre}</Typography>
        <Stack spacing={2}>
          <TextField select label="Statut" value={task.statut} disabled>
            {(Object.keys(STATUT_CONFIG) as TimelineStatut[]).map((statut) => <MenuItem key={statut} value={statut}>{STATUT_CONFIG[statut].labelFR}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Date de debut" type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Date de fin" type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
          <Box>
            <Typography sx={{ fontSize: 13, color: '#6B778C', mb: 0.5 }}>Assigne</Typography>
            <Typography>{task.assignee ? `${task.assignee.prenom} ${task.assignee.nom}` : 'Non assigne'}</Typography>
          </Box>
        </Stack>
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #DFE1E6', display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          clickable
          color="primary"
          label="Enregistrer les dates"
          onClick={() => void updateTaskDates(task.id, dateDebut || null, dateFin || null)}
        />
      </Box>
    </Box>
  );
};

export default TimelineTaskDetail;
