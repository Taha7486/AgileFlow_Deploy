import { useEffect, useMemo, useState } from 'react';
import {
  Add as AddIcon,
  ArrowBack,
  Close,
  Send,
  WarningAmber,
} from '@mui/icons-material';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { kanbanApi } from '../../api/kanbanApi';
import { planningApi } from '../../api/planningApi';
import { fetchProjectMembers } from '../../api/projectsApi';
import GitHubTaskDetail from '../../components/github/GitHubTaskDetail';
import CreateSubtaskModal from '../../components/planning/CreateSubtaskModal';
import TaskTypeIcon from '../../components/planning/TaskTypeIcon';
import { useKanbanStore } from '../../store/kanbanStore';
import { COLUMN_CONFIG, PRIORITE_CONFIG, TYPE_CONFIG } from '../../types/kanban.types';
import type { KanbanPriorite, KanbanStatut, KanbanTask } from '../../types/kanban.types';
import type { CommentItem, ProjectMember } from '../../types';
import type { PlanningTask, TypeTache } from '../../types/planning.types';
import { ALLOWED_CHILD_TYPES } from '../../types/planning.types';
import { formatDateFR, isOverdue } from '../../utils/kanbanHelpers';
import { formatIssueKey } from '../../utils/issueKey';
import { resolvePresenceDisplay, usePresenceStore } from '../../store/presenceStore';

interface Props {
  taskId: number;
  onClose: () => void;
}

const findTask = (tasks: KanbanTask[], taskId: number) => tasks.find((task) => task.id === taskId) ?? null;

const toPlanningTask = (task: KanbanTask): PlanningTask => ({
  id: task.id,
  titre: task.titre,
  description: task.description,
  type: task.typeTache === 'SUBTASK' ? 'TASK' : task.typeTache,
  statut: task.statut,
  priorite: task.priorite,
  isUrgent: task.isUrgent,
  dateEcheance: task.dateEcheance,
  dateCreation: task.dateCreation,
  dateMiseAJour: task.dateMiseAJour,
  labels: task.labels,
  assignee: task.assignee,
  reporter: task.reporter,
  userStory: task.userStory,
  project: task.project,
  commentCount: task.commentCount,
  subtaskCount: task.sousTaskeCount,
  updatedAgo: task.updatedAgo,
  typeTache: task.typeTache,
  parentTaskId: task.parentTaskId,
  parentTaskTitre: task.parentTaskTitre,
  sousTaskes: [],
  sousTaskeCount: task.sousTaskeCount,
  sousTaskesDoneCount: task.sousTaskesDoneCount,
  githubIssueNumber: task.githubIssueNumber,
  githubIssueUrl: task.githubIssueUrl,
  githubPrNumber: task.githubPrNumber,
  githubPrUrl: task.githubPrUrl,
});

const detailLabelSx = { width: 130, color: '#6B778C', fontSize: 13, flexShrink: 0 };

const userFullName = (user: { prenom?: string; nom?: string; email?: string } | null | undefined) =>
  user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email || '-' : '-';

