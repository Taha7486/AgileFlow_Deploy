import { useEffect, useState } from 'react';
import { Avatar, AvatarGroup, Box, Button, FormControl, InputAdornment, Menu, MenuItem, Select, Stack, TextField, Tooltip } from '@mui/material';
import { Add, MoreHoriz, Search } from '@mui/icons-material';
import { fetchProjectMembers } from '../../api/projectsApi';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import { useTimelineStore } from '../../store/timelineStore';
import { STATUT_CONFIG, TYPE_CONFIG } from '../../types/timeline.types';
import type { ProjectMember } from '../../types';
import type { TimelineStatut, TimelineType } from '../../types/timeline.types';

interface Props {
  onSearch: (value: string) => void;
  onCreateEpic: () => void;
}

const TimelineToolbar = ({ onSearch, onCreateEpic }: Props) => {
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { data, filters, setFilter, expandAll, collapseAll, loadTimeline } = useTimelineStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeProject?.id) {
      setMembers([]);
      return;
    }
    void fetchProjectMembers(activeProject.id).then(setMembers).catch(() => setMembers([]));
  }, [activeProject?.id]);

  return (
    <Box sx={{ height: 54, px: 2, borderBottom: '1px solid #DFE1E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF', gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Rechercher dans la chronologie..."
          defaultValue={filters.search}
          onChange={(event) => onSearch(event.target.value)}
          sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 12, cursor: 'pointer' } }}>
          {members.map((member) => {
            const active = filters.assigneeId === member.userId;
            return (
              <Tooltip key={member.userId} title={`${member.firstName} ${member.lastName}`}>
                <Avatar
                  onClick={() => setFilter('assigneeId', active ? null : member.userId)}
                  sx={{ bgcolor: member.owner ? '#0C66E4' : '#6B778C', border: active ? '2px solid #0C66E4 !important' : undefined }}
                >
                  {`${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()}
                </Avatar>
              </Tooltip>
            );
          })}
        </AvatarGroup>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select displayEmpty value={filters.epicId ?? ''} onChange={(event) => setFilter('epicId', event.target.value ? Number(event.target.value) : null)}>
            <MenuItem value="">Tous les epics</MenuItem>
            {data?.epics.map((epic) => <MenuItem key={epic.id} value={epic.id}>{epic.titre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select displayEmpty value={filters.type ?? ''} onChange={(event) => setFilter('type', (event.target.value || null) as TimelineType | null)}>
            <MenuItem value="">Tous les types</MenuItem>
            {(Object.keys(TYPE_CONFIG) as TimelineType[]).filter((type) => type !== 'SUBTASK').map((type) => <MenuItem key={type} value={type}>{TYPE_CONFIG[type].label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select displayEmpty value={filters.statut ?? ''} onChange={(event) => setFilter('statut', (event.target.value || null) as TimelineStatut | null)}>
            <MenuItem value="">Categorie d'etat</MenuItem>
            {(Object.keys(STATUT_CONFIG) as TimelineStatut[]).map((statut) => <MenuItem key={statut} value={statut}>{STATUT_CONFIG[statut].labelFR}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button startIcon={<Add />} variant="contained" size="small" onClick={onCreateEpic}>Creer Epic</Button>
        <Button startIcon={<MoreHoriz />} size="small" onClick={(event) => setMoreAnchor(event.currentTarget)}>Plus</Button>
      </Stack>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => { void loadTimeline(); setMoreAnchor(null); }}>Actualiser</MenuItem>
        <MenuItem onClick={() => { expandAll(); setMoreAnchor(null); }}>Tout etendre</MenuItem>
        <MenuItem onClick={() => { collapseAll(); setMoreAnchor(null); }}>Tout reduire</MenuItem>
      </Menu>
    </Box>
  );
};

export default TimelineToolbar;
