import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createProject, deleteProject, fetchProjects, inviteProjectMember, updateProject } from '../../api/projectsApi';
import { fetchTeams } from '../../api/teamsApi';
import { connectGitHub } from '../../api/github';
import type { CreateProjectPayload, ProjectListItem, TeamListItem } from '../../types';
import CreateProjectModal, { type ProjectCreationOptions } from '../../components/projects/CreateProjectModal';
import ProjectCard from '../../components/projects/ProjectCard';

const ProjectsListPage = () => {
  const { user: current } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ProjectListItem[]>([]);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);
  const isAdmin = current?.role === 'ROLE_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, teamRows] = await Promise.all([fetchProjects(), fetchTeams()]);
      setRows(projects);
      setTeams(teamRows);
    } catch {
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((project) =>
      project.name.toLowerCase().includes(query)
      || (project.description ?? '').toLowerCase().includes(query)
      || (project.managerName ?? '').toLowerCase().includes(query));
  }, [rows, search]);

  const canEditProject = (project: ProjectListItem) =>
    isAdmin || project.owner;

  const handleSave = async (payload: CreateProjectPayload, options?: ProjectCreationOptions) => {
    if (isAdmin && !editTarget) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateProject(editTarget.id, payload);
        setSnack({ msg: 'Projet mis a jour.', sev: 'success' });
      } else {
        const saved = await createProject(payload);
        if (options?.invitedEmails.length) {
          await Promise.all(options.invitedEmails.map((email) => inviteProjectMember(saved.id, { email })));
        }
        if (options?.githubConnection) {
          await connectGitHub(saved.id, options.githubConnection);
        }
        setSnack({ msg: 'Projet cree. Vous en etes le proprietaire.', sev: 'success' });
      }
      setDialogOpen(false);
      setEditTarget(null);
      await load();
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Erreur lors de la sauvegarde.', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      setSnack({ msg: 'Projet archive. Il ne sera plus accessible.', sev: 'success' });
      setDeleteTarget(null);
      await load();
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Suppression impossible.', sev: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Projets</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Consultez les projets et leurs informations.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 280 }}
          />
          {!isAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
              Nouveau projet
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">{isAdmin ? 'Aucun projet a afficher.' : 'Aucun projet a afficher. Creez votre premier projet pour commencer.'}</Alert>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((project) => (
            <Grid item xs={12} md={6} xl={4} key={project.id}>
              <Box onClick={() => navigate(`/projects/${project.id}/summary`)} sx={{ height: '100%', cursor: 'pointer' }}>
                <ProjectCard
                  project={project}
                  actions={(
                    <Box onClick={(event) => event.stopPropagation()} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {canEditProject(project) && (
                        <>
                          <Button size="small" variant="outlined" onClick={() => { setEditTarget(project); setDialogOpen(true); }}>
                            Modifier
                          </Button>
                          <Button size="small" color="error" onClick={() => setDeleteTarget(project)}>
                            {isAdmin ? 'Archiver' : 'Supprimer'}
                          </Button>
                        </>
                      )}
                    </Box>
                  )}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <CreateProjectModal
        open={dialogOpen}
        saving={saving}
        teams={teams}
        project={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleSave}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{isAdmin ? 'Archiver ce projet ?' : 'Supprimer ce projet ?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action archivera le projet {deleteTarget ? `"${deleteTarget.name}"` : ''}. Il disparaitra de vos espaces et ne sera plus accessible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Confirmer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.sev} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
};

export default ProjectsListPage;