const KanbanCardDetail = ({ taskId, onClose }: Props) => {
  const { columns, loadBoard } = useKanbanStore();
  const getPresence = usePresenceStore((state) => state.getPresence);
  const task = useMemo(() => findTask(columns.flatMap((column) => column.tasks), taskId), [columns, taskId]);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [draftStatut, setDraftStatut] = useState<KanbanStatut>('TODO');
  const [draftPriorite, setDraftPriorite] = useState<KanbanPriorite>('MEDIUM');
  const [draftUrgent, setDraftUrgent] = useState(false);
  const [draftAssigneeId, setDraftAssigneeId] = useState<string>('');
  const [draftDateEcheance, setDraftDateEcheance] = useState('');
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [subtasks, setSubtasks] = useState<PlanningTask[]>([]);
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false);

  useEffect(() => {
    setTitre(task?.titre ?? '');
    setDescription(task?.description ?? '');
    setDraftStatut(task?.statut ?? 'TODO');
    setDraftPriorite(task?.priorite ?? 'MEDIUM');
    setDraftUrgent(Boolean(task?.isUrgent));
    setDraftAssigneeId(task?.assignee?.id ? String(task.assignee.id) : '');
    setDraftDateEcheance(task?.dateEcheance ? task.dateEcheance.slice(0, 10) : '');
  }, [task]);

  useEffect(() => {
    void kanbanApi.getComments(taskId).then((data: CommentItem[]) => setComments(data)).catch(() => setComments([]));
  }, [taskId]);

  useEffect(() => {
    if (!task?.project?.id) return;
    void fetchProjectMembers(task.project.id).then(setMembers).catch(() => setMembers([]));
  }, [task?.project?.id]);

  useEffect(() => {
    if (!task || task.typeTache === 'SUBTASK') {
      setSubtasks([]);
      return;
    }
    void planningApi.getSubtasks(task.id).then(setSubtasks).catch(() => setSubtasks([]));
  }, [task]);

  if (!task) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Tache introuvable</Typography>
      </Box>
    );
  }

  const sendComment = async () => {
    if (!comment.trim()) return;
    const created = await kanbanApi.addComment(task.id, comment.trim());
    setComments((current) => [...current, created]);
    setComment('');
    await loadBoard();
  };

  const selectedMember = members.find((member) => String(member.userId) === draftAssigneeId) ?? null;
  const subtaskPercent = task.sousTaskeCount > 0 ? (task.sousTaskesDoneCount / task.sousTaskeCount) * 100 : 0;
  const canCreateSubtask = (ALLOWED_CHILD_TYPES[task.typeTache as TypeTache] || []).length > 0;
  const reporterPresence = resolvePresenceDisplay(task.reporter ? getPresence(task.reporter.id) : undefined);
  const hasDraftChanges = (
    titre.trim() !== task.titre
    || description.trim() !== (task.description ?? '')
    || draftStatut !== task.statut
    || draftPriorite !== task.priorite
    || draftUrgent !== task.isUrgent
    || draftAssigneeId !== (task.assignee?.id ? String(task.assignee.id) : '')
    || draftDateEcheance !== (task.dateEcheance ? task.dateEcheance.slice(0, 10) : '')
  );

  const handleSave = async () => {
    if (!titre.trim()) return;
    setSaving(true);
    try {
      const updates: Array<[string, string]> = [];
      if (titre.trim() !== task.titre) updates.push(['titre', titre.trim()]);
      if (description.trim() !== (task.description ?? '')) updates.push(['description', description.trim()]);
      if (draftStatut !== task.statut) updates.push(['statut', draftStatut]);
      if (draftPriorite !== task.priorite) updates.push(['priorite', draftPriorite]);
      if (draftUrgent !== task.isUrgent) updates.push(['isUrgent', String(draftUrgent)]);
      if (draftAssigneeId !== (task.assignee?.id ? String(task.assignee.id) : '')) updates.push(['assigneeId', draftAssigneeId]);
      if (draftDateEcheance !== (task.dateEcheance ? task.dateEcheance.slice(0, 10) : '')) updates.push(['dateEcheance', draftDateEcheance]);

      for (const [field, value] of updates) {
        await kanbanApi.inlineEdit(task.id, field, value);
      }
      await loadBoard();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
      <Box sx={{ height: 52, display: 'flex', alignItems: 'center', px: 1.5, borderBottom: '1px solid #DFE1E6', gap: 1 }}>
        <IconButton onClick={onClose}><ArrowBack /></IconButton>
        <Typography sx={{ flex: 1, fontSize: 13, color: '#6B778C' }}>
          {task.sprint?.nom ?? 'Backlog'} / {formatIssueKey(task.project?.issuePrefix, task.id)}
        </Typography>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField select size="small" value={draftStatut} onChange={(event) => setDraftStatut(event.target.value as KanbanStatut)} sx={{ minWidth: 150 }}>
            {(Object.keys(COLUMN_CONFIG) as KanbanStatut[]).map((statut) => (
              <MenuItem key={statut} value={statut}>{COLUMN_CONFIG[statut].labelFR}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" value={draftPriorite} onChange={(event) => setDraftPriorite(event.target.value as KanbanPriorite)} sx={{ minWidth: 140 }}>
            {(Object.keys(PRIORITE_CONFIG) as KanbanPriorite[]).map((priorite) => (
              <MenuItem key={priorite} value={priorite}>{PRIORITE_CONFIG[priorite].label}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography sx={{ fontSize: 13 }}>Urgent</Typography>
            <Switch size="small" checked={draftUrgent} onChange={(event) => setDraftUrgent(event.target.checked)} />
          </Stack>
        </Stack>

        <TextField
          fullWidth
          multiline
          variant="standard"
          value={titre}
          onChange={(event) => setTitre(event.target.value)}
          InputProps={{ disableUnderline: true, sx: { fontSize: 22, fontWeight: 700, color: '#172B4D' } }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Description"
          placeholder="Ajouter une description..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          sx={{ mb: 2 }}
        />

        <GitHubTaskDetail
          taskId={task.id}
          githubIssueNumber={task.githubIssueNumber}
          githubIssueUrl={task.githubIssueUrl}
          githubPrNumber={task.githubPrNumber}
          githubPrUrl={task.githubPrUrl}
        />

        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase' }}>
            Details
          </Typography>
          <Autocomplete
            size="small"
            options={members}
            value={selectedMember}
            onChange={(_, value) => setDraftAssigneeId(value ? String(value.userId) : '')}
            getOptionLabel={(member) => `${member.firstName} ${member.lastName}`}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            renderOption={(props, member) => (
              <Box component="li" {...props} key={member.userId}>
                <Avatar src={member.avatarUrl ?? undefined} sx={{ width: 28, height: 28, mr: 1, fontSize: 12 }}>
                  {`${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()}
                </Avatar>
                {member.firstName} {member.lastName}
              </Box>
            )}
            renderInput={(params) => <TextField {...params} label="Assigne" placeholder="Non assigne" />}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={detailLabelSx}>Assignee par</Typography>
            {task.reporter ? (
              <>
                <Avatar src={task.reporter.avatarUrl ?? undefined} sx={{ width: 24, height: 24, bgcolor: task.reporter.avatarColor, fontSize: 11, border: reporterPresence === 'LIVE' ? '2px solid #44b700' : undefined }}>{task.reporter.initiales}</Avatar>
                <Typography sx={{ fontSize: 14 }}>{userFullName(task.reporter)}</Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: 14, color: '#6B778C' }}>-</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={detailLabelSx}>Type</Typography>
            <Chip icon={<TaskTypeIcon type={task.typeTache} showTooltip={false} />} label={TYPE_CONFIG[task.typeTache].label} size="small" />
          </Box>
          {task.epicTitre && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={detailLabelSx}>Epic</Typography>
              <Typography sx={{ fontSize: 14 }}>{task.epicTitre}</Typography>
            </Box>
          )}
          {task.parentTaskTitre && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={detailLabelSx}>Parent</Typography>
              <Typography sx={{ fontSize: 14 }}>{task.parentTaskTitre}</Typography>
            </Box>
          )}
          {task.userStory && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={detailLabelSx}>Story</Typography>
              <Typography sx={{ fontSize: 14 }}>{task.userStory.titre}</Typography>
            </Box>
          )}
          {task.sprint && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={detailLabelSx}>Sprint</Typography>
              <Typography sx={{ fontSize: 14 }}>{task.sprint.nom}</Typography>
            </Box>
          )}
          <TextField
            size="small"
            label="Echeance"
            type="date"
            value={draftDateEcheance}
            onChange={(event) => setDraftDateEcheance(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={detailLabelSx}>Date echeance</Typography>
            <Typography sx={{ fontSize: 14, color: isOverdue(task.dateEcheance) ? '#DE350B' : '#172B4D', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isOverdue(task.dateEcheance) && <WarningAmber sx={{ fontSize: 16 }} />}
              {formatDateFR(task.dateEcheance)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={detailLabelSx}>Creee le</Typography>
            <Typography sx={{ fontSize: 14 }}>{formatDateFR(task.dateCreation)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={detailLabelSx}>Mise a jour</Typography>
            <Typography sx={{ fontSize: 14 }}>{formatDateFR(task.dateMiseAJour)} ({task.updatedAgo})</Typography>
          </Box>
          {task.labels.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {task.labels.map((label) => <Chip key={label} label={label} size="small" />)}
            </Stack>
          )}
        </Stack>

        {task.typeTache !== 'SUBTASK' && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', flex: 1 }}>
                Sous-taches
              </Typography>
              {task.sousTaskeCount > 0 && <Chip label={`${task.sousTaskesDoneCount}/${task.sousTaskeCount}`} size="small" />}
            </Stack>
            {task.sousTaskeCount > 0 && (
              <LinearProgress
                variant="determinate"
                value={subtaskPercent}
                color={task.sousTaskesDoneCount === task.sousTaskeCount ? 'success' : 'primary'}
                sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
              />
            )}
            <List dense disablePadding>
              {subtasks.map((subtask) => (
                <ListItem
                  key={subtask.id}
                  disablePadding
                  sx={{ borderRadius: 1, mb: 0.5, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TaskTypeIcon type={subtask.typeTache} size={14} showTooltip={false} />
                  </ListItemIcon>
                  <ListItemText
                    primary={subtask.titre}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                  <Chip
                    label={COLUMN_CONFIG[subtask.statut].labelFR}
                    size="small"
                    sx={{ height: 18, fontSize: 9, ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>
            {canCreateSubtask && (
              <Button startIcon={<AddIcon />} size="small" onClick={() => setCreateSubtaskOpen(true)} sx={{ mt: 1 }}>
                Ajouter une sous-tache
              </Button>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography fontWeight={700} sx={{ mb: 1 }}>Commentaires</Typography>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {comments.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', gap: 1 }}>
              <Avatar src={item.auteur.avatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                {`${item.auteur.firstName?.[0] ?? ''}${item.auteur.lastName?.[0] ?? ''}`.toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.auteur.firstName} {item.auteur.lastName}</Typography>
                <Typography sx={{ fontSize: 14 }}>{item.contenu}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Ajouter un commentaire..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') void sendComment();
          }}
          InputProps={{ endAdornment: <IconButton onClick={() => void sendComment()}><Send /></IconButton> }}
        />
      </Box>

      {createSubtaskOpen && (
        <CreateSubtaskModal
          open={createSubtaskOpen}
          onClose={() => setCreateSubtaskOpen(false)}
          parentTask={toPlanningTask(task)}
          onCreated={(newTask) => {
            setSubtasks((current) => [...current, newTask]);
            void loadBoard();
          }}
        />
      )}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, bgcolor: 'background.paper' }}>
        <Button onClick={onClose} disabled={saving}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || !titre.trim() || !hasDraftChanges}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
};

export default KanbanCardDetail;
