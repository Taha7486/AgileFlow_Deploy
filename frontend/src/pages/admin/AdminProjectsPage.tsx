import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Archive,
  Edit,
  Folder,
  OpenInNew,
  PeopleAlt,
  Unarchive,
  Search,
  TaskAlt,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { deleteProject, fetchProjects, restoreProject, updateProject } from '../../api/projectsApi';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import type { CreateProjectPayload, ProjectListItem, ProjectStatus } from '../../types';
import { formatDate } from '../../utils/formatDate';

const statusLabel: Record<ProjectStatus, string> = {
  ACTIF: 'Actif',
  ARCHIVE: 'Archive',
  TERMINE: 'Termine',
};

const statusColor: Record<ProjectStatus, 'success' | 'default' | 'info'> = {
  ACTIF: 'success',
  ARCHIVE: 'default',
  TERMINE: 'info',
};

const AdminProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<number | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'tasks' | 'members'>('recent');
  const [editTarget, setEditTarget] = useState<ProjectListItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProjectListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ProjectListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await fetchProjects());
    } catch {
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const owners = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((project) => {
      if (project.managerId != null) map.set(project.managerId, project.managerName || `Utilisateur #${project.managerId}`);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = projects.filter((project) => {
      const matchesQuery = !q
        || project.name.toLowerCase().includes(q)
        || (project.issuePrefix ?? '').toLowerCase().includes(q)
        || (project.description ?? '').toLowerCase().includes(q)
        || (project.managerName ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      const matchesOwner = ownerFilter === 'ALL' || project.managerId === ownerFilter;
      return matchesQuery && matchesStatus && matchesOwner;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'tasks') return b.taskCount - a.taskCount;
      if (sortBy === 'members') return b.memberCount - a.memberCount;
      return b.id - a.id;
    });
  }, [ownerFilter, projects, search, sortBy, statusFilter]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.status === 'ACTIF').length,
    members: projects.reduce((sum, project) => sum + project.memberCount, 0),
    tasks: projects.reduce((sum, project) => sum + project.taskCount, 0),
  }), [projects]);

  const handleSave = async (payload: CreateProjectPayload) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateProject(editTarget.id, payload);
      setSnack({ msg: 'Projet mis a jour.', sev: 'success' });
      setEditTarget(null);
      await load();
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Modification impossible.', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await deleteProject(archiveTarget.id);
      setSnack({ msg: 'Projet archive.', sev: 'success' });
      setArchiveTarget(null);
      await load();
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Archivage impossible.', sev: 'error' });
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreProject(restoreTarget.id);
      setSnack({ msg: 'Projet desarchive.', sev: 'success' });
      setRestoreTarget(null);
      await load();
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Desarchivage impossible.', sev: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Projects</Typography>
          <Typography variant="body2" color="text.secondary">Supervision et administration de tous les projets AgileFlow.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => void load()} disabled={loading}>Actualiser</Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Projets', value: stats.total, icon: <Folder />, color: '#2563EB' },
          { label: 'Actifs', value: stats.active, icon: <TrendingUp />, color: '#16A34A' },
          { label: 'Membres', value: stats.members, icon: <PeopleAlt />, color: '#7C3AED' },
          { label: 'Taches', value: stats.tasks, icon: <TaskAlt />, color: '#F59E0B' },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Paper elevation={0} sx={{ p: 2.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography variant="h4" fontWeight={900}>{item.value}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: item.color, width: 44, height: 44 }}>{item.icon}</Avatar>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ p: 1.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25}>
          <TextField
            size="small"
            placeholder="Rechercher nom, cle, proprietaire..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ flex: 1, minWidth: { lg: 300 } }}
            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="project-status-filter">Statut</InputLabel>
            <Select labelId="project-status-filter" label="Statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | 'ALL')}>
              <MenuItem value="ALL">Tous statuts</MenuItem>
              <MenuItem value="ACTIF">Actif</MenuItem>
              <MenuItem value="TERMINE">Termine</MenuItem>
              <MenuItem value="ARCHIVE">Archive</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id="project-owner-filter">Proprietaire</InputLabel>
            <Select labelId="project-owner-filter" label="Proprietaire" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value as number | 'ALL')}>
              <MenuItem value="ALL">Tous proprietaires</MenuItem>
              {owners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="project-sort">Tri</InputLabel>
            <Select labelId="project-sort" label="Tri" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <MenuItem value="recent">Plus recents</MenuItem>
              <MenuItem value="name">Nom</MenuItem>
              <MenuItem value="tasks">Taches</MenuItem>
              <MenuItem value="members">Membres</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Projet</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Proprietaire</TableCell>
                <TableCell align="right">Membres</TableCell>
                <TableCell align="right">Taches</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Avatar src={project.iconUrl ?? undefined} variant="rounded" sx={{ bgcolor: '#2563EB', fontWeight: 900 }}>
                        {(project.name[0] ?? 'P').toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={900}>{project.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.issuePrefix || 'Sans cle'} - {project.description || 'Aucune description'}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Chip size="small" color={statusColor[project.status]} label={statusLabel[project.status]} /></TableCell>
                  <TableCell>{project.managerName || '-'}</TableCell>
                  <TableCell align="right">{project.memberCount}</TableCell>
                  <TableCell align="right">{project.taskCount}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(project.startDate)}</Typography>
                    <Typography variant="caption" color="text.secondary">Fin: {formatDate(project.endDate)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ouvrir">
                      <IconButton size="small" onClick={() => navigate(`/projects/${project.id}/summary`)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => setEditTarget(project)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {project.status === 'ARCHIVE' ? (
                      <Tooltip title="Desarchiver">
                        <IconButton size="small" color="success" onClick={() => setRestoreTarget(project)}>
                          <Unarchive fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Archiver">
                        <IconButton size="small" color="warning" onClick={() => setArchiveTarget(project)}>
                          <Archive fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Alert severity="info">Aucun projet ne correspond aux filtres.</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateProjectModal
        open={Boolean(editTarget)}
        saving={saving}
        project={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleSave}
      />

      <Dialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)}>
        <DialogTitle>Archiver ce projet ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le projet {archiveTarget ? `"${archiveTarget.name}"` : ''} restera conserve, mais les utilisateurs ne le verront plus et ne pourront plus y acceder.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveTarget(null)}>Annuler</Button>
          <Button color="warning" variant="contained" onClick={handleArchive}>Archiver</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)}>
        <DialogTitle>Desarchiver ce projet ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le projet {restoreTarget ? `"${restoreTarget.name}"` : ''} redeviendra actif et sera de nouveau visible pour ses membres.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreTarget(null)}>Annuler</Button>
          <Button color="success" variant="contained" onClick={handleRestore}>Desarchiver</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.sev} onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
};

export default AdminProjectsPage;
