import { Add, DeleteOutline, EditOutlined, FolderOutlined, KeyboardArrowDown } from '@mui/icons-material';
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
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { createProject, deleteProject, updateProject } from '../../api/projectsApi';
import { fetchTeams } from '../../api/teamsApi';
import { useAuthStore } from '../../store/authStore';
import type { CreateProjectPayload, ProjectListItem, TeamListItem } from '../../types';
import CreateProjectModal from '../projects/CreateProjectModal';
import InviteButton from './InviteButton';
import { useActiveProject } from '../../hooks/useActiveProject';

const statusColor = (status: ProjectListItem['status']) => {
  if (status === 'ACTIF') return 'success';
  if (status === 'TERMINE') return 'info';
  return 'default';
};

const ProjectSelector = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useAuthStore((state) => state.user);
  const { activeProject, setActiveProject, clearActiveProject, projects, isLoading, reloadProjects } = useActiveProject();

  const initials = (activeProject?.name ?? 'Projet')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const canManageActive = user?.role === 'ROLE_ADMIN' || activeProject?.owner;

  const loadTeams = async () => {
    try {
      setTeams(await fetchTeams());
    } catch {
      setTeams([]);
    }
  };

  const openCreate = async () => {
    setAnchorEl(null);
    setEditProject(null);
    await loadTeams();
    setProjectModalOpen(true);
  };

  const openEdit = async () => {
    if (!activeProject) return;
    setAnchorEl(null);
    setEditProject(activeProject);
    await loadTeams();
    setProjectModalOpen(true);
  };

  const handleSave = async (payload: CreateProjectPayload) => {
    setSaving(true);
    try {
      const saved = editProject
        ? await updateProject(editProject.id, payload)
        : await createProject(payload);
      setActiveProject(saved);
      await reloadProjects();
      setProjectModalOpen(false);
      setEditProject(null);
      setSnack({ msg: editProject ? 'Projet modifie.' : 'Projet cree.', sev: 'success' });
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Erreur lors de la sauvegarde du projet.', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      clearActiveProject();
      await reloadProjects();
      setSnack({ msg: 'Projet supprime.', sev: 'success' });
    } catch (errorValue: unknown) {
      const message = errorValue && typeof errorValue === 'object' && 'response' in errorValue
        ? (errorValue as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSnack({ msg: message ?? 'Suppression impossible.', sev: 'error' });
    }
  };

  const trigger = isXs ? (
    <Tooltip title={activeProject?.name ?? 'Selectionner un projet'}>
      <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)}>
        <FolderOutlined fontSize="small" />
      </IconButton>
    </Tooltip>
  ) : (
    <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        component="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          border: 0,
          bgcolor: 'transparent',
          p: 0,
          color: '#42526E',
          fontSize: 15,
          lineHeight: 1,
          textDecoration: 'underline',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          '&:hover': { color: '#0C66E4' },
        }}
      >
        Espaces
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minWidth: 0,
            cursor: 'pointer',
            borderRadius: 1,
            px: 0.5,
            py: 0.25,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#0C66E4', fontSize: 14, fontWeight: 800 }}>
            {initials || <FolderOutlined fontSize="small" />}
          </Avatar>
          <Typography sx={{ color: '#172B4D', fontSize: 24, lineHeight: 1, fontWeight: 800, maxWidth: 220 }} noWrap>
            {activeProject?.name ?? 'Projet'}
          </Typography>
          {isLoading ? <CircularProgress size={15} /> : <KeyboardArrowDown sx={{ color: '#42526E', fontSize: 20 }} />}
        </Box>
        <InviteButton />
      </Box>
    </Box>
  );

  return (
    <>
      {trigger}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {projects.map((project) => (
          <MenuItem
            key={project.id}
            selected={project.id === activeProject?.id}
            onClick={() => {
              setActiveProject(project);
              setAnchorEl(null);
            }}
            sx={{ minWidth: 300, display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <span>{project.name}</span>
            <Chip size="small" label={project.status} color={statusColor(project.status)} />
          </MenuItem>
        ))}

        <Divider />
        <MenuItem onClick={openCreate}>
          <Add fontSize="small" sx={{ mr: 1 }} />
          Creer un projet
        </MenuItem>

        {activeProject && canManageActive && (
          <MenuItem onClick={openEdit}>
            <EditOutlined fontSize="small" sx={{ mr: 1 }} />
            Modifier le projet
          </MenuItem>
        )}

        {activeProject && canManageActive && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              setDeleteTarget(activeProject);
            }}
            sx={{ color: '#DE350B' }}
          >
            <DeleteOutline fontSize="small" sx={{ mr: 1, color: '#DE350B' }} />
            Supprimer le projet
          </MenuItem>
        )}
      </Menu>

      <CreateProjectModal
        open={projectModalOpen}
        saving={saving}
        teams={teams}
        project={editProject}
        onClose={() => {
          if (!saving) {
            setProjectModalOpen(false);
            setEditProject(null);
          }
        }}
        onSubmit={handleSave}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Supprimer ce projet ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action supprimera definitivement le projet {deleteTarget ? `"${deleteTarget.name}"` : ''}.
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
    </>
  );
};

export default ProjectSelector;
