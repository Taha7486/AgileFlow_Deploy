import { useEffect, useMemo, useState } from 'react';
import { Add as AddIcon, Close, Send } from '@mui/icons-material';
import {
  Avatar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  MenuItem,
  Switch,
  Typography,
} from '@mui/material';
import { api } from '../../api/axiosInterceptor';
import { fetchProjectMembers } from '../../api/projectsApi';
import { usePlanningStore } from '../../store/planningStore';
import { useActiveProjectStore } from '../../store/activeProjectStore';
import type { CommentItem, UserListItem } from '../../types';
import { ALLOWED_CHILD_TYPES, PlanningTask, TaskPriorite, TaskStatut } from '../../types/planning.types';
import { formatDateFR, PRIORITE_CONFIG, STATUT_CONFIG, userFullName } from '../../utils/planningHelpers';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import CreateSubtaskModal from '../../components/planning/CreateSubtaskModal';
import GitHubTaskDetail from '../../components/github/GitHubTaskDetail';

interface Props {
  taskId: number;
  onClose: () => void;
}

const findTaskById = (tasks: PlanningTask[], id: number): PlanningTask | null => {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.sousTaskes && task.sousTaskes.length > 0) {
      const found = findTaskById(task.sousTaskes, id);
      if (found) return found;
    }
  }
  return null;
};

