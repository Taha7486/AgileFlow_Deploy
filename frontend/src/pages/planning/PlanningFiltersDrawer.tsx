import { useEffect, useState } from 'react';
import { Close } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { api } from '../../api/axiosInterceptor';
import { DEFAULT_PLANNING_FILTERS, GROUP_LABELS, usePlanningStore } from '../../store/planningStore';
import type { GroupByOption, SortByOption, TaskPriorite, TaskStatut } from '../../types/planning.types';
import { PRIORITE_CONFIG, STATUT_CONFIG } from '../../utils/planningHelpers';

interface Props {
  onClose: () => void;
}

interface UserOption {
  id: number;
  label: string;
}

const normalizeUser = (item: any): UserOption => ({
  id: item.id,
  label: `${item.firstName ?? item.prenom ?? ''} ${item.lastName ?? item.nom ?? ''}`.trim() || item.email,
});

const PlanningFiltersDrawer = ({ onClose }: Props) => {
  const { filters, applyFiltersAndReload, resetFilters } = usePlanningStore();
  const [draft, setDraft] = useState(filters);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    void api.get('/users').then((res) => setUsers((res.data ?? []).map(normalizeUser))).catch(() => setUsers([]));
  }, []);

  return (
    <Box sx={{ width: 360, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={800}>Filtres avances</Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>
      <Divider />
      <Stack spacing={2} sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <TextField
          size="small"
          label="Recherche"
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
        />
        <FormControl size="small" fullWidth>
          <Select displayEmpty value={draft.statut ?? ''} onChange={(e) => setDraft({ ...draft, statut: (e.target.value || null) as TaskStatut | null })}>
            <MenuItem value="">Tous les statuts</MenuItem>
            {(Object.keys(STATUT_CONFIG) as TaskStatut[]).map((status) => <MenuItem key={status} value={status}>{STATUT_CONFIG[status].label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <Select displayEmpty value={draft.priorite ?? ''} onChange={(e) => setDraft({ ...draft, priorite: (e.target.value || null) as TaskPriorite | null })}>
            <MenuItem value="">Toutes les priorites</MenuItem>
            {(Object.keys(PRIORITE_CONFIG) as TaskPriorite[]).map((priority) => <MenuItem key={priority} value={priority}>{PRIORITE_CONFIG[priority].label}</MenuItem>)}
          </Select>
        </FormControl>
        <Autocomplete
          size="small"
          options={users}
          value={users.find((user) => user.id === draft.assigneeId) ?? null}
          onChange={(_, value) => setDraft({ ...draft, assigneeId: value?.id ?? null })}
          renderInput={(params) => <TextField {...params} label="Assigne" />}
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>Grouper par</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={draft.groupBy}
            onChange={(_, value: GroupByOption | null) => value && setDraft({ ...draft, groupBy: value })}
          >
            {(Object.keys(GROUP_LABELS) as GroupByOption[]).map((group) => <ToggleButton key={group} value={group}>{GROUP_LABELS[group]}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>

        <FormControl size="small" fullWidth>
          <Select value={draft.sortBy} onChange={(e) => setDraft({ ...draft, sortBy: e.target.value as SortByOption })}>
            <MenuItem value="titre">Titre</MenuItem>
            <MenuItem value="statut">Statut</MenuItem>
            <MenuItem value="priorite">Priorite</MenuItem>
            <MenuItem value="dateCreation">Date creation</MenuItem>
            <MenuItem value="dateMiseAJour">Date mise a jour</MenuItem>
            <MenuItem value="dateEcheance">Date echeance</MenuItem>
          </Select>
        </FormControl>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={draft.sortDir}
          onChange={(_, value: 'ASC' | 'DESC' | null) => value && setDraft({ ...draft, sortDir: value })}
        >
          <ToggleButton value="ASC">ASC</ToggleButton>
          <ToggleButton value="DESC">DESC</ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel disabled control={<Switch />} label="Urgent seulement" />
        <FormControlLabel disabled control={<Switch />} label="Sans assigne" />
        <FormControlLabel disabled control={<Switch />} label="En retard seulement" />
      </Stack>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            setDraft(DEFAULT_PLANNING_FILTERS);
            resetFilters();
            onClose();
          }}
        >
          Reinitialiser
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            applyFiltersAndReload(draft);
            onClose();
          }}
        >
          Appliquer
        </Button>
      </Box>
    </Box>
  );
};

export default PlanningFiltersDrawer;
