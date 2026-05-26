import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { fetchProjectMembers } from '../../api/projectsApi';
import { kanbanApi } from '../../api/kanbanApi';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useKanbanStore } from '../../store/kanbanStore';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import type { ProjectMember } from '../../types';
import { COLUMN_CONFIG, PRIORITE_CONFIG, TYPE_CONFIG } from '../../types/kanban.types';
import type { KanbanPriorite, KanbanStatut, KanbanTypeTache } from '../../types/kanban.types';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStatut: KanbanStatut;
}

const ISSUE_TYPES: KanbanTypeTache[] = ['EPIC', 'STORY', 'TASK', 'FEATURE', 'BUG'];
const PRIORITES = Object.keys(PRIORITE_CONFIG) as KanbanPriorite[];
const STATUTS = Object.keys(COLUMN_CONFIG) as KanbanStatut[];

const CreateTaskModal = ({ open, onClose, defaultStatut }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { addTask, loadBoard } = useKanbanStore();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [typeTache, setTypeTache] = useState<KanbanTypeTache>('TASK');
  const [statut, setStatut] = useState<KanbanStatut>(defaultStatut);
  const [priorite, setPriorite] = useState<KanbanPriorite>('MEDIUM');
  const [assignee, setAssignee] = useState<ProjectMember | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitre('');
    setDescription('');
    setTypeTache('TASK');
    setStatut(defaultStatut);
    setPriorite('MEDIUM');
    setAssignee(null);
    if (activeProject?.id) {
      void fetchProjectMembers(activeProject.id).then(setMembers).catch(() => setMembers([]));
    }
  }, [activeProject?.id, defaultStatut, open]);

  const submit = async () => {
    if (!activeProject?.id || !titre.trim()) return;
    setSaving(true);
    try {
      const created = await kanbanApi.quickCreate({
        titre: titre.trim(),
        description: description.trim() || undefined,
        statut,
        projectId: activeProject.id,
        typeTache,
        priorite,
        assigneeId: assignee?.userId ?? null,
      });
      addTask(created);
      await loadBoard();
      if (createAnother) {
        setTitre('');
        setDescription('');
        setAssignee(null);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0 }}>
        <Typography fontWeight={700}>Creer une tache</Typography>
        <IconButton onClick={onClose} disabled={saving}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={typeTache}
            onChange={(_, value: KanbanTypeTache | null) => value && setTypeTache(value)}
          >
            {ISSUE_TYPES.map((type) => (
              <ToggleButton key={type} value={type} sx={{ gap: 0.75 }}>
                <TaskTypeIcon type={type} showTooltip={false} />
                {TYPE_CONFIG[type].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField autoFocus required label="Titre" placeholder="Resume de la tache..." value={titre} onChange={(event) => setTitre(event.target.value)} fullWidth />
          <TextField label="Description" placeholder="Ajouter une description..." value={description} onChange={(event) => setDescription(event.target.value)} multiline minRows={3} fullWidth />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <Select value={statut} onChange={(event) => setStatut(event.target.value as KanbanStatut)}>
                {STATUTS.map((item) => <MenuItem key={item} value={item}>{COLUMN_CONFIG[item].labelFR}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <Select value={priorite} onChange={(event) => setPriorite(event.target.value as KanbanPriorite)}>
                {PRIORITES.map((item) => <MenuItem key={item} value={item}>{PRIORITE_CONFIG[item].label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Autocomplete
            options={members}
            value={assignee}
            onChange={(_, value) => setAssignee(value)}
            getOptionLabel={(member) => `${member.firstName} ${member.lastName}`}
            renderOption={(props, member) => (
              <Box component="li" {...props}>
                {member.firstName} {member.lastName} - {member.email}
              </Box>
            )}
            renderInput={(params) => <TextField {...params} label="Assigne" placeholder="Non assigne" />}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <FormControlLabel control={<Checkbox checked={createAnother} onChange={(event) => setCreateAnother(event.target.checked)} />} label="Creer une autre" />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>Annuler</Button>
          <Button variant="contained" onClick={() => void submit()} disabled={saving || !titre.trim()}>Creer</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskModal;
