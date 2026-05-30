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
import { formatIssueKey } from '../../utils/issueKey';
import { resolvePresenceDisplay, usePresenceStore } from '../../store/presenceStore';

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
  const getPresence = usePresenceStore((state) => state.getPresence);
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
  const [draftStatut, setDraftStatut] = useState<TaskStatut>('TODO');
  const [draftPriorite, setDraftPriorite] = useState<TaskPriorite>('MEDIUM');
  const [draftUrgent, setDraftUrgent] = useState(false);
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>('');
  const [draftDateEcheance, setDraftDateEcheance] = useState('');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setTitle(task?.titre ?? '');
    setDescription(task?.description ?? '');
    setDraftStatut(task?.statut ?? 'TODO');
    setDraftPriorite(task?.priorite ?? 'MEDIUM');
    setDraftUrgent(Boolean(task?.isUrgent));
    setDraftAssigneeId(task?.assignee?.id ? String(task.assignee.id) : '');
    setDraftDateEcheance(task?.dateEcheance ? task.dateEcheance.slice(0, 10) : '');
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

  const selectedAssignee = users.find((user) => String(user.id) === draftAssigneeId) ?? null;
  const reporterPresence = resolvePresenceDisplay(task?.reporter ? getPresence(task.reporter.id) : undefined);

  const hasDraftChanges = task ? (
    title.trim() !== task.titre
    || description.trim() !== (task.description ?? '')
    || draftStatut !== task.statut
    || draftPriorite !== task.priorite
    || draftUrgent !== task.isUrgent
    || draftAssigneeId !== (task.assignee?.id ? String(task.assignee.id) : '')
    || draftDateEcheance !== (task.dateEcheance ? task.dateEcheance.slice(0, 10) : '')
  ) : false;

  const handleSave = async () => {
    if (!task || !title.trim()) return;
    setSaving(true);
    try {
      const updates: Array<[string, string]> = [];
      if (title.trim() !== task.titre) updates.push(['titre', title.trim()]);
      if (description.trim() !== (task.description ?? '')) updates.push(['description', description.trim()]);
      if (draftStatut !== task.statut) updates.push(['statut', draftStatut]);
      if (draftPriorite !== task.priorite) updates.push(['priorite', draftPriorite]);
      if (draftUrgent !== task.isUrgent) updates.push(['isUrgent', String(draftUrgent)]);
      if (draftAssigneeId !== (task.assignee?.id ? String(task.assignee.id) : '')) updates.push(['assigneeId', draftAssigneeId]);
      if (draftDateEcheance !== (task.dateEcheance ? task.dateEcheance.slice(0, 10) : '')) updates.push(['dateEcheance', draftDateEcheance]);

      for (const [field, value] of updates) {
        await inlineEditTask(task.id, field, value);
      }
    } finally {
      setSaving(false);
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
            {task.project?.nom ?? 'Projet'} / {formatIssueKey(task.project?.issuePrefix ?? activeProject?.issuePrefix, task.id)}
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
            value={draftStatut}
            onChange={(event) => setDraftStatut(event.target.value as TaskStatut)}
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
            value={draftPriorite}
            onChange={(event) => setDraftPriorite(event.target.value as TaskPriorite)}
            sx={{ minWidth: 135 }}
          >
            {(Object.keys(PRIORITE_CONFIG) as TaskPriorite[]).map((priority) => (
              <MenuItem key={priority} value={priority}>{PRIORITE_CONFIG[priority].label}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={draftUrgent}
                disabled={draftStatut === 'DONE'}
                onChange={(event) => setDraftUrgent(event.target.checked)}
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
            onChange={(_, user) => setDraftAssigneeId(user ? String(user.id) : '')}
            renderOption={(props, user) => (
              <Box component="li" {...props} key={user.id}>
                <Avatar src={user.avatarUrl ?? undefined} sx={{ width: 28, height: 28, mr: 1, fontSize: 12 }}>
                  {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.email[0]?.toUpperCase()}
                </Avatar>
                {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
              </Box>
            )}
            renderInput={(params) => <TextField {...params} label="Assigne" placeholder="Non assigne" />}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography color="text.secondary">Assignee par</Typography>
            {task.reporter ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={task.reporter.avatarUrl ?? undefined} sx={{ width: 24, height: 24, bgcolor: task.reporter.avatarColor, fontSize: 11, border: reporterPresence === 'LIVE' ? '2px solid #44b700' : undefined }}>{task.reporter.initiales}</Avatar>
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
            value={draftDateEcheance}
            onChange={(event) => setDraftDateEcheance(event.target.value)}
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
              <Avatar src={item.auteur?.avatarUrl ?? undefined} sx={{ width: 28, height: 28 }}>{item.auteur?.firstName?.[0] ?? item.auteur?.email?.[0] ?? '?'}</Avatar>
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
      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, bgcolor: 'background.paper' }}>
        <Button onClick={onClose} disabled={saving}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || !title.trim() || !hasDraftChanges}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
};

export default PlanningTaskDetail;