const PlanningTaskDetail = ({ taskId, onClose }: Props) => {
  const { groups, inlineEditTask, addSubtaskToParent } = usePlanningStore();
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const task = useMemo(() => {
    for (const group of groups) {
      const found = findTaskById(group.tasks, taskId);
      if (found) return found;
    }
    return null;
  }, [groups, taskId]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setTitle(task?.titre ?? '');
    setDescription(task?.description ?? '');
  }, [task]);

  useEffect(() => {
    void api.get(`/tasks/${taskId}/comments`).then((res) => setComments(res.data ?? [])).catch(() => setComments([]));
  }, [taskId]);

  useEffect(() => {
    const projectId = task?.project?.id ?? activeProject?.id;
    if (!projectId) {
      setUsers([]);
      return;
    }
    void fetchProjectMembers(projectId)
      .then((members) => setUsers(members.map((member) => ({
        id: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: 'ROLE_DEVELOPER',
        active: true,
        createdAt: member.joinedAt,
        lastLogin: null,
      }))))
      .catch(() => setUsers([]));
  }, [activeProject?.id, task?.project?.id]);

  const sendComment = async () => {
    if (!comment.trim()) return;
    const { data } = await api.post(`/tasks/${taskId}/comments`, { contenu: comment.trim() });
    setComments((items) => [...items, data]);
    setComment('');
  };

  const selectedAssignee = users.find((user) => user.id === task?.assignee?.id) ?? null;
  const saveDescription = () => {
    const next = description.trim();
    if ((next || task?.description) && next !== (task?.description ?? '')) {
      void inlineEditTask(taskId, 'description', next);
    }
  };

  if (!task) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Tache introuvable dans la liste chargee.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {task.project?.nom ?? 'Projet'} / KAN-{task.id}
          </Typography>
          <Typography variant="h6" fontWeight={800}>Details</Typography>
        </Box>
        <Stack direction="row">
          <IconButton onClick={onClose}><Close /></IconButton>
        </Stack>
      </Box>
      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
          <TextField
            select
            size="small"
            label="Statut"
            value={task.statut}
            onChange={(event) => void inlineEditTask(task.id, 'statut', event.target.value)}
            sx={{ minWidth: 135 }}
          >
            {(Object.keys(STATUT_CONFIG) as TaskStatut[]).map((status) => (
              <MenuItem key={status} value={status}>{STATUT_CONFIG[status].label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Priorite"
            value={task.priorite}
            onChange={(event) => void inlineEditTask(task.id, 'priorite', event.target.value)}
            sx={{ minWidth: 135 }}
          >
            {(Object.keys(PRIORITE_CONFIG) as TaskPriorite[]).map((priority) => (
              <MenuItem key={priority} value={priority}>{PRIORITE_CONFIG[priority].label}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={task.isUrgent}
                disabled={task.statut === 'DONE'}
                onChange={(event) => void inlineEditTask(task.id, 'isUrgent', String(event.target.checked))}
              />
            }
            label="Urgent"
          />
        </Stack>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.titre && void inlineEditTask(task.id, 'titre', title.trim())}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          minRows={5}
          label="Description"
          placeholder="Ajouter une description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          sx={{ mb: 2 }}
        />

        <GitHubTaskDetail
          taskId={task.id}
          githubIssueNumber={task.githubIssueNumber}
          githubIssueUrl={task.githubIssueUrl}
          githubPrNumber={task.githubPrNumber}
          githubPrUrl={task.githubPrUrl}
        />

        <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1 }}>Details</Typography>
        <Stack spacing={1.2} sx={{ mb: 2 }}>
          <Autocomplete
            size="small"
            options={users}
            value={selectedAssignee}
            getOptionLabel={(user) => `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, user) => void inlineEditTask(task.id, 'assigneeId', user ? String(user.id) : '')}
            renderInput={(params) => <TextField {...params} label="Assigne" placeholder="Non assigne" />}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography color="text.secondary">Assignee par</Typography>
            {task.reporter ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: task.reporter.avatarColor, fontSize: 11 }}>{task.reporter.initiales}</Avatar>
                <Typography>{userFullName(task.reporter)}</Typography>
              </Box>
            ) : (
              <Typography color="text.secondary">-</Typography>
            )}
          </Box>
          <TextField
            size="small"
            label="Echeance"
            type="date"
            value={task.dateEcheance ? task.dateEcheance.slice(0, 10) : ''}
            onChange={(event) => void inlineEditTask(task.id, 'dateEcheance', event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Date echeance</Typography><Typography>{formatDateFR(task.dateEcheance)}</Typography></Box>
        </Stack>

        {/* Section Sous-tâches */}
        {task.typeTache !== 'SUBTASK' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Sous-tâches
              {task.sousTaskeCount > 0 && (
                <Chip label={`${task.sousTaskesDoneCount}/${task.sousTaskeCount}`} size="small" sx={{ height: 18, fontSize: 10 }} />
              )}
            </Typography>

            {task.sousTaskeCount > 0 && (
              <LinearProgress
                variant="determinate"
                value={(task.sousTaskesDoneCount / task.sousTaskeCount) * 100}
                sx={{ mb: 1.5, height: 6, borderRadius: 3 }}
                color={task.sousTaskesDoneCount === task.sousTaskeCount ? 'success' : 'primary'}
              />
            )}

            <List dense disablePadding>
              {task.sousTaskes?.map((st) => (
                <ListItem 
                  key={st.id} 
                  disablePadding 
                  sx={{ 
                    borderRadius: 1, 
                    mb: 0.5,
                    '&:hover': { bgcolor: 'action.hover' },
                    cursor: 'pointer'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TaskTypeIcon type={st.typeTache} size={14} showTooltip={false} />
                  </ListItemIcon>
                  <ListItemText
                    primary={st.titre}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                  <Chip
                    label={STATUT_CONFIG[st.statut].label}
                    size="small"
                    sx={{ height: 18, fontSize: 9, ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>

            {(ALLOWED_CHILD_TYPES[task.typeTache] || []).length > 0 && (
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setCreateModalOpen(true)}
                sx={{ mt: 1 }}
              >
                Ajouter une sous-tâche
              </Button>
            )}
          </Box>
        )}

        <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1 }}>
          Commentaires
        </Typography>
        <Stack spacing={1.5}>
          <TextField
            multiline
            minRows={2}
            placeholder="Ajouter un commentaire..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            InputProps={{ endAdornment: <IconButton onClick={() => void sendComment()}><Send /></IconButton> }}
          />
          {comments.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28 }}>{item.auteur?.firstName?.[0] ?? item.auteur?.email?.[0] ?? '?'}</Avatar>
              <Box>
                <Typography variant="body2" fontWeight={700}>{item.auteur?.firstName} {item.auteur?.lastName}</Typography>
                <Typography variant="body2">{item.contenu}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {createModalOpen && (
        <CreateSubtaskModal 
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          parentTask={task}
          onCreated={(newTask) => {
            addSubtaskToParent(task.id, newTask);
          }}
        />
      )}
    </Box>
  );
};

export default PlanningTaskDetail;
