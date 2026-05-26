import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Dashboard, Layers, Search } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { createUserStory, deleteUserStory, fetchBacklogByProject, updateUserStory } from '../../api/backlogApi';
import { createEpic, deleteEpic, updateEpic } from '../../api/epicsApi';
import { useActiveProject } from '../../hooks/useActiveProject';
import type {
  CreateEpicPayload,
  CreateUserStoryPayload,
  EpicItem,
  EpicStatus,
  StoryPriority,
  UserStoryItem,
} from '../../types';
import BacklogEpicView from '../../components/backlog/BacklogEpicView';
import CreateEpicModal from '../../components/backlog/CreateEpicModal';
import CreateStoryModal from '../../components/backlog/CreateStoryModal';
import EpicStatusBoard from '../../components/backlog/EpicStatusBoard';
import PlanningOverview from '../../components/backlog/PlanningOverview';
import StoryDetailDrawer from '../../components/backlog/StoryDetailDrawer';

const TABS = ['backlog', 'epics'] as const;
type TabKey = typeof TABS[number];

const BacklogPage = () => {
  const { user } = useAuth();
  const { activeProject } = useActiveProject();
  const selectedProjectId = activeProject?.id ?? '';
  const [priority, setPriority] = useState<StoryPriority | 'ALL'>('ALL');
  const [epicFilter, setEpicFilter] = useState<number | 'none' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [epics, setEpics] = useState<EpicItem[]>([]);
  const [stories, setStories] = useState<UserStoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('backlog');
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStory, setEditStory] = useState<UserStoryItem | null>(null);
  const [editEpic, setEditEpic] = useState<EpicItem | null>(null);
  const [detailStory, setDetailStory] = useState<UserStoryItem | null>(null);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const selectedProject = activeProject;
  const canManage = Boolean(user && selectedProject && (user.role === 'ROLE_ADMIN' || selectedProject.owner));

  const loadBacklog = useCallback(async () => {
    if (!selectedProjectId) {
      setStories([]);
      setEpics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const backlog = await fetchBacklogByProject(selectedProjectId, priority);
      setEpics(backlog.epics ?? []);
      setStories(backlog.stories);
    } catch {
      setError('Impossible de charger le backlog.');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, priority]);

  useEffect(() => {
    void loadBacklog();
  }, [loadBacklog]);

  const filteredStories = useMemo(() => {
    let list = stories;
    if (epicFilter === 'none') list = list.filter((s) => !s.epicId);
    else if (epicFilter !== 'all') list = list.filter((s) => s.epicId === epicFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.epicTitle?.toLowerCase().includes(q));
    }
    return list;
  }, [stories, epicFilter, search]);

  const handleSaveStory = async (payload: CreateUserStoryPayload) => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      if (editStory) {
        await updateUserStory(editStory.id, payload);
        setSnack({ msg: 'Story mise a jour.', sev: 'success' });
      } else {
        await createUserStory(selectedProjectId, payload);
        setSnack({ msg: 'Story creee.', sev: 'success' });
      }
      setStoryDialogOpen(false);
      setEditStory(null);
      await loadBacklog();
    } catch {
      setSnack({ msg: 'Operation impossible.', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEpic = async (payload: CreateEpicPayload) => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      if (editEpic) {
        await updateEpic(editEpic.id, payload);
        setSnack({ msg: 'Epic mis a jour.', sev: 'success' });
      } else {
        await createEpic(selectedProjectId, payload);
        setSnack({ msg: 'Epic cree.', sev: 'success' });
      }
      setEpicDialogOpen(false);
      setEditEpic(null);
      await loadBacklog();
    } catch {
      setSnack({ msg: 'Operation epic impossible.', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEpic = async (epic: EpicItem) => {
    if (!window.confirm(`Supprimer l'epic "${epic.title}" ? Les stories seront conservees sans epic.`)) return;
    try {
      await deleteEpic(epic.id);
      setSnack({ msg: 'Epic supprime.', sev: 'success' });
      await loadBacklog();
    } catch {
      setSnack({ msg: 'Suppression epic impossible.', sev: 'error' });
    }
  };

  const handleEpicStatusChange = async (epic: EpicItem, status: EpicStatus) => {
    try {
      await updateEpic(epic.id, {
        title: epic.title,
        description: epic.description ?? undefined,
        status,
        color: epic.color,
        startDate: epic.startDate,
        endDate: epic.endDate,
      });
      setSnack({ msg: 'Statut epic mis a jour.', sev: 'success' });
      await loadBacklog();
    } catch {
      setSnack({ msg: 'Mise a jour statut impossible.', sev: 'error' });
    }
  };

  const handleDeleteStory = async (story: UserStoryItem) => {
    if (!window.confirm(`Supprimer la story "${story.title}" ?`)) return;
    try {
      await deleteUserStory(story.id);
      setSnack({ msg: 'Story supprimee.', sev: 'success' });
      setDetailStory(null);
      await loadBacklog();
    } catch {
      setSnack({ msg: 'Suppression impossible.', sev: 'error' });
    }
  };

  const filtersRow = (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="backlog-epic-filter">Epic</InputLabel>
        <Select
          labelId="backlog-epic-filter"
          label="Epic"
          value={epicFilter === 'all' ? 'all' : epicFilter === 'none' ? 'none' : epicFilter}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all' || value === 'none') setEpicFilter(value);
            else setEpicFilter(Number(value));
          }}
        >
          <MenuItem value="all">Tous les epics</MenuItem>
          <MenuItem value="none">Sans epic</MenuItem>
          {epics.map((epic) => <MenuItem key={epic.id} value={epic.id}>{epic.title}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField
        size="small"
        placeholder="Rechercher une story..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ minWidth: 220 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />
    </Stack>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Backlog</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Epic, Story, Tache. Backlog hierarchique centre sur le projet.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="backlog-plan-priority-label">Priorite</InputLabel>
            <Select labelId="backlog-plan-priority-label" label="Priorite" value={priority} onChange={(e) => setPriority(e.target.value as StoryPriority | 'ALL')}>
              <MenuItem value="ALL">Toutes</MenuItem>
              <MenuItem value="LOW">Faible</MenuItem>
              <MenuItem value="MEDIUM">Moyenne</MenuItem>
              <MenuItem value="HIGH">Haute</MenuItem>
              <MenuItem value="CRITICAL">Critique</MenuItem>
            </Select>
          </FormControl>
          {canManage && (
            <>
              <Button variant="outlined" startIcon={<Layers />} disabled={!selectedProjectId} onClick={() => { setEditEpic(null); setEpicDialogOpen(true); }}>
                Epic
              </Button>
              <Button variant="contained" startIcon={<Add />} disabled={!selectedProjectId} onClick={() => { setEditStory(null); setStoryDialogOpen(true); }}>
                Story
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="backlog" label="Backlog" icon={<Layers />} iconPosition="start" />
        <Tab value="epics" label="Epics" icon={<Dashboard />} iconPosition="start" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !selectedProjectId ? (
        <Alert severity="info">Selectionnez un projet pour commencer.</Alert>
      ) : (
        <>
          <PlanningOverview epics={epics} stories={stories} />
          {filtersRow}

          {tab === 'backlog' && (
            stories.length === 0 && epics.length === 0 ? (
              <Alert severity="info">Creez un epic puis des user stories. Decomposez ensuite en taches depuis le Kanban.</Alert>
            ) : filteredStories.length === 0 ? (
              <Alert severity="info">Aucune story ne correspond aux filtres.</Alert>
            ) : (
              <BacklogEpicView
                epics={epics}
                stories={filteredStories}
                canManage={canManage}
                onEditEpic={(epic) => { setEditEpic(epic); setEpicDialogOpen(true); }}
                onDeleteEpic={handleDeleteEpic}
                onEdit={(story) => { setEditStory(story); setStoryDialogOpen(true); }}
                onDelete={handleDeleteStory}
                onOpenStory={(story) => setDetailStory(story)}
              />
            )
          )}

          {tab === 'epics' && (
            epics.length === 0 ? (
              <Alert severity="info">Creez votre premier epic pour structurer le backlog.</Alert>
            ) : (
              <EpicStatusBoard
                epics={epics}
                canManage={canManage}
                onEdit={(epic) => { setEditEpic(epic); setEpicDialogOpen(true); }}
                onDelete={handleDeleteEpic}
                onStatusChange={handleEpicStatusChange}
              />
            )
          )}
        </>
      )}

      <CreateStoryModal open={storyDialogOpen} saving={saving} story={editStory} epics={epics} onClose={() => { setStoryDialogOpen(false); setEditStory(null); }} onSubmit={handleSaveStory} />
      <CreateEpicModal open={epicDialogOpen} saving={saving} epic={editEpic} onClose={() => { setEpicDialogOpen(false); setEditEpic(null); }} onSubmit={handleSaveEpic} />
      <StoryDetailDrawer
        story={detailStory}
        open={detailStory != null}
        canManage={canManage}
        onClose={() => setDetailStory(null)}
        onEdit={(story) => { setDetailStory(null); setEditStory(story); setStoryDialogOpen(true); }}
        onDelete={handleDeleteStory}
      />
      <Snackbar open={snack != null} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack?.msg} />
    </Box>
  );
};

export default BacklogPage;
