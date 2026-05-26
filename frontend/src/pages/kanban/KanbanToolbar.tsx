import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  Menu,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  FilterList,
  Search,
  ViewColumn,
} from '@mui/icons-material';
import { fetchProjectMembers } from '../../api/projectsApi';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useKanbanStore } from '../../store/kanbanStore';
import { PRIORITE_CONFIG } from '../../types/kanban.types';
import type { KanbanPriorite } from '../../types/kanban.types';
import type { ProjectMember } from '../../types';

interface Props {
  onSearch: (value: string) => void;
}

const KanbanToolbar = ({ onSearch }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { filters, groupBy, setFilter, resetFilters, setGroupBy, loadBoard } = useKanbanStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [groupAnchor, setGroupAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeProject?.id) {
      setMembers([]);
      return;
    }
    void fetchProjectMembers(activeProject.id).then(setMembers).catch(() => setMembers([]));
  }, [activeProject?.id]);

  const assigneeName = useMemo(() => {
    const member = members.find((item) => item.userId === filters.assigneeId);
    return member ? `${member.firstName} ${member.lastName}` : null;
  }, [filters.assigneeId, members]);

  return (
    <Box sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid #DFE1E6' }}>
      <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Rechercher"
            defaultValue={filters.search}
            onChange={(event) => onSearch(event.target.value)}
            sx={{ width: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          />
          <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 12, cursor: 'pointer' } }}>
            {members.map((member) => (
              <Tooltip key={member.userId} title={`${member.firstName} ${member.lastName}`}>
                <Avatar
                  onClick={() => setFilter('assigneeId', filters.assigneeId === member.userId ? null : member.userId)}
                  sx={{ bgcolor: member.owner ? '#0C66E4' : '#6B778C', border: filters.assigneeId === member.userId ? '2px solid #0C66E4 !important' : undefined }}
                >
                  {`${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          {assigneeName && <Chip label={assigneeName} onDelete={() => setFilter('assigneeId', null)} size="small" />}
          <Button variant="outlined" startIcon={<FilterList />} onClick={(event) => setFilterAnchor(event.currentTarget)}>Filtrer</Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<ViewColumn />} onClick={(event) => setGroupAnchor(event.currentTarget)}>
            {groupBy === 'none' ? 'Regrouper' : groupBy === 'assignee' ? 'Par assigne' : 'Par priorite'}
          </Button>
          <Button variant="text" onClick={() => void loadBoard()}>Actualiser</Button>
        </Stack>
      </Box>

      <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Stack spacing={2} sx={{ p: 2, width: 260 }}>
          <FormControl fullWidth size="small">
            <Select
              displayEmpty
              value={filters.priorite ?? ''}
              onChange={(event) => setFilter('priorite', (event.target.value || null) as KanbanPriorite | null)}
            >
              <MenuItem value="">Toutes les priorites</MenuItem>
              {(Object.keys(PRIORITE_CONFIG) as KanbanPriorite[]).map((priorite) => (
                <MenuItem key={priorite} value={priorite}>{PRIORITE_CONFIG[priorite].label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button onClick={() => { resetFilters(); setFilterAnchor(null); }}>Reinitialiser</Button>
        </Stack>
      </Popover>

      <Menu anchorEl={groupAnchor} open={Boolean(groupAnchor)} onClose={() => setGroupAnchor(null)}>
        <MenuItem selected={groupBy === 'none'} onClick={() => { setGroupBy('none'); setGroupAnchor(null); }}>Aucun</MenuItem>
        <MenuItem selected={groupBy === 'assignee'} onClick={() => { setGroupBy('assignee'); setGroupAnchor(null); }}>Par assigne</MenuItem>
        <MenuItem selected={groupBy === 'priorite'} onClick={() => { setGroupBy('priorite'); setGroupAnchor(null); }}>Par priorite</MenuItem>
      </Menu>
    </Box>
  );
};

export default KanbanToolbar;
