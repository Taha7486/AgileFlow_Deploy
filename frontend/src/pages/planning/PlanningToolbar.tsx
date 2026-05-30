import { useEffect, useMemo, useState } from 'react';
import { Close, Delete, Download, Search, ViewColumn } from '@mui/icons-material';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import { planningApi } from '../../api/planningApi';
import { fetchProjectMembers } from '../../api/projectsApi';
import { DEFAULT_PLANNING_FILTERS, GROUP_LABELS, usePlanningStore } from '../../store/planningStore';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import type { ProjectMember } from '../../types';
import type { GroupByOption, TaskPriorite, TaskStatut } from '../../types/planning.types';
import { COLUMN_LABELS, PRIORITE_CONFIG, STATUT_CONFIG } from '../../utils/planningHelpers';
import { resolvePresenceDisplay, usePresenceStore } from '../../store/presenceStore';

interface Props {
  onOpenFilters?: () => void;
  onSearchChange: (value: string) => void;
}

const PlanningToolbar = ({ onSearchChange }: Props) => {
  const { filters, stats, selectedTaskIds, visibleColumns, applyFiltersAndReload, resetFilters, clearSelection, bulkAction, setVisibleColumns } = usePlanningStore();
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const getPresence = usePresenceStore((state) => state.getPresence);

  const hasActiveFilters = useMemo(
    () => JSON.stringify({ ...filters, projectId: null }) !== JSON.stringify(DEFAULT_PLANNING_FILTERS),
    [filters],
  );
  const selectedCount = selectedTaskIds.size;

  useEffect(() => {
    if (!activeProject?.id) {
      setMembers([]);
      return;
    }
    void fetchProjectMembers(activeProject.id).then(setMembers).catch(() => setMembers([]));
  }, [activeProject?.id]);

  return (
    <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ minHeight: '58px !important', justifyContent: 'space-between', gap: 2 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Chip size="small" label={`${stats?.total ?? 0} taches`} />
          <Chip size="small" color="error" variant="outlined" label={`${stats?.urgent ?? 0} urgentes`} />
          <Chip size="small" color="warning" variant="outlined" label={`${stats?.overdue ?? 0} en retard`} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" startIcon={<Download />} onClick={() => void planningApi.exportExcel(filters)}>Exporter Excel</Button>
          <Button size="small" startIcon={<ViewColumn />} onClick={(e) => setColumnsAnchor(e.currentTarget)}>Colonnes</Button>
        </Stack>
      </Toolbar>

      <Box sx={{ px: 2, pb: 1.2, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Rechercher une tache..."
            defaultValue={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ width: 230 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          />
          <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 12, cursor: 'pointer' } }}>
            {members.map((member) => {
              const active = filters.assigneeId === member.userId;
              const online = resolvePresenceDisplay(getPresence(member.userId)) === 'LIVE';
              return (
                <Tooltip key={member.userId} title={`${member.firstName} ${member.lastName}`}>
                  <Avatar
                    src={member.avatarUrl ?? undefined}
                    onClick={() => applyFiltersAndReload({ assigneeId: active ? null : member.userId })}
                    sx={{
                      bgcolor: member.owner ? '#0C66E4' : '#6B778C',
                      border: online ? '2px solid #44b700 !important' : active ? '2px solid #0C66E4 !important' : undefined,
                      boxShadow: active && online ? '0 0 0 2px #0C66E4' : undefined,
                    }}
                  >
                    {`${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()}
                  </Avatar>
                </Tooltip>
              );
            })}
          </AvatarGroup>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select displayEmpty value={filters.statut ?? ''} onChange={(e) => applyFiltersAndReload({ statut: (e.target.value || null) as TaskStatut | null })}>
              <MenuItem value="">Tous statuts</MenuItem>
              {(Object.keys(STATUT_CONFIG) as TaskStatut[]).map((status) => <MenuItem key={status} value={status}>{STATUT_CONFIG[status].label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select displayEmpty value={filters.priorite ?? ''} onChange={(e) => applyFiltersAndReload({ priorite: (e.target.value || null) as TaskPriorite | null })}>
              <MenuItem value="">Priorite</MenuItem>
              {(Object.keys(PRIORITE_CONFIG) as TaskPriorite[]).map((priority) => <MenuItem key={priority} value={priority}>{PRIORITE_CONFIG[priority].label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={filters.groupBy} onChange={(e) => applyFiltersAndReload({ groupBy: e.target.value as GroupByOption })}>
              {(Object.keys(GROUP_LABELS) as GroupByOption[])
                .filter((group) => group !== 'STORY')
                .map((group) => <MenuItem key={group} value={group}>Grouper: {GROUP_LABELS[group]}</MenuItem>)}
            </Select>
          </FormControl>
          {hasActiveFilters && <Chip size="small" label="Reinitialiser" onDelete={resetFilters} deleteIcon={<Close />} />}
        </Stack>
      </Box>

      {selectedCount > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography fontWeight={700}>{selectedCount} tache(s) selectionnee(s)</Typography>
          <Button size="small" variant="contained" color="error" startIcon={<Delete />} onClick={() => setDeleteOpen(true)}>Supprimer</Button>
          <Button size="small" color="inherit" onClick={clearSelection}>Annuler</Button>
        </Box>
      )}

      <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)}>
        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
          <MenuItem key={key} onClick={() => setVisibleColumns(visibleColumns.includes(key) ? visibleColumns.filter((c) => c !== key) : [...visibleColumns, key])}>
            <Checkbox checked={visibleColumns.includes(key)} size="small" />
            {label}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Supprimer les taches selectionnees ?</DialogTitle>
        <DialogContent>Cette action supprime {selectedCount} tache(s).</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => { void bulkAction('DELETE'); setDeleteOpen(false); }}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningToolbar;
